/**
 * Database tests: run the real migration in an in-memory PostgreSQL (PGlite)
 * and check that Row Level Security, ownership rules and constraints work.
 *
 * These prove the SQL behaves correctly in PostgreSQL. They don't replace a
 * quick manual check in your real Supabase project (see docs/supabase-setup.md).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite, type Transaction } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '..')
const ALICE = '11111111-1111-1111-1111-111111111111'
const BOB = '22222222-2222-2222-2222-222222222222'

let db: PGlite

/** Runs `fn` as a signed-in user (role `authenticated`, auth.uid() = userId). */
async function asUser<T>(userId: string | null, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${userId ? 'authenticated' : 'anon'}`)
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ''])
    return fn(tx)
  })
}

async function rows<T = Record<string, unknown>>(tx: Transaction, sql: string, params: unknown[] = []) {
  return (await tx.query<T>(sql, params)).rows
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(readFileSync(join(ROOT, 'tests', 'supabase-stub.sql'), 'utf8'))

  const migrationsDir = join(ROOT, 'migrations')
  for (const file of readdirSync(migrationsDir).sort()) {
    await db.exec(readFileSync(join(migrationsDir, file), 'utf8'))
  }

  // Sign up two users. The trigger should create their profiles.
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1, 'alice@example.com', '{"display_name": "Alice Tan", "timezone": "Asia/Kuala_Lumpur"}'),
       ($2, 'bob@example.com', '{}')`,
    [ALICE, BOB],
  )

  // Give Alice some data, created through RLS like the real app would.
  await asUser(ALICE, async (tx) => {
    await tx.exec(`
      insert into semesters (id, name, start_date, end_date, is_current)
        values ('aaaaaaaa-0000-0000-0000-000000000001', 'Fall 2026', '2026-09-01', '2026-12-20', true);
      insert into courses (id, semester_id, course_code, course_name, credits)
        values ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'CS201', 'Data Structures', 3);
      insert into assignments (id, course_id, title)
        values ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'Problem set 1');
    `)
  })
}, 60_000)

const ALICE_SEMESTER = 'aaaaaaaa-0000-0000-0000-000000000001'
const ALICE_COURSE = 'aaaaaaaa-0000-0000-0000-000000000002'
const ALICE_ASSIGNMENT = 'aaaaaaaa-0000-0000-0000-000000000003'

describe('sign-up trigger', () => {
  it('creates a profile using the provided display name and timezone', async () => {
    const [p] = await asUser(ALICE, (tx) => rows(tx, 'select display_name, timezone from profiles'))
    expect(p).toEqual({ display_name: 'Alice Tan', timezone: 'Asia/Kuala_Lumpur' })
  })

  it('falls back to the email name and UTC', async () => {
    const [p] = await asUser(BOB, (tx) => rows(tx, 'select display_name, timezone from profiles'))
    expect(p).toEqual({ display_name: 'bob', timezone: 'UTC' })
  })
})

describe('row level security', () => {
  it('fills user_id automatically from the signed-in user', async () => {
    const [row] = await asUser(ALICE, (tx) => rows(tx, 'select user_id from assignments'))
    expect(row.user_id).toBe(ALICE)
  })

  it("hides other users' rows", async () => {
    await asUser(BOB, async (tx) => {
      for (const table of ['profiles', 'semesters', 'courses', 'assignments']) {
        const own = table === 'profiles' ? 1 : 0 // Bob sees only his own profile
        expect(await rows(tx, `select * from ${table}`), table).toHaveLength(own)
      }
    })
  })

  it("can't update or delete another user's rows", async () => {
    await asUser(BOB, async (tx) => {
      const updated = await tx.query(`update assignments set title = 'hacked' where id = $1`, [ALICE_ASSIGNMENT])
      const deleted = await tx.query(`delete from courses where id = $1`, [ALICE_COURSE])
      const profile = await tx.query(`update profiles set display_name = 'hacked' where id = $1`, [ALICE])
      expect([updated.affectedRows, deleted.affectedRows, profile.affectedRows]).toEqual([0, 0, 0])
    })
    const [a] = await asUser(ALICE, (tx) => rows(tx, 'select title from assignments'))
    expect(a.title).toBe('Problem set 1')
  })

  it("rejects an assignment that references another user's course", async () => {
    // As himself: the composite foreign key finds no (course, Bob) pair.
    await expect(
      asUser(BOB, (tx) => tx.query(`insert into assignments (course_id, title) values ($1, 'x')`, [ALICE_COURSE])),
    ).rejects.toThrow(/foreign key/)
    // Pretending to be Alice: RLS rejects the user_id.
    await expect(
      asUser(BOB, (tx) =>
        tx.query(`insert into assignments (user_id, course_id, title) values ($1, $2, 'x')`, [ALICE, ALICE_COURSE]),
      ),
    ).rejects.toThrow(/row-level security/)
  })

  it("rejects a course placed in another user's semester", async () => {
    await expect(
      asUser(BOB, (tx) =>
        tx.query(`insert into courses (semester_id, course_code, course_name) values ($1, 'X1', 'X')`, [ALICE_SEMESTER]),
      ),
    ).rejects.toThrow(/foreign key/)
  })

  it("can't move a row to another user", async () => {
    await expect(
      asUser(ALICE, (tx) => tx.query(`update assignments set user_id = $1 where id = $2`, [BOB, ALICE_ASSIGNMENT])),
    ).rejects.toThrow()
  })

  it('blocks signed-out (anonymous) access entirely', async () => {
    await expect(asUser(null, (tx) => tx.query('select * from courses'))).rejects.toThrow(/permission denied/)
  })

  it('only lets users edit the allowed profile columns', async () => {
    await expect(
      asUser(ALICE, (tx) => tx.query(`update profiles set created_at = now() where id = $1`, [ALICE])),
    ).rejects.toThrow(/permission denied/)
    const res = await asUser(ALICE, (tx) =>
      tx.query(`update profiles set university_name = 'Example University' where id = $1`, [ALICE]),
    )
    expect(res.affectedRows).toBe(1)
  })
})

