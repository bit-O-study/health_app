/**
 * 가이드 큐(아직 안 끝난 운동 항목)를 '휴식(skip) 처리' 액션 입력으로 바꾸는 순수 매퍼.
 * 서버 액션(restRemainingTodayAction)과 분리해 클라이언트에서 import·테스트 가능.
 */
import type { GuidedItem } from "@/features/workout-timer/guided-workout";
import type { CondMarkInput, PlanMarkInput } from "@/features/routine/mark-all-actions";

export type RestRemainingInput = {
  planRows: PlanMarkInput[];
  warmup: CondMarkInput[];
  cooldown: CondMarkInput[];
};

/** 남은 큐 항목들을 본운동/워밍업/마무리 휴식처리 입력으로 분류·매핑. */
export function queueToRestInputs(items: GuidedItem[]): RestRemainingInput {
  const planRows: PlanMarkInput[] = [];
  const warmup: CondMarkInput[] = [];
  const cooldown: CondMarkInput[] = [];

  for (const it of items) {
    if (it.kind === "main") {
      planRows.push({
        rowId: it.rowId,
        snapshot: {
          exerciseId: it.exerciseId,
          equipment: it.equipment,
          sets: it.sets,
          reps: it.reps,
          weightKg: it.weightKg,
          focus: it.focus,
          setDetails: null,
        },
      });
    } else {
      const entry: CondMarkInput = {
        rowId: it.rowId,
        itemId: it.itemId,
        snapshot: {
          durationMin: it.durationMin,
          speed: it.speed,
          incline: it.incline,
          sets: it.sets,
          reps: it.reps,
        },
      };
      if (it.kind === "warmup") warmup.push(entry);
      else cooldown.push(entry);
    }
  }

  return { planRows, warmup, cooldown };
}
