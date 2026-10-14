/**
 * 세트 완료마다 기록(2026-10-14) · 순수 로직.
 *
 * 끝낸 세트의 **실제 값**(그때 칸에 있던 무게·횟수)을 모아 완료 기록의 모양으로 만든다.
 * 예전엔 마지막에 칸의 값 하나를 모든 세트에 적어서, 세트 사이에 무게를 바꾸면 앞 세트가 틀리게 남았다.
 */
import type { SetDetail } from "@/features/routine/set-details";
import type { SetValue } from "@/features/workout-timer/set-target";

export type ProgressSnapshot = { sets: number; reps: number; weightKg: number | null; setDetails: SetDetail[] | null };

/**
 * 끝낸 세트 `count` 개의 기록.
 * - 저장해 둔 값이 모자라면(이 기능 전에 끝낸 세트 등) `fallback` 으로 채운다.
 * - 모든 세트가 같은 값이면 균일 세트(`setDetails: null`), 하나라도 다르면 세트별로 남긴다.
 * - 0개면 null — 남길 기록이 없다.
 */
export function progressSnapshot(done: readonly SetValue[] | null | undefined, count: number, fallback: SetValue): ProgressSnapshot | null {
  const n = Math.min(20, Math.max(0, Math.floor(count)));
  if (n === 0) return null;
  const sets = Array.from({ length: n }, (_, i) => {
    const v = done?.[i] ?? fallback;
    return { weightKg: v.w, reps: Math.min(100, Math.max(1, Math.round(v.reps))) };
  });
  const uniform = sets.every((s) => s.weightKg === sets[0].weightKg && s.reps === sets[0].reps);
  return { sets: n, reps: sets[0].reps, weightKg: sets[0].weightKg, setDetails: uniform ? null : sets };
}

/** 세트 하나를 끝냈을 때 — 그 자리(index)에 값을 넣고 뒤는 버린다(취소했다 다시 한 세트가 옛 값을 물고 있지 않게). */
export function withSetDone(done: readonly SetValue[] | null | undefined, index: number, value: SetValue): SetValue[] {
  const out = (done ?? []).slice(0, Math.max(0, index));
  while (out.length < index) out.push(value);
  out.push(value);
  return out;
}