describe('constraints', () => {
  const rejects = (sql: string, params: unknown[] = []) =>
    expect(asUser(ALICE, (tx) => tx.query(sql, params))).rejects.toThrow()

  it('rejects negative credits and invalid colors', async () => {
    await rejects(`insert into courses (semester_id, course_code, course_name, credits) values ($1, 'N1', 'N', -1)`, [ALICE_SEMESTER])
    await rejects(`insert into courses (semester_id, course_code, course_name, color) values ($1, 'N2', 'N', 'red')`, [ALICE_SEMESTER])
  })

  it('rejects unknown priority / status values and blank titles', async () => {
    await rejects(`insert into assignments (course_id, title, priority) values ($1, 'x', 'urgent')`, [ALICE_COURSE])
    await rejects(`insert into assignments (course_id, title, status) values ($1, 'x', 'done')`, [ALICE_COURSE])
    await rejects(`insert into assignments (course_id, title) values ($1, '   ')`, [ALICE_COURSE])
  })

  it('rejects invalid grade data', async () => {
    await rejects(`insert into grade_entries (course_id, assessment_name, score) values ($1, 'Quiz', -5)`, [ALICE_COURSE])
    await rejects(`insert into grade_entries (course_id, assessment_name, max_score) values ($1, 'Quiz', 0)`, [ALICE_COURSE])
    await rejects(`insert into grade_entries (course_id, assessment_name, weight_percent) values ($1, 'Quiz', 120)`, [ALICE_COURSE])
  })

  it('rejects duplicate grade letters for the same user', async () => {
    await asUser(ALICE, (tx) => tx.query(`insert into grade_scale_entries (grade_letter, grade_points) values ('A', 4)`))
    await rejects(`insert into grade_scale_entries (grade_letter, grade_points) values ('A', 3.7)`)
    // ...but another user may use the same letter.
    await asUser(BOB, (tx) => tx.query(`insert into grade_scale_entries (grade_letter, grade_points) values ('A', 4)`))
  })

  it('rejects class sessions that end before they start, or on day 8', async () => {
    await rejects(
      `insert into class_sessions (course_id, day_of_week, start_time, end_time) values ($1, 1, '10:00', '09:00')`,
      [ALICE_COURSE],
    )
    await rejects(
      `insert into class_sessions (course_id, day_of_week, start_time, end_time) values ($1, 8, '09:00', '10:00')`,
      [ALICE_COURSE],
    )
  })

  it('allows overlapping class sessions (the app flags them instead)', async () => {
    await asUser(ALICE, (tx) =>
      tx.exec(`
        insert into class_sessions (course_id, day_of_week, start_time, end_time)
        values ('${ALICE_COURSE}', 2, '09:00', '11:00'), ('${ALICE_COURSE}', 2, '10:00', '12:00')`),
    )
  })

  it('allows only one current semester per user', async () => {
    await rejects(`insert into semesters (name, start_date, end_date, is_current) values ('S2', '2027-01-01', '2027-05-01', true)`)
  })

  it('rejects a semester that ends before it starts', async () => {
    await rejects(`insert into semesters (name, start_date, end_date) values ('Bad', '2027-05-01', '2027-01-01')`)
  })

  it('keeps updated_at current on update', async () => {
    const [before] = await asUser(ALICE, (tx) => rows<{ updated_at: Date }>(tx, 'select updated_at from courses'))
    await new Promise((r) => setTimeout(r, 5))
    await asUser(ALICE, (tx) => tx.query(`update courses set instructor = 'Dr. Lee' where id = $1`, [ALICE_COURSE]))
    const [after] = await asUser(ALICE, (tx) => rows<{ updated_at: Date }>(tx, 'select updated_at from courses'))
    expect(after.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime())
  })
})

describe('delete behavior', () => {
  it('blocks deleting a semester that still has courses', async () => {
    await expect(
      asUser(ALICE, (tx) => tx.query('delete from semesters where id = $1', [ALICE_SEMESTER])),
    ).rejects.toThrow(/foreign key/)
  })

  it('deleting a course removes its assignments but only unlinks study sessions', async () => {
    await asUser(ALICE, async (tx) => {
      await tx.query(
        `insert into study_sessions (course_id, started_at, duration_seconds) values ($1, now(), 600)`,
        [ALICE_COURSE],
      )
      await tx.query('delete from courses where id = $1', [ALICE_COURSE])
      expect(await rows(tx, 'select * from assignments')).toHaveLength(0)
      const sessions = await rows(tx, 'select course_id, user_id from study_sessions')
      expect(sessions).toEqual([{ course_id: null, user_id: ALICE }])
    })
  })

  it("deleting a user removes all of that user's data", async () => {
    await db.query('delete from auth.users where id = $1', [BOB])
    const { rows: left } = await db.query(
      `select (select count(*) from profiles where id = $1)::int as profiles,
              (select count(*) from grade_scale_entries where user_id = $1)::int as scale`,
      [BOB],
    )
    expect(left[0]).toEqual({ profiles: 0, scale: 0 })
  })
})
