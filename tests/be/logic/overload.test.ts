import { describe, expect, it } from "vitest";

import {
  DELOAD_RATIO,
  REST_SESSIONS,
  STALL_SESSIONS,
  loadClassLabel,
  needsAttention,
  overloadPlan,
  stalledSessionCount,
} from "@/features/routine/overload";
import { exerciseHistory, type ProgressRecord } from "@/features/routine/progress";
import { prescribe, targetReps } from "@/features/routine/prescription";

/** 날짜는 최신순 판단에만 쓰이므로 6/01 부터 하루씩 민다. */
function rec(
  day: number,
  exerciseId: string,
  sets: number,
  reps: number,
  weightKg: number | null,
): ProgressRecord {
  const d = String(day).padStart(2, "0");
  return {
    forDate: `2026-06-${d}`,
    exerciseId,
    status: "done",
    sets,
    reps,
    weightKg,
    setDetails: null,
  };
}

/** 스쿼트(heavy) 중급자의 목표 횟수 — 규칙이 처방과 같은 기준을 보는지 함께 확인. */
const SQUAT_TARGET = targetReps("squat", "intermediate");

describe("stalledSessionCount — 정체 세션 수", () => {
  it("지난번에 최고치를 갱신했으면 0", () => {
    const sessions = exerciseHistory(
      [rec(1, "squat", 5, 5, 100), rec(2, "squat", 5, 5, 105)],
      "squat",
    );
    expect(stalledSessionCount(sessions)).toBe(0);
  });

  it("갱신 뒤로 이어진 세션 수를 센다", () => {
    const sessions = exerciseHistory(
      [
        rec(1, "squat", 5, 5, 100),
        rec(2, "squat", 5, 5, 105), // 최고치
        rec(3, "squat", 5, 5, 105),
        rec(4, "squat", 5, 5, 100),
      ],
      "squat",
    );
    expect(stalledSessionCount(sessions)).toBe(2);
  });

  it("기록이 하나뿐이면 0(정체라고 부를 수 없다)", () => {
    const sessions = exerciseHistory([rec(1, "squat", 5, 5, 100)], "squat");
    expect(stalledSessionCount(sessions)).toBe(0);
  });
});

