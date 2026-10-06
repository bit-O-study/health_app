import { describe, expect, it } from "vitest";

import {
  balanceHeadline,
  deltaMark,
  fmtSets,
  growthEnds,
  partWithEulReul,
  recommendHeadline,
  roundSets,
  sortPartsByNeed,
  statusChip,
  worstBalance,
} from "@/features/routine/fit-view";
import { withPlanned, type BalanceRow, type SubRow } from "@/features/routine/fit";
import { sessionCapacity } from "@/features/profile/survey-extra";

const row = (sub: string, pct: number): SubRow => ({ sub, stim: 0, target: 4, pct, status: pct < 50 ? "low" : "ok" });

describe("맞춤 운동 화면 규칙(2026-10-06 UI 개편)", () => {
  it("세트는 0.5 단위 — 소수 세트(3.6·4.2)를 그대로 보이지 않는다", () => {
    expect(roundSets(3.6)).toBe(3.5);
    expect(roundSets(4.2)).toBe(4);
    expect(fmtSets(0.6)).toBe("0.5");
    expect(fmtSets(2.4)).toBe("2.5");
    expect(fmtSets(3)).toBe("3");
  });

  it("목표의 200%를 넘거나 '많음'이면 숫자 대신 '넘침'", () => {
    expect(statusChip("high", 283)).toBe("넘침");
    expect(statusChip("ok", 210)).toBe("넘침");
    expect(statusChip("low", 20)).toBe("부족 · 20%");
  });

  it("오늘 추천 결론 — 가장 모자란 세부 근육의 부위로 한 문장, 받침에 맞는 조사", () => {
    expect(recommendHeadline([row("back-lats", 0), row("shoulder-side", 0)]).text).toBe("등이 부족해요");
    expect(recommendHeadline([row("shoulder-side", 0)]).text).toBe("어깨가 부족해요");
    expect(recommendHeadline([row("back-lats", 0)]).part).toBe("back");
    expect(recommendHeadline([]).text).toBe("이번 주 목표 달성!");
  });

  it("부위는 모자란 순", () => {
    expect(sortPartsByNeed([{ pct: 94 }, { pct: 20 }, { pct: 283 }]).map((p) => p.pct)).toEqual([20, 94, 283]);
  });

  it("균형 — 가장 큰 차이 하나만 고른다(5%p 이내는 맞은 것)", () => {
    const rows: BalanceRow[] = [
      { id: "push-pull", label: "밀기 : 당기기", parts: [{ label: "밀기", now: 100, goal: 53 }, { label: "당기기", now: 0, goal: 47 }], hint: "x" },
      { id: "shoulder", label: "어깨", parts: [{ label: "앞", now: 100, goal: 17 }, { label: "옆", now: 0, goal: 50 }, { label: "뒤", now: 0, goal: 33 }], hint: "y" },
      { id: "legs", label: "하체", parts: [{ label: "앞", now: 49, goal: 46 }, { label: "뒤", now: 51, goal: 54 }], hint: "" },
      { id: "chest", label: "가슴", parts: [{ label: "상", now: 0, goal: 45 }, { label: "중", now: 0, goal: 36 }], hint: "" },
    ];
    expect(worstBalance(rows)).toMatchObject({ id: "shoulder", part: "옆", gap: 50 });
    expect(balanceHeadline(rows)).toBe("어깨 옆이 부족해요");
    expect(balanceHeadline([rows[2]])).toBe("균형이 좋아요");
  });

  it("성장 추이 양끝 — 날짜·무게와 변화량", () => {
    expect(growthEnds([{ date: "2026-09-06", value: 88 }, { date: "2026-10-04", value: 101.3 }])).toEqual({
      from: "9/6 88kg",
      to: "10/4 101.3kg",
      diffKg: 13.3,
    });
    expect(growthEnds([{ date: "2026-10-04", value: 100 }])).toBeNull();
  });

  it("리포트 지난달 대비 · 부위 조사", () => {
    expect(deltaMark(3, 6)).toEqual({ mark: "down", diff: 3 });
    expect(deltaMark(5, 5).mark).toBe("same");
    expect(partWithEulReul("chest")).toBe("가슴을");
    expect(partWithEulReul("back")).toBe("등을");
    expect(partWithEulReul("core")).toBe("코어를");
  });
});

describe("오늘 할 운동을 추천 계산에 더한다(담은 뒤 또 담으라고 하지 않게)", () => {
  const stimulusOf = (id: string): Record<string, number> => (id === "lat-pulldown" ? { "back-lats": 100, "arm-biceps-long": 30 } : { "chest-mid": 100 });
  it("아직 안 끝낸 오늘 운동만 PLAN_SETS(3)로 더한다", () => {
    const r = withPlanned({ "back-lats": 1 }, ["lat-pulldown", "bench-press"], new Set(["bench-press"]), stimulusOf);
    expect(r.count).toBe(1);
    expect(r.stim["back-lats"]).toBeCloseTo(4);
    expect(r.stim["arm-biceps-long"]).toBeCloseTo(0.9);
    expect(r.stim["chest-mid"]).toBeUndefined();
  });
  it("1회 분량 — 30분 4개 · 45분 6개 · 60분 8개", () => {
    expect(sessionCapacity(30)).toBe(4);
    expect(sessionCapacity(45)).toBe(6);
    expect(sessionCapacity(60)).toBe(8);
    expect(sessionCapacity(null)).toBe(6);
  });
});
