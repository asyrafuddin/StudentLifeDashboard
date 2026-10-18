/**
 * "Anything a form accepts, the database accepts."
 *
 * Each form validates input before saving (src/lib/schemas.ts) and the
 * database has its own rules (supabase/migrations). If they disagree, a user
 * could fill in a form "correctly" and still get a confusing database error.
 *
 * Text limits are DISCOVERED from each form schema (the longest text it
 * accepts), not typed in here, so raising a form limit without changing the
 * database makes these tests fail. Number limits are pinned from both sides:
 * the form accepts the maximum and rejects anything just above it.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite, type Transaction } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import type { z } from 'zod'
import {
  assignmentSchema,
  classSessionSchema,
  courseResultSchema,
  courseSchema,
  examSchema,
  gradeEntrySchema,
  gradeScaleEntrySchema,
  profileSchema,
  semesterSchema,
  studyLogSchema,
} from '@/lib/schemas'

const ROOT = join(import.meta.dirname, '..')
const USER = '33333333-3333-3333-3333-333333333333'
const SEMESTER = '44444444-0000-0000-0000-000000000001'
const COURSE = '44444444-0000-0000-0000-000000000002'
let db: PGlite
let codeCounter = 0

async function asUser<T>(fn: (tx: Transaction) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.exec('set local role authenticated')
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [USER])
    return fn(tx)
  })
}

/** Inserts a row into `table` as the signed-in user (throws if the database rejects it). */
function insert(table: string, values: Record<string, unknown>) {
  const columns = Object.keys(values)
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
  return asUser((tx) => tx.query(`insert into ${table} (${columns.join(', ')}) values (${placeholders})`, Object.values(values)))
}

/**
 * The longest text the schema accepts for `field` (binary search). Starts from
 * a valid input so only that field's limit is tested.
 */
function longestAccepted(schema: z.ZodType, valid: Record<string, unknown>, field: string): number {
  const accepts = (n: number) => schema.safeParse({ ...valid, [field]: 'x'.repeat(n) }).success
  let low = 0 // known accepted (assumes the field is optional or 1 char is fine)
  let high = 20_000 // assumed rejected
  if (accepts(high)) throw new Error(`${field} has no length limit in the form`)
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2)
    if (accepts(mid)) low = mid
    else high = mid
  }
  return low
}

/** A valid input with every listed text field set to its longest accepted value. */
function withLongestText(schema: z.ZodType, valid: Record<string, unknown>, fields: string[]) {
  const input = { ...valid }
  for (const field of fields) input[field] = 'x'.repeat(longestAccepted(schema, valid, field))
  return input
}

/** Asserts the form accepts `max` and rejects `aboveMax` for a numeric text field. */
function expectNumberLimit(schema: z.ZodType, valid: Record<string, unknown>, field: string, max: string, aboveMax: string) {
  expect(schema.safeParse({ ...valid, [field]: max }).success, `${field}=${max} should be accepted`).toBe(true)
  expect(schema.safeParse({ ...valid, [field]: aboveMax }).success, `${field}=${aboveMax} should be rejected`).toBe(false)
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(readFileSync(join(ROOT, 'tests', 'supabase-stub.sql'), 'utf8'))
  for (const file of readdirSync(join(ROOT, 'migrations')).sort()) {
    await db.exec(readFileSync(join(ROOT, 'migrations', file), 'utf8'))
  }
  await db.query(`insert into auth.users (id, email) values ($1, 'parity@example.com')`, [USER])
  await insert('semesters', { id: SEMESTER, name: 'S', start_date: '2026-01-01', end_date: '2026-06-01' })
  await insert('courses', { id: COURSE, semester_id: SEMESTER, course_code: 'BASE', course_name: 'Base' })
}, 60_000)

