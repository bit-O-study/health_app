import { describe, expect, it } from "vitest";

import { pickCompletionToClear } from "@/features/routine/completion-clear";

describe("pickCompletionToClear — 완료 취소 대상 1건 고르기", () => {
  it("행 id 가 정확히 맞는 기록을 지운다", () => {
    expect(
      pickCompletionToClear(
        [
          { id: "c1", exerciseRowId: "rowA", status: "done" },
          { id: "c2", exerciseRowId: "rowB", status: "done" },
        ],
        "rowB",
      ),
    ).toBe("c2");
  });

  it("행 id 가 어긋난 기록(계획 재저장으로 옛 행)이면 done 1건을 지운다", () => {
    expect(
      pickCompletionToClear(
        [
          { id: "c1", exerciseRowId: "사라진옛행", status: "skipped" },
          { id: "c2", exerciseRowId: "사라진옛행2", status: "done" },
        ],
        "새행",
      ),
    ).toBe("c2");
  });

  it("done 이 없으면 첫 기록(skipped)을 지운다", () => {
    expect(
      pickCompletionToClear(
        [{ id: "c1", exerciseRowId: "옛행", status: "skipped" }],
        "새행",
      ),
    ).toBe("c1");
  });

  it("같은 운동 2건이어도 한 번에 1건만 고른다", () => {
    const cands = [
      { id: "c1", exerciseRowId: "옛행1", status: "done" as const },
      { id: "c2", exerciseRowId: "옛행2", status: "done" as const },
    ];
    expect(pickCompletionToClear(cands, "새행")).toBe("c1");
  });

  it("후보가 없으면 null", () => {
    expect(pickCompletionToClear([], "새행")).toBeNull();
  });
});