describe("overloadPlan — 규칙 기반 추천", () => {
  it("최초 처방 중량도 2kg 단위 정수다", () => {
    const p = prescribe("bench-press", {
      gender: "male",
      experience: "intermediate",
      bodyType: "average",
      weightKg: 75,
    });
    expect(p.weightKg).not.toBeNull();
    expect((p.weightKg ?? 0) % 2).toBe(0);
    expect(Number.isInteger(p.weightKg)).toBe(true);
  });

  it("최초 처방은 바벨·머신 5kg, 덤벨 1kg 단위이며 소수를 만들지 않는다", () => {
    const opts = {
      gender: "male" as const,
      experience: "intermediate" as const,
      bodyType: "average" as const,
      weightKg: 73,
    };
    expect(prescribe("bench-press", { ...opts, equipment: "barbell" }).weightKg! % 5).toBe(0);
    expect(prescribe("bench-press", { ...opts, equipment: "dumbbell" }).weightKg! % 1).toBe(0);
    expect(prescribe("bench-press", { ...opts, equipment: "machine" }).weightKg! % 5).toBe(0);
  });

  it("과부하 추천도 선택 기구 단위로만 증량한다", () => {
    const rows = [rec(1, "bench-press", 4, 10, 42), rec(2, "bench-press", 4, 10, 45)];
    expect(overloadPlan(rows, "bench-press", "intermediate", undefined, "barbell").suggestedKg).toBe(50);
    expect(overloadPlan(rows, "bench-press", "intermediate", undefined, "dumbbell").suggestedKg).toBe(46);
    expect(overloadPlan(rows, "bench-press", "intermediate", undefined, "machine").suggestedKg).toBe(50);
  });

  it("기록이 없으면 none", () => {
    const p = overloadPlan([], "squat", "intermediate");
    expect(p.action).toBe("none");
    expect(p.suggestedKg).toBeNull();
    expect(p.reason).toBeTruthy();
  });

  it("기록이 하나면 같은 무게로 한 번 더 — 근거 없이 올리지 않는다", () => {
    const p = overloadPlan([rec(1, "squat", 5, 5, 100)], "squat", "intermediate");
    expect(p.action).toBe("first");
    expect(p.suggestedKg).toBe(100);
  });

  it("목표 횟수를 채웠으면 한 단계 올린다", () => {
    const p = overloadPlan(
      [
        rec(1, "squat", 5, SQUAT_TARGET, 100),
        rec(2, "squat", 5, SQUAT_TARGET, 105),
      ],
      "squat",
      "intermediate",
    );
    expect(p.action).toBe("increase");
    expect(p.suggestedKg).toBe(108); // 모든 중량 운동 → 2kg 단위
    expect(p.suggestedReps).toBe(SQUAT_TARGET);
    expect(p.reason).toContain("목표");
  });

  it("목표에 못 미치면 무게는 그대로 두고 횟수부터 채운다", () => {
    const p = overloadPlan(
      [
        rec(1, "squat", 5, SQUAT_TARGET - 4, 100),
        rec(2, "squat", 5, SQUAT_TARGET - 2, 105),
      ],
      "squat",
      "intermediate",
    );
    expect(p.action).toBe("add-reps");
    expect(p.suggestedKg).toBe(106);
    expect(p.suggestedReps).toBe(SQUAT_TARGET);
  });

  it("구버전 소수 중량 기록도 다음 추천에서는 2kg 정수로 보정한다", () => {
    const p = overloadPlan(
      [rec(1, "lateral-raise", 3, 10, 20.5)],
      "lateral-raise",
      "intermediate",
    );
    expect(p.suggestedKg).toBe(20);
    expect(Number.isInteger(p.suggestedKg)).toBe(true);
  });

  it("정체하면 디로드 — 무게를 낮춰 볼륨을 줄인다", () => {
    // 최고치 갱신 후 STALL_SESSIONS 만큼 제자리.
    const rows = [rec(1, "squat", 5, SQUAT_TARGET, 100)];
    for (let i = 0; i < STALL_SESSIONS; i++) {
      rows.push(rec(2 + i, "squat", 5, SQUAT_TARGET, 100));
    }
    const p = overloadPlan(rows, "squat", "intermediate");
    expect(p.action).toBe("deload");
    expect(p.stalledSessions).toBe(STALL_SESSIONS);
    // 100 × 0.9 = 90 → 2kg 단위
    expect(p.suggestedKg).toBe(Math.round((100 * DELOAD_RATIO) / 2) * 2);
    expect(needsAttention(p)).toBe(true);
  });

  it("디로드는 목표를 채웠어도 증량보다 우선한다 — 정체가 더 급한 신호다", () => {
    const rows = [rec(1, "squat", 5, SQUAT_TARGET, 100)];
    for (let i = 0; i < STALL_SESSIONS; i++) {
      rows.push(rec(2 + i, "squat", 5, SQUAT_TARGET, 100));
    }
    expect(overloadPlan(rows, "squat", "intermediate").action).not.toBe("increase");
  });

  it("오래 정체하면 쉬라고 한다(무게 제안 없음)", () => {
    const rows = [rec(1, "squat", 5, SQUAT_TARGET, 100)];
    for (let i = 0; i < REST_SESSIONS; i++) {
      rows.push(rec(2 + i, "squat", 5, SQUAT_TARGET, 100));
    }
    const p = overloadPlan(rows, "squat", "intermediate");
    expect(p.action).toBe("rest");
    expect(p.suggestedKg).toBeNull();
    expect(needsAttention(p)).toBe(true);
  });

  it("맨몸 종목은 무게 대신 횟수를 올린다", () => {
    const p = overloadPlan(
      [rec(1, "push-up", 3, 20, null), rec(2, "push-up", 3, 20, null)],
      "push-up",
      "intermediate",
    );
    expect(p.action).toBe("bodyweight");
    expect(p.suggestedKg).toBeNull();
    expect(p.suggestedReps).toBeGreaterThan(20);
  });

  it("시간(홀드) 종목은 시간을 늘리라고 한다", () => {
    const p = overloadPlan(
      [rec(1, "plank", 3, 40, null), rec(2, "plank", 3, 45, null)],
      "plank",
      "intermediate",
    );
    expect(p.action).toBe("bodyweight");
    expect(p.reason).toContain("시간");
  });

  it("모든 중량 운동은 2kg 단위 정수로 증량한다", () => {
    const light = overloadPlan(
      [
        rec(1, "lateral-raise", 3, 15, 10),
        rec(2, "lateral-raise", 3, 15, 12),
      ],
      "lateral-raise",
      "intermediate",
    );
    expect(light.action).toBe("increase");
    expect(light.suggestedKg).toBe(14);
    expect(loadClassLabel("lateral-raise")).toBe("고립 저중량");
    expect(loadClassLabel("squat")).toBe("복합 고중량");
  });

  it("목표 횟수를 밖에서 정하면(계획값) 그걸 따른다", () => {
    const p = overloadPlan(
      [rec(1, "squat", 5, 8, 100), rec(2, "squat", 5, 8, 100)],
      "squat",
      "intermediate",
      8,
    );
    expect(p.targetReps).toBe(8);
    expect(p.action).toBe("increase");
  });

  it("모든 결과에 사용자에게 보여줄 근거가 있다", () => {
    const cases = [
      overloadPlan([], "squat", "intermediate"),
      overloadPlan([rec(1, "squat", 5, 5, 100)], "squat", "intermediate"),
      overloadPlan(
        [rec(1, "squat", 5, SQUAT_TARGET, 100), rec(2, "squat", 5, SQUAT_TARGET, 105)],
        "squat",
        "intermediate",
      ),
      overloadPlan([rec(1, "push-up", 3, 20, null)], "push-up", "intermediate"),
    ];
    for (const p of cases) expect(p.reason.length).toBeGreaterThan(5);
  });

  it("경력에 따라 목표 횟수가 달라진다 — 처방과 같은 기준을 본다", () => {
    const rows = [rec(1, "squat", 5, 6, 100), rec(2, "squat", 5, 6, 100)];
    // 상급자 목표는 6회 → 채웠으니 증량. 중급자 목표는 10회 → 아직 횟수부터.
    expect(overloadPlan(rows, "squat", "advanced").action).toBe("increase");
    expect(overloadPlan(rows, "squat", "intermediate").action).toBe("add-reps");
  });
});

