/**
 * 완료 취소 대상 고르기 — 순수 모듈(테스트 가능).
 *
 * 완료기록은 행 id(exercise_row_id)로 지운다. 그런데 "오늘만 변경"(전체 바꾸기 후 다시 담기)
 * 처럼 계획 행을 지우고 새로 만들면 완료기록이 **사라진 옛 행 id** 를 가리킨 채 남는다.
 * 화면은 (부위:운동) 키 폴백으로 완료로 보여주지만, 취소는 행 id 로만 지워서 0건 삭제
 * → "완료 취소가 안 먹는" 상태가 된다.
 *
 * 그래서 행 id 로 못 지웠을 때만, 같은 (부위:운동) 기록 **딱 1건**을 골라 지운다.
 * (예전처럼 키로 전부 지우면 같은 운동이 두 번 든 루틴에서 다른 완료까지 날아간다.)
 */
export type ClearCandidate = {
  id: string;
  exerciseRowId: string;
  status: "done" | "skipped";
};

/** 행 id 정확 매칭 우선 → 없으면 done 우선으로 1건. 없으면 null. */
export function pickCompletionToClear(
  candidates: ClearCandidate[],
  exerciseRowId: string,
): string | null {
  const exact = candidates.find((c) => c.exerciseRowId === exerciseRowId);
  if (exact) return exact.id;
  const done = candidates.find((c) => c.status === "done");
  if (done) return done.id;
  return candidates[0]?.id ?? null;
}
