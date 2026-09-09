import { describe, expect, it } from "vitest";

import {
  STALE_DAYS,
  adherencePct,
  attentionOf,
  daysSinceWorkout,
  sortForTrainer,
  trainerSummary,
  urgencyOf,
  weightDelta,
  type TrainerMember,
} from "@/features/groups/trainer-board";

const TODAY = "2026-09-09";

function member(over: Partial<TrainerMember> = {}): TrainerMember {
  return {
    userId: "u1",
    name: "회원",
    workoutDays: 3,
    dietDays: 3,
    targetDays: 3,
    lastWorkout: TODAY,
    weightFirst: 70,
    weightLast: 70,
    ...over,
  };
}

describe("이번 주 달성률", () => {
  it("목표 대비 퍼센트를 반올림한다", () => {
    expect(adherencePct(member({ workoutDays: 2, targetDays: 3 }))).toBe(67);
    expect(adherencePct(member({ workoutDays: 3, targetDays: 3 }))).toBe(100);
  });

  it("🔴 목표를 안 정했으면 0% 가 아니라 null 이다", () => {
    // 목표를 안 정한 것과 정하고 못 지킨 것은 트레이너에게 전혀 다른 정보다.
    // 0% 로 만들면 루틴을 아직 안 짠 신규 회원이 '최악의 회원'으로 맨 위에 뜬다.
    expect(adherencePct(member({ targetDays: 0 }))).toBeNull();
  });

  it("목표를 넘겨도 100% 를 넘지 않는다", () => {
    expect(adherencePct(member({ workoutDays: 7, targetDays: 3 }))).toBe(100);
  });
});

describe("체중 변화", () => {
  it("마지막 - 처음, 소수 첫째자리", () => {
    expect(weightDelta(member({ weightFirst: 70.2, weightLast: 68.1 }))).toBe(-2.1);
  });
  it("비교할 기록이 없으면 null", () => {
    expect(weightDelta(member({ weightFirst: null, weightLast: null }))).toBeNull();
    expect(weightDelta(member({ weightFirst: 70, weightLast: null }))).toBeNull();
  });
});

describe("마지막 운동일", () => {
  it("며칠 지났는지 센다", () => {
    expect(daysSinceWorkout(member({ lastWorkout: "2026-09-06" }), TODAY)).toBe(3);
    expect(daysSinceWorkout(member({ lastWorkout: TODAY }), TODAY)).toBe(0);
  });

  it("🔴 기록이 아예 없으면 null — 큰 숫자로 만들지 않는다", () => {
    // 가입만 하고 한 번도 안 한 회원은 '이탈'이 아니라 온보딩 실패다.
    expect(daysSinceWorkout(member({ lastWorkout: null }), TODAY)).toBeNull();
  });
});

describe("챙길 이유", () => {
  it("잘 하고 있으면 아무 이유도 없다", () => {
    expect(attentionOf(member(), TODAY)).toEqual([]);
  });

  it("🔴 '기록이 없다' 와 '요즘 안 한다' 를 구분해 다르게 말한다", () => {
    const never = attentionOf(member({ lastWorkout: null }), TODAY);
    expect(never[0].label).toContain("아직 운동 기록이 없어요");

    const stale = attentionOf(member({ lastWorkout: "2026-09-04" }), TODAY);
    expect(stale[0].label).toContain("5일째");
  });

  it(`${STALE_DAYS}일 미만은 조용하다 — 주 3회 회원도 이틀은 정상이다`, () => {
    const twoDays = attentionOf(
      member({ lastWorkout: "2026-09-07" }), // 2일 전
      TODAY,
    );
    expect(twoDays.map((f) => f.label).join()).not.toContain("운동 기록이 없어요");
  });

  it("목표의 절반도 못 채우면 알린다", () => {
    const f = attentionOf(member({ workoutDays: 1, targetDays: 5 }), TODAY);
    expect(f.some((x) => x.label.includes("20%"))).toBe(true);
  });

  it("식단을 한 번도 안 적었으면 알린다", () => {
    const f = attentionOf(member({ dietDays: 0 }), TODAY);
    expect(f.some((x) => x.label.includes("식단 기록 없음"))).toBe(true);
  });

  it("🔴 체중은 방향을 판단하지 않는다 — 증량이 목표인 회원도 있다", () => {
    const up = attentionOf(member({ weightFirst: 70, weightLast: 73 }), TODAY);
    const down = attentionOf(member({ weightFirst: 73, weightLast: 70 }), TODAY);
    expect(up.some((x) => x.label === "체중 +3kg")).toBe(true);
    expect(down.some((x) => x.label === "체중 -3kg")).toBe(true);
    // 2kg 미만의 흔들림은 알리지 않는다(매일 뜨면 아무도 안 본다).
    expect(attentionOf(member({ weightFirst: 70, weightLast: 71 }), TODAY)).toEqual([]);
  });
});

describe("정렬", () => {
  it("🔴 랭킹과 반대로 — 챙길 사람이 위로 온다", () => {
    // 트레이너가 이 화면을 여는 이유는 1등을 보려는 게 아니라 연락할 사람을 찾는 것이다.
    const good = member({ userId: "good", name: "김성실" });
    const stale = member({
      userId: "stale",
      name: "박결석",
      lastWorkout: "2026-09-01",
      workoutDays: 0,
      dietDays: 0,
    });
    const never = member({
      userId: "never",
      name: "이신규",
      lastWorkout: null,
      workoutDays: 0,
      dietDays: 0,
    });
    const sorted = sortForTrainer([good, stale, never], TODAY);
    expect(sorted.map((m) => m.userId)).toEqual(["never", "stale", "good"]);
  });

  it("급한 정도가 같으면 이름순 — 볼 때마다 순서가 바뀌면 안 된다", () => {
    const a = member({ userId: "a", name: "나회원" });
    const b = member({ userId: "b", name: "가회원" });
    expect(urgencyOf(a, TODAY)).toBe(urgencyOf(b, TODAY));
    expect(sortForTrainer([a, b], TODAY).map((m) => m.userId)).toEqual(["b", "a"]);
    expect(sortForTrainer([b, a], TODAY).map((m) => m.userId)).toEqual(["b", "a"]);
  });

  it("원본 배열을 건드리지 않는다", () => {
    const list = [member({ userId: "a" }), member({ userId: "b", lastWorkout: null })];
    sortForTrainer(list, TODAY);
    expect(list.map((m) => m.userId)).toEqual(["a", "b"]);
  });
});

describe("요약", () => {
  it("담당·챙길·오늘 운동한 인원을 센다", () => {
    const s = trainerSummary(
      [
        member({ userId: "a" }), // 오늘 운동, 이상 없음
        member({ userId: "b", lastWorkout: "2026-09-01", dietDays: 0 }),
        member({ userId: "c", lastWorkout: null, dietDays: 0 }),
      ],
      TODAY,
    );
    expect(s).toEqual({ total: 3, needsAttention: 2, workedToday: 1 });
  });
});
