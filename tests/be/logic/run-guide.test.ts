import { describe, expect, it } from "vitest";

import {
  FREE_GOAL,
  crossedKms,
  goalLabel,
  goalProgress,
  goalReachedAnnouncement,
  kmAnnouncement,
  parseGoal,
  personalRecords,
  spokenDuration,
} from "@/features/running/run-guide";

describe("목표", () => {
  it("라벨·기억값 해석(모르는 값은 자유)", () => {
    expect(goalLabel({ kind: "distance", meters: 5000 })).toBe("5km");
    expect(goalLabel({ kind: "time", sec: 1800 })).toBe("30분");
    expect(goalLabel(FREE_GOAL)).toBe("자유 달리기");
    expect(parseGoal(JSON.stringify({ kind: "distance", meters: 5000 }))).toEqual({ kind: "distance", meters: 5000 });
    expect(parseGoal(JSON.stringify({ kind: "distance", meters: 4321 }))).toEqual(FREE_GOAL);
    expect(parseGoal("{broken")).toEqual(FREE_GOAL);
    expect(parseGoal(null)).toEqual(FREE_GOAL);
  });

  it("진행 비율·남은 양·달성", () => {
    expect(goalProgress({ kind: "distance", meters: 5000 }, 3210, 0)).toEqual({ ratio: 0.642, reached: false, remaining: "목표까지 1.79km" });
    expect(goalProgress({ kind: "distance", meters: 5000 }, 5020, 0)).toMatchObject({ ratio: 1, reached: true, remaining: "목표 달성" });
    expect(goalProgress({ kind: "time", sec: 1800 }, 0, 1500)).toMatchObject({ reached: false, remaining: "목표까지 5분" });
    expect(goalProgress(FREE_GOAL, 3000, 900)).toBeNull();
  });
});

describe("1km 안내", () => {
  it("새로 넘은 km 만(여러 개를 한 번에 넘어도)", () => {
    expect(crossedKms(950, 1010)).toEqual([1]);
    expect(crossedKms(950, 2010)).toEqual([1, 2]);
    expect(crossedKms(1010, 1500)).toEqual([]);
    expect(crossedKms(0, 999)).toEqual([]);
  });

  it("말하기 시간", () => {
    expect(spokenDuration(341)).toBe("5분 41초");
    expect(spokenDuration(60)).toBe("1분");
    expect(spokenDuration(42)).toBe("42초");
  });

  it("문장 — 구간·평균·목표까지", () => {
    expect(kmAnnouncement({ km: 3, splitSec: 341, avgPaceSec: 349, goal: { kind: "distance", meters: 5000 }, meters: 3000, sec: 1047 }))
      .toBe("3킬로미터. 구간 5분 41초. 평균 5분 49초. 목표까지 2킬로미터.");
    expect(kmAnnouncement({ km: 1, splitSec: 360, avgPaceSec: 360, goal: { kind: "time", sec: 1800 }, meters: 1000, sec: 360 }))
      .toBe("1킬로미터. 구간 6분. 평균 6분. 목표까지 24분.");
    expect(kmAnnouncement({ km: 2, splitSec: 300, avgPaceSec: null, goal: FREE_GOAL, meters: 2000, sec: 650 }))
      .toBe("2킬로미터. 구간 5분.");
    expect(goalReachedAnnouncement({ kind: "distance", meters: 5000 })).toBe("목표 5킬로미터 달성! 잘했어요.");
  });
});

describe("개인 최고", () => {
  const prev = [
    { distanceM: 4200, paceSecPerKm: 380 },
    { distanceM: 800, paceSecPerKm: 250 }, // 짧은 질주 — 페이스 비교 대상 아님
  ];
  it("가장 긴 거리 · 1km 이상끼리 가장 빠른 페이스", () => {
    expect(personalRecords({ distanceM: 5020, paceSecPerKm: 349 }, prev)).toEqual(["longest", "fastest"]);
    expect(personalRecords({ distanceM: 3000, paceSecPerKm: 390 }, prev)).toEqual([]);
    expect(personalRecords({ distanceM: 3000, paceSecPerKm: 370 }, prev)).toEqual(["fastest"]);
    expect(personalRecords({ distanceM: 900, paceSecPerKm: 200 }, prev)).toEqual([]);
  });
  it("첫 런닝은 배지 없음", () => {
    expect(personalRecords({ distanceM: 5000, paceSecPerKm: 300 }, [])).toEqual([]);
  });
});
