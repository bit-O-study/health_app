import { describe, expect, it } from "vitest";

import {
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
import { todayKcal } from "@/features/routine/today-kcal";

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

  it("세트를 알면 '넘침' 대신 실제 세트와 목표 배수", () => {
    expect(statusChip("high", 286, { stim: 43.3, target: 15.1 })).toBe("43.5세트 · 목표 2.9배");
    expect(statusChip("ok", 120, { stim: 18, target: 15 })).toBe("적정 · 120%");
    expect(statusChip("high", 300, { stim: 3, target: 0 })).toBe("넘침");
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
    expect(worstBalance([rows[2]])).toBeNull();
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

describe("운동 탭 소모 칼로리 한 줄", () => {
  it("끝낸 것은 소모, 건너뛴 것은 예상에서도 뺀다", () => {
    expect(
      todayKcal([
        { kcal: 30.4, done: true, skipped: false },
        { kcal: 20, done: false, skipped: false },
        { kcal: 50, done: false, skipped: true },
      ]),
    ).toEqual({ done: 30, total: 50 });
    expect(todayKcal([])).toEqual({ done: 0, total: 0 });
  });
});

describe("맞춤 운동 한눈에(2026-10-07)", () => {
  it("레이더 — 가슴이 위, 150% 에서 멈추고 0% 도 점이 겹치지 않는다", async () => {
    const { radarGeometry, RADAR_ORDER } = await import("@/features/routine/fit-view");
    expect(RADAR_ORDER[0]).toBe("chest");
    const g = radarGeometry([
      { part: "chest", pct: 400 },
      { part: "back", pct: 0 },
    ]);
    // 가슴(위)은 바깥(반지름 84)에 닿고 넘지 않는다.
    expect(g.actual.split(" ")[0]).toBe("100,16");
    expect(g.outer.split(" ")[0]).toBe("100,16");
    // 목표(100%) = 반지름 56.
    expect(g.goal.split(" ")[0]).toBe("100,44");
    // 등(0%)은 반지름 4 — 중심에서 살짝 떨어진 점.
    const back = g.actual.split(" ")[5].split(",").map(Number);
    expect(Math.hypot(back[0] - 100, back[1] - 100)).toBeCloseTo(4, 0);
    expect(g.axes).toHaveLength(6);
  });

  it("성장 타일 — 정체 종목 먼저, 아니면 가장 많이 오른 종목", async () => {
    const { growthTile } = await import("@/features/routine/fit-view");
    const s = (a: number, b: number) => [{ date: "2026-09-01", value: a }, { date: "2026-10-01", value: b }];
    expect(growthTile([])).toBeNull();
    expect(growthTile([
      { name: "벤치", latestKg: 80, stalled: false, series: s(70, 80) },
      { name: "스쿼트", latestKg: 100, stalled: false, series: s(98, 100) },
    ])).toMatchObject({ name: "벤치", diffKg: 10, stalled: false });
    expect(growthTile([
      { name: "벤치", latestKg: 80, stalled: false, series: s(70, 80) },
      { name: "데드", latestKg: 120, stalled: true, series: s(120, 120) },
    ])?.name).toBe("데드");
  });

  it("볼륨 짧게", async () => {
    const { shortVolume } = await import("@/features/routine/fit-view");
    expect(shortVolume(4800)).toBe("4.8t");
    expect(shortVolume(950)).toBe("950kg");
  });

  it("옛 탭 주소 — 균형은 한눈에 시트로, 성장은 기록으로(렌더 전)", async () => {
    const { legacyFitRedirects } = await import("@/features/routine/fit-redirects");
    expect(legacyFitRedirects()).toEqual([
      { source: "/fit/balance", destination: "/fit?sheet=balance", permanent: false },
      { source: "/fit/growth", destination: "/fit/report", permanent: false },
    ]);
  });
});
