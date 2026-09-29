'use server';
import { createSupabaseServerClient, getCurrentUser } from '@/lib/supabase/server';
import { EXERCISES } from '@/features/routine/exercise-catalog';
import type { WorkoutSnapshot } from './workout-snapshot';

/** The browser chooses only a date. Names/counts are always reconstructed from owned records. */
export async function getShareableWorkout(date: string): Promise<WorkoutSnapshot | null> {
  const user = await getCurrentUser();
  if (!user || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const db = await createSupabaseServerClient();
  const [completions, session] = await Promise.all([
    db.from('exercise_completions').select('exercise_id,sets,created_at').eq('user_id', user.id).eq('for_date', date).eq('status', 'done').order('created_at'),
    db.from('workout_sessions').select('duration_sec').eq('user_id', user.id).eq('for_date', date).maybeSingle(),
  ]);
  if (completions.error || session.error) throw new Error('운동 기록을 불러오지 못했어요.');
  if (!completions.data?.length) return null;
  return { date, durationSec: session.data && session.data.duration_sec > 0 ? session.data.duration_sec : null,
    exercises: completions.data.map(r => ({ name: EXERCISES[r.exercise_id]?.name ?? '운동', sets: r.sets > 0 ? r.sets : null })) };
}

export async function listShareableWorkoutDates(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from('exercise_completions').select('for_date').eq('user_id', user.id).eq('status', 'done').order('for_date', { ascending: false }).limit(500);
  if (error) throw new Error('운동 기록을 불러오지 못했어요.');
  return [...new Set((data ?? []).map(r => r.for_date as string))].slice(0, 30);
}
