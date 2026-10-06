'use server';
import { createSupabaseServerClient, getCurrentUser } from '@/lib/supabase/server';
import { getCatalogExercise } from '@/features/routine/exercise-catalog';
import type { WorkoutSnapshot } from './workout-snapshot';

/** The browser chooses only a date. Names/counts are always reconstructed from owned records. */
export async function getShareableWorkout(date: string): Promise<WorkoutSnapshot | null> {
  const user = await getCurrentUser();
  if (!user || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const db = await createSupabaseServerClient();
  const [completions, session] = await Promise.all([
    db.from('exercise_completions').select('exercise_id,equipment,sets,created_at').eq('user_id', user.id).eq('for_date', date).eq('status', 'done').order('created_at'),
    db.from('workout_sessions').select('duration_sec').eq('user_id', user.id).eq('for_date', date).maybeSingle(),
  ]);
  if (completions.error || session.error) throw new Error('운동 기록을 불러오지 못했어요.');
  if (!completions.data?.length) return null;
  return { date, durationSec: session.data && session.data.duration_sec > 0 ? session.data.duration_sec : null,
    // 운동 id·기구도 남긴다 — 보는 사람이 '오늘 이 운동 해보기'로 같은 운동을 담는다(커뮤니티 4-1).
    // 🐞 이름은 확장 목록까지 찾는다 — 예전엔 기본 목록만 봐서 확장 운동이 '운동' 으로 공유됐다.
    exercises: completions.data.map(r => ({
      name: getCatalogExercise(r.exercise_id)?.name ?? '운동',
      sets: r.sets > 0 ? r.sets : null,
      exerciseId: r.exercise_id,
      ...(typeof r.equipment === 'string' && r.equipment ? { equipment: r.equipment } : {}),
    })) };
}

export async function listShareableWorkoutDates(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from('exercise_completions').select('for_date').eq('user_id', user.id).eq('status', 'done').order('for_date', { ascending: false }).limit(500);
  if (error) throw new Error('운동 기록을 불러오지 못했어요.');
  return [...new Set((data ?? []).map(r => r.for_date as string))].slice(0, 30);
}
