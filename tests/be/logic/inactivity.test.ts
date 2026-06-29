import { describe, expect, it } from "vitest";

import {
  INACTIVITY_LIMIT_MS,
  NO_RESPONSE_LIMIT_MS,
  isInactive,
  noResponseExpired,
  shouldPrompt,
} from "@/features/workout-timer/inactivity";
import { queueToRestInputs } from "@/features/routine/rest-remaining";
import type { GuidedItem } from "@/features/workout-timer/guided-workout";

const MIN = 60_000;

describe("isInactive — 30분 무활동", () => {
  it("임계 미만이면 false", () => {
    expect(isInactive(0, 29 * MIN)).toBe(false);
  });
  it("임계 이상이면 true", () => {
    expect(isInactive(0, 30 * MIN)).toBe(true);
    expect(isInactive(0, INACTIVITY_LIMIT_MS)).toBe(true);
  });
});

describe("noResponseExpired — 10분 무응답", () => {
  it("10분 전이면 false, 10분이면 true", () => {
    expect(noResponseExpired(0, 9 * MIN)).toBe(false);
    expect(noResponseExpired(0, NO_RESPONSE_LIMIT_MS)).toBe(true);
  });
});

describe("shouldPrompt — 알림 조건", () => {
  const base = {
    running: true,
    alreadyPrompted: false,
    remainingCount: 3,
    lastActivityMs: 0,
    nowMs: 31 * MIN,
  };
  it("실행중 + 미알림 + 남은운동 + 무활동이면 true", () => {
    expect(shouldPrompt(base)).toBe(true);
  });
  it("정지 상태면 false", () => {
    expect(shouldPrompt({ ...base, running: false })).toBe(false);
  });
  it("이미 알림 떠 있으면 false", () => {
    expect(shouldPrompt({ ...base, alreadyPrompted: true })).toBe(false);
  });
  it("남은 운동이 없으면 false", () => {
    expect(shouldPrompt({ ...base, remainingCount: 0 })).toBe(false);
  });
  it("아직 30분 안 지났으면 false", () => {
    expect(shouldPrompt({ ...base, nowMs: 10 * MIN })).toBe(false);
  });
});

describe("queueToRestInputs — 큐 → 휴식처리 입력", () => {
  const items: GuidedItem[] = [
    {
      kind: "warmup",
      rowId: "w1",
      itemId: "treadmill",
      name: "트레드밀",
      subtitle: "",
      method: [],
      durationMin: 10,
      speed: 6,
      incline: 1,
      sets: null,
      reps: null,
      memo: null,
    },
    {
      kind: "main",
      rowId: "m1",
      exerciseId: "squat",
      equipment: "barbell",
      focus: "lower",
      name: "스쿼트",
      subtitle: "",
      method: [],
      sets: 4,
      reps: 8,
      weightKg: 60,
      memo: null,
      media: null,
    },
    {
      kind: "cooldown",
      rowId: "c1",
      itemId: "stretch",
      name: "스트레칭",
      subtitle: "",
      method: [],
      durationMin: 5,
      speed: null,
      incline: null,
      sets: null,
      reps: null,
      memo: null,
    },
  ];

  it("종류별로 분류하고 본운동 스냅샷을 매핑한다", () => {
    const r = queueToRestInputs(items);
    expect(r.planRows).toHaveLength(1);
    expect(r.planRows[0].rowId).toBe("m1");
    expect(r.planRows[0].snapshot.exerciseId).toBe("squat");
    expect(r.planRows[0].snapshot.focus).toBe("lower");
    expect(r.warmup.map((w) => w.rowId)).toEqual(["w1"]);
    expect(r.warmup[0].snapshot?.durationMin).toBe(10);
    expect(r.cooldown.map((c) => c.rowId)).toEqual(["c1"]);
  });

  it("빈 큐는 전부 빈 배열", () => {
    const r = queueToRestInputs([]);
    expect(r.planRows).toHaveLength(0);
    expect(r.warmup).toHaveLength(0);
    expect(r.cooldown).toHaveLength(0);
  });
});
