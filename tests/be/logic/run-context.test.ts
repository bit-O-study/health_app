import { describe, expect, it } from "vitest";

import {
  goalFromParam,
  goalToParam,
  lastRunLabel,
  parseRunContext,
  pickLastRun,
  runContextFromParams,
  runHref,
  type LastRunRow,
} from "@/features/running/run-context";

const row = (o: Partial<LastRunRow>): LastRunRow => ({ mode: "indoor", goal: { kind: "distance", meters: 5000 }, replaced_routine: false, routine_day: 2, for_date: "2026-10-21", ...o });

describe("run-context (런닝 이어하기)", () => {
  it("목표 URL 왕복 — 시작 화면에 없는 값은 자유 달리기", () => {
    for (const g of [{ kind: "free" } as const, { kind: "distance", meters: 5000 } as const, { kind: "time", sec: 1800 } as const]) {
      expect(goalFromParam(goalToParam(g))).toEqual(g);
    }
    expect(goalFromParam("d4321")).toEqual({ kind: "free" });
    expect(goalFromParam("x")).toEqual({ kind: "free" });
    expect(goalFromParam(null)).toEqual({ kind: "free" });
  });

  it("URL → 맥락: 일차가 없거나 틀리면 루틴 밖 런닝(null)", () => {
    expect(runContextFromParams({ day: "3", goal: "d5000", replaced: "1" })).toEqual({ routineDay: 3, goal: { kind: "distance", meters: 5000 }, replaced: true });
    expect(runContextFromParams({})).toBeNull();
    expect(runContextFromParams({ day: "9" })).toBeNull();
  });

  it("링크 만들기", () => {
    expect(runHref("outdoor", null)).toBe("/running?mode=outdoor");
    expect(runHref("indoor", { routineDay: 1, goal: { kind: "time", sec: 1800 }, replaced: false })).toBe("/running?mode=indoor&day=1&goal=t1800&replaced=0");
  });

  it("서버 입력 검사", () => {
    expect(parseRunContext({ routineDay: 4, goal: { kind: "distance", meters: 3000 }, replaced: false })).toEqual({ routineDay: 4, goal: { kind: "distance", meters: 3000 }, replaced: false });
    expect(parseRunContext({ routineDay: 7, replaced: false })).toBeNull();
    expect(parseRunContext({ routineDay: 1, replaced: "no" })).toBeNull();
    expect(parseRunContext(null)).toBeNull();
  });

  it("4일 루틴이면 루틴마다 따로 — 같은 루틴 날에 뛴 것만, 다른 루틴 날 런닝은 안 쓴다", () => {
    const rows = [row({ routine_day: 5, mode: "outdoor", for_date: "2026-10-26" }), row({ routine_day: 2, for_date: "2026-10-21", replaced_routine: true })];
    expect(pickLastRun(rows, 2, new Set(["2026-10-21"]))).toMatchObject({ mode: "indoor", replaced: true, forDate: "2026-10-21" });
    expect(pickLastRun(rows, 0, new Set(["2026-10-26"]))).toMatchObject({ mode: "outdoor", forDate: "2026-10-26" });
    expect(pickLastRun(rows, 2)).toBeNull(); // 같은 루틴 기록이 없으면 다른 루틴 걸 끌어오지 않는다
  });

  it("같은 루틴(부위 묶음이 같은 날)에서 뛴 설정이 일차·최근보다 먼저", () => {
    const rows = [
      row({ routine_day: 2, mode: "outdoor", for_date: "2026-10-26" }), // 같은 일차지만 다른 루틴(가슴만)
      row({ routine_day: 4, mode: "indoor", for_date: "2026-10-21", goal: { kind: "time", sec: 1800 } }), // 가슴+팔 날
    ];
    expect(pickLastRun(rows, 2, new Set(["2026-10-21"]))).toMatchObject({ mode: "indoor", goal: { kind: "time", sec: 1800 }, sameRoutine: true });
  });

  it("루틴 밖에서 뛴 기록(일차 없음)은 쓰지 않는다", () => {
    expect(pickLastRun([row({ routine_day: null })], 2)).toBeNull();
    expect(pickLastRun([], 2)).toBeNull();
  });

  it("메뉴 한 줄", () => {
    expect(lastRunLabel({ mode: "indoor", goal: { kind: "distance", meters: 5000 }, replaced: false })).toBe("실내 · 5km · 마무리로");
    expect(lastRunLabel({ mode: "outdoor", goal: { kind: "free" }, replaced: true })).toBe("야외 · 자유 달리기 · 오늘 운동 대체");
  });
});
