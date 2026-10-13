import { describe, expect, it, vi } from 'vitest'
import { getErrorMessage } from '@/lib/errors'

describe('getErrorMessage', () => {
  it('translates known Supabase/PostgreSQL errors into friendly text', () => {
    expect(getErrorMessage({ message: 'Invalid login credentials' })).toBe('Incorrect email or password.')
    expect(
      getErrorMessage({
        message: 'duplicate key value violates unique constraint "courses_code_unique_per_semester"',
      }),
    ).toBe('You already have a course with this code in that semester.')
    expect(
      getErrorMessage({
        message:
          'update or delete on table "semesters" violates foreign key constraint "courses_semester_fk" on table "courses"',
      }),
    ).toBe('This semester still has courses. Move or delete them first.')
  })

  it('falls back to the original message for unknown errors', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(getErrorMessage(new Error('Something odd'))).toBe('Something odd')
    spy.mockRestore()
  })
})