describe('form limits fit the database', () => {
  it('semesters', async () => {
    const valid = { name: 'S', start_date: '2026-01-01', end_date: '2026-01-01', is_current: false }
    await insert('semesters', semesterSchema.parse(withLongestText(semesterSchema, valid, ['name'])))
  })

  it('courses', async () => {
    const valid = { semester_id: SEMESTER, course_code: 'C', course_name: 'N', instructor: '', credits: '3', color: '#ABCDEF' }
    // Course codes must be unique per semester, so each insert uses a fresh code of max length.
    const longest = withLongestText(courseSchema, valid, ['course_code', 'course_name', 'instructor'])
    const freshCode = () => `${++codeCounter}`.padEnd((longest.course_code as string).length, 'x')
    expectNumberLimit(courseSchema, valid, 'credits', '99', '100')
    for (const credits of ['99', '0.5', '0']) {
      await insert('courses', courseSchema.parse({ ...longest, course_code: freshCode(), credits }))
    }
  })

  it('assignments', async () => {
    const valid = {
      course_id: COURSE,
      title: 'T',
      description: '',
      due_date: '2026-12-31',
      due_time: '23:59',
      priority: 'high',
      status: 'in_progress',
      estimated_minutes: '1',
    }
    expectNumberLimit(assignmentSchema, valid, 'estimated_minutes', '100000', '100001')
    const input = withLongestText(assignmentSchema, valid, ['title', 'description'])
    await insert('assignments', assignmentSchema.parse({ ...input, estimated_minutes: '100000' }))
  })

  it('exams', async () => {
    const valid = { course_id: COURSE, title: 'T', exam_type: '', date: '2026-12-31', time: '00:00', location: '', notes: '' }
    await insert('exams', examSchema.parse(withLongestText(examSchema, valid, ['title', 'exam_type', 'location', 'notes'])))
  })

  it('class sessions (latest possible times)', async () => {
    const valid = { course_id: COURSE, day_of_week: '7', start_time: '23:58', end_time: '23:59', location: '', instructor: '' }
    await insert('class_sessions', classSessionSchema.parse(withLongestText(classSessionSchema, valid, ['location', 'instructor'])))
  })

  it('grade entries (largest numbers, smallest decimals)', async () => {
    const valid = { assessment_name: 'A', score: '1', max_score: '1', weight_percent: '1' }
    expectNumberLimit(gradeEntrySchema, valid, 'weight_percent', '100', '100.01')
    expectNumberLimit(gradeEntrySchema, { ...valid, max_score: '999999' }, 'score', '999999', '1000000')
    expectNumberLimit(gradeEntrySchema, valid, 'score', '0.01', '0.001') // 2 decimals max, like the column
    const input = withLongestText(gradeEntrySchema, valid, ['assessment_name'])
    for (const [score, max_score, weight_percent] of [['999999', '999999', '100'], ['0.01', '0.01', '0.01'], ['0', '1', '0']]) {
      await insert('grade_entries', { ...gradeEntrySchema.parse({ ...input, score, max_score, weight_percent }), course_id: COURSE })
    }
  })

  it('course results', async () => {
    const valid = { final_grade_letter: 'A', final_grade_points: '4', is_finalized: true }
    expectNumberLimit(courseResultSchema, valid, 'final_grade_points', '20', '20.01')
    const input = withLongestText(courseResultSchema, valid, ['final_grade_letter'])
    await insert('course_results', { ...courseResultSchema.parse({ ...input, final_grade_points: '20' }), course_id: COURSE })
  })

  it('grading scale', async () => {
    const valid = { grade_letter: 'A', grade_points: '4' }
    expectNumberLimit(gradeScaleEntrySchema, valid, 'grade_points', '20', '20.01')
    const input = withLongestText(gradeScaleEntrySchema, valid, ['grade_letter'])
    await insert('grade_scale_entries', gradeScaleEntrySchema.parse({ ...input, grade_points: '20' }))
  })

  it('study sessions (the full 24 hours the form allows)', async () => {
    const valid = { course_id: COURSE, date: '2026-10-14', start_time: '00:00', duration_minutes: '1', notes: '' }
    expectNumberLimit(studyLogSchema, valid, 'duration_minutes', '1440', '1441')
    const input = withLongestText(studyLogSchema, valid, ['notes'])
    await insert('study_sessions', studyLogSchema.parse({ ...input, duration_minutes: '1440' }))
  })

  it('profiles', async () => {
    const valid = { display_name: 'A', university_name: '', timezone: 'Pacific/Chatham' }
    const values = profileSchema.parse(withLongestText(profileSchema, valid, ['display_name', 'university_name']))
    const res = await asUser((tx) =>
      tx.query('update profiles set display_name = $1, university_name = $2, timezone = $3 where id = $4', [
        values.display_name,
        values.university_name,
        values.timezone,
        USER,
      ]),
    )
    expect(res.affectedRows).toBe(1)
  })
})
