export type WorkoutSnapshot = {
  date: string;
  durationSec: number | null;
  /** exerciseId·equipment 는 커뮤니티 4-1(2026-09-30)부터 — '오늘 이 운동 해보기' 로 담을 운동. 예전 글엔 없다. */
  exercises: { name: string; sets: number | null; exerciseId?: string; equipment?: string }[];
};

export function readWorkoutSnapshot(value: unknown): WorkoutSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.date) || !Array.isArray(v.exercises)) return null;
  const exercises = v.exercises.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const e = item as Record<string, unknown>;
    if (typeof e.name !== 'string' || !e.name.trim()) return [];
    return [{
      name: e.name.slice(0, 100),
      sets: typeof e.sets === 'number' && Number.isInteger(e.sets) && e.sets > 0 ? e.sets : null,
      ...(typeof e.exerciseId === 'string' && /^[a-z0-9-]{1,80}$/.test(e.exerciseId) ? { exerciseId: e.exerciseId } : {}),
      ...(typeof e.equipment === 'string' && /^[a-z_-]{1,30}$/.test(e.equipment) ? { equipment: e.equipment } : {}),
    }];
  });
  if (!exercises.length) return null;
  return { date: v.date, exercises, durationSec: typeof v.durationSec === 'number' && Number.isFinite(v.durationSec) && v.durationSec > 0 ? v.durationSec : null };
}
