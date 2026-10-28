/**
 * '같은 루틴' 지난 기록(2026-10-28 사용자: "지금 가슴 팔 루틴이잖아 저번에도 가슴 팔 루틴이 있을거잖아…
 * 그때 뛰었던 런닝 기록… 나머지 운동들도 마찬가지야").
 *
 * 그날 한 운동들의 부위 묶음(예: 가슴+팔)이 오늘과 같은 날 = 같은 루틴이 돌아온 날. 그날 값으로
 * 운동모드를 미리 채운다(본운동 무게·횟수·세트, 워밍업·마무리 런닝 시간·속도·경사). 같은 루틴 기록이
 * 없으면 예전처럼 그 운동의 마지막 기록. 순수 모듈.
 */
import type { LastExerciseValues } from "@/features/routine/exercise-completions";
import type { ProgressRecord } from "@/features/routine/progress";

/** 부위 묶음 키 — 순서·중복 무시("chest,arm" = "arm,chest"). */
export function routineKey(focuses: readonly (string | null | undefined)[]): string {
  return [...new Set(focuses.filter((f): f is string => !!f))].sort().join(",");
}

/** 기록(날짜·부위)에서 오늘과 부위 묶음이 같은 지난 날짜들. 오늘은 뺀다. */
export function sameRoutineDates(
  records: readonly { forDate: string; focus?: string | null }[],
  todayFocuses: readonly string[],
  todayYmd: string,
): Set<string> {
  const target = routineKey(todayFocuses);
  if (!target) return new Set();
  const byDate = new Map<string, Set<string>>();
  for (const r of records) {
    if (r.forDate >= todayYmd || !r.focus) continue;
    const set = byDate.get(r.forDate) ?? new Set<string>();
    set.add(r.focus);
    byDate.set(r.forDate, set);
  }
  const out = new Set<string>();
  for (const [date, focuses] of byDate) if (routineKey([...focuses]) === target) out.add(date);
  return out;
}

/** 운동별 마지막 실제값(최근 순 기록) — dates 를 주면 그 날짜들의 기록만. */
export function lastValuesByExercise(
  records: readonly ProgressRecord[],
  dates?: ReadonlySet<string>,
): Map<string, LastExerciseValues> {
  const sorted = [...records].sort((a, b) => (a.forDate < b.forDate ? 1 : a.forDate > b.forDate ? -1 : 0));
  const out = new Map<string, LastExerciseValues>();
  for (const r of sorted) {
    if (r.status !== "done" || !r.exerciseId || out.has(r.exerciseId)) continue;
    if (dates && !dates.has(r.forDate)) continue;
    out.set(r.exerciseId, { weightKg: r.weightKg, reps: r.reps, sets: r.sets, setDetails: r.setDetails ?? null });
  }
  return out;
}
