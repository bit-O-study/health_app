import { describe, expect, it } from "vitest";

import { applyTodayOrder, longestSamePartRun, orderLookups, stimulusOverlap, suggestOrder, type OrderLookups, type OrderRow } from "@/features/routine/order-organizer";
import { primaryBodyPart } from "@/features/routine/exercise-body-parts";

// 실제 카탈로그 데이터로 돈다 — 표의 숫자가 바뀌어도 '연속이 줄어든다'는 성질은 지켜야 한다.
const real: OrderLookups = orderLookups();
const rows = (ids: string[], extra: Partial<OrderRow>[] = []): OrderRow[] =>
  ids.map((exerciseId, i) => ({ id: `r${i}`, exerciseId, supersetGroup: null, locked: false, ...extra[i] }));
const partsOf = (ids: string[], src: OrderRow[]) => ids.map((id) => primaryBodyPart(src.find((r) => r.id === id)!.exerciseId));

describe("order-organizer (운동 순서 정리)", () => {
  it("가슴 3개 연속 + 등 2개 → 같은 부위 연속이 줄고 무거운 운동이 먼저", () => {
    const src = rows(["bench-press", "incline-dumbbell-bench-press", "cable-fly", "lat-pulldown", "barbell-row"]);
    const s = suggestOrder(src, real)!;
    expect(s).not.toBeNull();
    expect(s.streaksBefore).toBe(3);
    expect(s.streaksAfter).toBeLessThan(s.streaksBefore);
    expect(s.costAfter).toBeLessThan(s.costBefore);
    expect(new Set(s.ids)).toEqual(new Set(src.map((r) => r.id)));
    // 가슴 둘이 바로 붙지 않는다
    const parts = partsOf(s.ids, src);
    expect(parts.slice(0, 3).filter((p) => p === "chest").length).toBeLessThanOrEqual(2);
    expect(["bench-press", "barbell-row"]).toContain(src.find((r) => r.id === s.ids[0])!.exerciseId);
  });

  it("팔(작은 근육) 단독 운동은 같은 근육을 쓰는 큰 운동 뒤로", () => {
    const src = rows(["triceps-pushdown", "bench-press", "lat-pulldown", "incline-dumbbell-bench-press"]);
    const s = suggestOrder(src, real)!;
    expect(s.ids[s.ids.length - 1]).toBe("r0");
    expect(s.moves.find((m) => m.id === "r0")?.reason).toBe("small-last");
  });

  it("끝낸 운동은 자리를 지키고 나머지만 정리", () => {
    const src = rows(["bench-press", "incline-dumbbell-bench-press", "cable-fly", "lat-pulldown", "barbell-row"], [{ locked: true }]);
    const s = suggestOrder(src, real)!;
    expect(s.ids[0]).toBe("r0");
  });

  it("슈퍼세트는 붙은 채로 같이 옮긴다", () => {
    const src = rows(["bench-press", "incline-dumbbell-bench-press", "cable-fly", "lat-pulldown", "barbell-row"], [{}, { supersetGroup: 1 }, { supersetGroup: 1 }]);
    const s = suggestOrder(src, real)!;
    const i = s.ids.indexOf("r1");
    expect(s.ids[i + 1]).toBe("r2");
  });

  it("이미 번갈아 있으면 제안하지 않는다(지금 순서도 좋아요)", () => {
    expect(suggestOrder(rows(["bench-press", "barbell-row", "incline-dumbbell-bench-press", "lat-pulldown"]), real)).toBeNull();
  });

  it("같은 입력이면 늘 같은 결과", () => {
    const src = rows(["bench-press", "incline-dumbbell-bench-press", "cable-fly", "lat-pulldown", "barbell-row", "triceps-pushdown"]);
    expect(suggestOrder(src, real)).toEqual(suggestOrder(src, real));
  });

  it("가짜 데이터: 한 부위만 있는 날은 singlePart, 세부 근육이 덜 겹치게 번갈아", () => {
    const stim: Record<string, Record<string, number>> = {
      a: { up: 100 }, b: { up: 90 }, c: { low: 100 }, d: { low: 90 },
    };
    const look: OrderLookups = { stimulusOf: (id) => stim[id], bodyPartOf: () => "chest", loadOf: () => "medium" };
    const s = suggestOrder(rows(["a", "b", "c", "d"]), look)!;
    expect(s.singlePart).toBe(true);
    expect(s.costAfter).toBeLessThan(s.costBefore);
    const ex = s.ids.map((id) => ["a", "b", "c", "d"][Number(id.slice(1))]);
    for (let i = 1; i < ex.length; i++) expect(stim[ex[i]].up && stim[ex[i - 1]].up).toBeFalsy();
  });

  it("운동이 2개 이하면 정리하지 않는다", () => {
    expect(suggestOrder(rows(["bench-press", "incline-dumbbell-bench-press"]), real)).toBeNull();
  });

  it("stimulusOverlap: 같은 운동 1, 겹침 없음 0", () => {
    expect(stimulusOverlap({ x: 50 }, { x: 50 })).toBe(1);
    expect(stimulusOverlap({ x: 50 }, { y: 50 })).toBe(0);
    expect(stimulusOverlap({}, { y: 50 })).toBe(0);
  });

  it("longestSamePartRun: 가장 긴 같은 부위 연속", () => {
    expect(longestSamePartRun(["bench-press", "incline-dumbbell-bench-press", "cable-fly", "lat-pulldown"], primaryBodyPart)).toEqual({ part: "chest", length: 3 });
    expect(longestSamePartRun([], primaryBodyPart)).toBeNull();
  });

  it("applyTodayOrder: 정한 순서대로, 나중에 더한 운동은 뒤에", () => {
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "new" }];
    expect(applyTodayOrder(list, ["c", "a", "b"]).map((r) => r.id)).toEqual(["c", "a", "b", "new"]);
    expect(applyTodayOrder(list, null)).toBe(list);
  });
});
