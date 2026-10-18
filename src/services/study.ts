import { elapsedSeconds, MAX_SESSION_SECONDS } from '@/lib/study'
import type { StudyLogFormValues, StudyTimerFormValues } from '@/lib/schemas'
import { fetchAllRows } from '@/lib/fetch-all'
import { requireSupabase } from '@/lib/supabase'
import type { StudySession } from '@/types/database'

/**
 * Most recent first. Paged, because this is the table most likely to pass
 * Supabase's 1,000-rows-per-request limit (daily sessions over a few years).
 */
export async function listStudySessions(): Promise<StudySession[]> {
  return fetchAllRows((from, to) =>
    requireSupabase()
      .from('study_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .order('id')
      .range(from, to),
  )
}

/**
 * Starts the timer by saving a session with a start time and no end time.
 * Because it's saved right away, the timer survives a page refresh or a
 * closed tab: the app finds the unfinished session again on load.
 */
export async function startStudySession(values: StudyTimerFormValues): Promise<StudySession> {
  const { data, error } = await requireSupabase()
    .from('study_sessions')
    .insert({ ...values, started_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Stops a running timer, recording the end time and actual duration. */
export async function stopStudySession(session: StudySession, now = new Date()): Promise<StudySession> {
  const duration = elapsedSeconds(session.started_at, now)
  if (duration > MAX_SESSION_SECONDS) {
    // The database rejects sessions over 24 hours; the UI asks for the real duration instead.
    throw new Error('This timer ran for more than 24 hours. Please enter the actual duration.')
  }
  const { data, error } = await requireSupabase()
    .from('study_sessions')
    .update({ ended_at: now.toISOString(), duration_seconds: duration })
    .eq('id', session.id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Saves a finished session entered by hand. */
export async function createStudySession(values: StudyLogFormValues): Promise<StudySession> {
  const { data, error } = await requireSupabase().from('study_sessions').insert(values).select().single()
  if (error) throw error
  return data
}

/** Edits a session (also used to finish a timer that ran too long). */
export async function updateStudySession(id: string, values: StudyLogFormValues): Promise<StudySession> {
  const { data, error } = await requireSupabase().from('study_sessions').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteStudySession(id: string): Promise<void> {
  const { error } = await requireSupabase().from('study_sessions').delete().eq('id', id)
  if (error) throw error
}
