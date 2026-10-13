import { describe, expect, it } from 'vitest'
import { isValidTimezone, profileSchema, signInSchema, signUpSchema } from '@/lib/schemas'

describe('signInSchema', () => {
  it('trims the email and accepts valid input', () => {
    expect(signInSchema.parse({ email: '  me@uni.edu ', password: 'x' })).toEqual({
      email: 'me@uni.edu',
      password: 'x',
    })
  })

  it('rejects malformed emails and empty passwords', () => {
    expect(signInSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false)
    expect(signInSchema.safeParse({ email: 'me@uni.edu', password: '' }).success).toBe(false)
  })
})

describe('signUpSchema', () => {
  const valid = {
    displayName: 'Alex',
    email: 'alex@uni.edu',
    password: 'correct-horse',
    confirmPassword: 'correct-horse',
  }

  it('accepts valid input', () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true)
  })

  it('requires matching passwords and reports it on confirmPassword', () => {
    const res = signUpSchema.safeParse({ ...valid, confirmPassword: 'different' })
    expect(res.success).toBe(false)
    expect(res.error?.issues[0].path).toEqual(['confirmPassword'])
  })

  it('requires a minimum password length', () => {
    expect(signUpSchema.safeParse({ ...valid, password: 'short', confirmPassword: 'short' }).success).toBe(false)
  })

  it('rejects a whitespace-only name', () => {
    expect(signUpSchema.safeParse({ ...valid, displayName: '   ' }).success).toBe(false)
  })
})

describe('profileSchema', () => {
  it('saves an empty university as null', () => {
    const res = profileSchema.parse({ display_name: 'Alex', university_name: '  ', timezone: 'UTC' })
    expect(res.university_name).toBeNull()
  })

  it('rejects unknown timezones', () => {
    expect(profileSchema.safeParse({ display_name: 'A', university_name: '', timezone: 'Mars/Base' }).success).toBe(false)
  })

  it('enforces the same length limit as the database', () => {
    expect(
      profileSchema.safeParse({ display_name: 'x'.repeat(101), university_name: '', timezone: 'UTC' }).success,
    ).toBe(false)
  })
})

describe('isValidTimezone', () => {
  it('recognizes IANA names', () => {
    expect(isValidTimezone('Asia/Kuala_Lumpur')).toBe(true)
    expect(isValidTimezone('Nowhere/Special')).toBe(false)
  })
})