describe("증량 단위는 기록의 기구를 따른다 (화면마다 다른 값을 권하지 않게)", () => {
  /** 기구까지 담은 기록. */
  function recEq(
    day: number,
    exerciseId: string,
    weightKg: number,
    equipment: string | null,
  ): ProgressRecord {
    return {
      forDate: `2026-06-${String(day).padStart(2, "0")}`,
      exerciseId,
      status: "done",
      sets: 5,
      reps: targetReps(exerciseId, "advanced"),
      weightKg,
      setDetails: null,
      equipment,
    };
  }

  it("🔴 호출자가 기구를 안 넘겨도 마지막 기록의 기구로 단위를 정한다", () => {
    // 바벨 스쿼트 100 → 105, 둘 다 목표 충족 → 다음은 한 단계(바벨 5kg) 위.
    const records = [
      recEq(1, "squat", 100, "barbell"),
      recEq(8, "squat", 105, "barbell"),
    ];
    // 성장 그래프처럼 equipment 인자를 안 주는 호출.
    const plan = overloadPlan(records, "squat", "advanced");
    expect(plan.action).toBe("increase");
    expect(plan.suggestedKg).toBe(110);
  });

  it("기구를 명시하면 그쪽이 이긴다 — 오늘 덤벨로 할 거면 1kg 단위", () => {
    const records = [
      recEq(1, "goblet-squat", 20, "dumbbell"),
      recEq(8, "goblet-squat", 21, "dumbbell"),
    ];
    const plan = overloadPlan(records, "goblet-squat", "advanced", undefined, "dumbbell");
    expect(plan.action).toBe("increase");
    expect(plan.suggestedKg).toBe(22);
  });

  it("기록에도 인자에도 기구가 없으면 기본 단위(2kg)로 떨어진다", () => {
    const records = [
      recEq(1, "squat", 100, null),
      recEq(8, "squat", 105, null),
    ];
    const plan = overloadPlan(records, "squat", "advanced");
    // 바벨(5kg)이면 110 인데, 기구를 모르면 2kg 격자로 올라간다(105 → 108).
    expect(plan.suggestedKg).toBe(108);
    expect(plan.suggestedKg).not.toBe(110);
  });

  it("🔴 같은 기록이면 어느 화면에서 불러도 같은 값이 나온다", () => {
    const records = [
      recEq(1, "squat", 100, "barbell"),
      recEq(8, "squat", 105, "barbell"),
    ];
    // 운동모드(기구 넘김) vs 성장 그래프(안 넘김) — 이 둘이 갈리던 버그가 있었다.
    const fromWorkout = overloadPlan(records, "squat", "advanced", undefined, "barbell");
    const fromProgress = overloadPlan(records, "squat", "advanced");
    expect(fromProgress.suggestedKg).toBe(fromWorkout.suggestedKg);
    expect(fromProgress.action).toBe(fromWorkout.action);
  });
});
