/**
 * 오늘 완료 상태 매칭 — 순수 모듈(server-only 없음 → 단위 테스트 가능).
 *
 * 완료는 '사실'이라, 루틴을 바꿔(다가오는 7일 드래그·운동 재선택 등) 운동 행의
 * UUID 가 새로 생겨도 오늘 화면에서 완료로 유지돼야 한다. 그래서 완료를 행 id
 * 뿐 아니라 (부위:운동) 복합 키로도 인식한다.
 */

export type CompletionStatus = "done" | "skipped";

/** 오늘 운동별 완료 키. 행 UUID 가 바뀌어도 같은 (부위, 운동) 이면 매칭되도록
 * `f:${focus}:${exerciseId}` 복합 키를 만든다. */
export function exerciseCompletionKey(
  focus: string | null | undefined,
  exerciseId: string | null | undefined,
): string {
  return `f:${focus ?? ""}:${exerciseId ?? ""}`;
}

/**
 * 완료 상태 맵에서 한 운동 행의 상태를 찾는다.
 * 1) 행 id 정확 매칭 → 2) (부위:운동) 복합 키 폴백.
 * 루틴 변경으로 행 UUID 가 새로 생겨도 오늘 같은 (부위, 운동) 이면 완료 유지.
 *
 * ⚠ 같은 키(부위:운동)가 여러 행이면 한 완료가 모든 행을 done 으로 만든다(과매칭).
 * 화면에서 여러 행을 한꺼번에 판정할 땐 assignCompletions 를 써라.
 */
export function resolveTodayStatus(
  statusMap: Map<string, CompletionStatus>,
  row: {
    id: string;
    focus: string | null | undefined;
    exerciseId: string | null | undefined;
  },
): CompletionStatus | undefined {
  return (
    statusMap.get(row.id) ??
    statusMap.get(exerciseCompletionKey(row.focus, row.exerciseId))
  );
}

/**
 * 완료 기록을 행에 1:1 로 배정한다(과매칭 방지).
 *  1) 행 id 직접 매칭 → 2) 같은 키(부위:운동 / 종류:항목)의 미사용 기록을 done 우선으로 1개 소비.
 * 같은 키가 여러 행이어도 '완료 기록 수'만큼만 done 으로 표시된다.
 * (예전엔 키 폴백을 행마다 독립으로 봐서, 같은 운동 2개 중 1개만 완료해도 둘 다 완료로 떴다.)
 *
 * @returns statusById: 행 id → 상태, usedRecord: 각 기록이 소비됐는지(고스트 산출용)
 */
export function assignCompletions(
  rows: { id: string; key: string }[],
  records: { id: string; key: string; status: CompletionStatus }[],
): { statusById: Map<string, CompletionStatus>; usedRecord: boolean[] } {
  const used = records.map(() => false);
  const statusById = new Map<string, CompletionStatus>();

  // 1) 행 id 직접 매칭
  for (const r of rows) {
    if (statusById.has(r.id)) continue;
    const i = records.findIndex((rec, idx) => !used[idx] && rec.id === r.id);
    if (i >= 0) {
      used[i] = true;
      statusById.set(r.id, records[i].status);
    }
  }
  // 2) 키 매칭 — done 우선, 미사용 기록 1개 소비
  for (const r of rows) {
    if (statusById.has(r.id)) continue;
    let pick = -1;
    for (let i = 0; i < records.length; i++) {
      if (used[i] || records[i].key !== r.key) continue;
      if (records[i].status === "done") {
        pick = i;
        break;
      }
      if (pick === -1) pick = i; // done 없으면 skipped 라도
    }
    if (pick >= 0) {
      used[pick] = true;
      statusById.set(r.id, records[pick].status);
    }
  }
  return { statusById, usedRecord: used };
}