import { describe, expect, it } from "vitest";

import { assignCompletions } from "@/features/routine/completion-match";

/**
 * 런닝이 2개 완료돼 있을 때 하나만 취소하면 **그 하나만** 취소돼야 한다.
 *
 * 예전 버그: 완료취소가 `removeTodayRunAction()`(인자 없음)으로 "오늘 item_id='running'
 * 인 완료기록 전부"를 지워, 하나를 취소하면 나머지 런닝 완료까지 같이 날아갔다.
 * 이제 취소한 행에 **배정된 기록 1건**(source_row_id)만 지운다.
 *
 * 여기선 그 '행 ↔ 기록' 배정과 1건만 지운 뒤의 화면 상태를 고정한다.
 */
// conditioningCompletionKey("cooldown", "running") 와 같은 값(서버 모듈 import 회피).
const KEY = "c:cooldown:running";

type Rec = { id: string; key: string; status: "done" | "skipped" };

/** 화면이 판정하는 '완료 행 목록'. */
function doneRows(rowIds: string[], records: Rec[]): string[] {
  const { statusById } = assignCompletions(
    rowIds.map((id) => ({ id, key: KEY })),
    records,
  );
  return rowIds.filter((id) => statusById.get(id) === "done");
}

/** 서버가 하는 일: source_row_id 로 1건만 삭제. */
function removeRecord(records: Rec[], sourceRowId: string): Rec[] {
  return records.filter((r) => r.id !== sourceRowId);
}

describe("런닝 2개 완료 → 하나만 취소", () => {
  it("행별 기록 2건이면, 하나를 취소해도 나머지는 완료로 남는다", () => {
    const rows = ["rowA", "rowB"];
    const records: Rec[] = [
      { id: "rowA", key: KEY, status: "done" },
      { id: "rowB", key: KEY, status: "done" },
    ];
    expect(doneRows(rows, records)).toEqual(["rowA", "rowB"]);

    // rowA 완료취소 — rowA 에 배정된 기록(=rowA) 1건만 삭제.
    expect(doneRows(rows, removeRecord(records, "rowA"))).toEqual(["rowB"]);
    // 반대로 rowB 를 취소해도 rowA 는 그대로.
    expect(doneRows(rows, removeRecord(records, "rowB"))).toEqual(["rowA"]);
  });

  it("런닝모드 기록(행 id 아닌 무작위 id)은 키로 배정되고, 그 기록만 지우면 그 행만 풀린다", () => {
    const rows = ["rowA", "rowB"];
    // run-mode 기록은 source_row_id 가 플랜 행 id 가 아니다 → 키 폴백으로 rowA 에 배정.
    const records: Rec[] = [
      { id: "run-uuid", key: KEY, status: "done" },
      { id: "rowB", key: KEY, status: "done" },
    ];
    expect(doneRows(rows, records)).toEqual(["rowA", "rowB"]);

    // rowA 를 취소할 땐 '행 id' 가 아니라 **배정된 기록 id**(run-uuid)를 지워야 한다.
    expect(doneRows(rows, removeRecord(records, "run-uuid"))).toEqual(["rowB"]);
    // 행 id 로 지우려 하면 아무것도 안 지워져 취소가 먹지 않는다(회귀 방지).
    expect(doneRows(rows, removeRecord(records, "rowA"))).toEqual([
      "rowA",
      "rowB",
    ]);
  });

  it("옛 동작(같은 항목 기록 전부 삭제)이면 둘 다 취소돼 버린다 — 회귀 방지", () => {
    const rows = ["rowA", "rowB"];
    const records: Rec[] = [
      { id: "rowA", key: KEY, status: "done" },
      { id: "rowB", key: KEY, status: "done" },
    ];
    const nukedByItem = records.filter(() => false); // item_id 기준 전부 삭제
    expect(doneRows(rows, nukedByItem)).toEqual([]);
  });
});