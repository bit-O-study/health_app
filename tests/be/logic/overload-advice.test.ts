import { describe, expect, it } from "vitest";

import {
  ACTION_LABEL,
  buildAdviceMap,
  isApplicable,
  toAdvice,
} from "@/features/routine/overload-advice";
import { overloadPlan } from "@/features/routine/overload";
import type { ProgressRecord } from "@/features/routine/progress";
import { targetReps } from "@/features/routine/prescription";

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

const SQUAT_TARGET = targetReps("squat", "intermediate");

describe("toAdvice — 판단을 화면값으로", () => {
  it("기록이 없으면 null — 붙일 말이 없는데 빈 칸을 만들지 않는다", () => {
    expect(toAdvice(overloadPlan([], "squat", "intermediate"))).toBeNull();
  });

  it("말머리·근거·제안값을 그대로 옮긴다", () => {
    const plan = overloadPlan(
      [
        rec(1, "squat", 5, SQUAT_TARGET, 100),
        rec(2, "squat", 5, SQUAT_TARGET, 105),
      ],
      "squat",
      "intermediate",
    );
    const advice = toAdvice(plan)!;
    expect(advice.action).toBe("increase");
    expect(advice.label).toBe(ACTION_LABEL.increase);
    expect(advice.suggestedKg).toBe(plan.suggestedKg);
    expect(advice.suggestedReps).toBe(plan.suggestedReps);
    expect(advice.reason).toBe(plan.reason);
    expect(advice.exerciseId).toBe("squat");
  });

  it("정체·휴식은 강조 신호(attention)로 넘어온다", () => {
    const rows = [
      rec(1, "squat", 5, 3, 100),
      rec(2, "squat", 5, 3, 100),
      rec(3, "squat", 5, 3, 100),
      rec(4, "squat", 5, 3, 100),
    ];
    const advice = toAdvice(overloadPlan(rows, "squat", "intermediate"))!;
    expect(advice.attention).toBe(true);
  });

  it("증량은 강조가 아니다 — 잘 되고 있다는 신호다", () => {
    const advice = toAdvice(
      overloadPlan(
        [
          rec(1, "squat", 5, SQUAT_TARGET, 100),
          rec(2, "squat", 5, SQUAT_TARGET, 105),
        ],
        "squat",
        "intermediate",
      ),
    )!;
    expect(advice.attention).toBe(false);
  });

  it("서버 → 클라이언트로 넘어가는 값이라 원시값만 담는다", () => {
    const advice = toAdvice(
      overloadPlan([rec(1, "squat", 5, 5, 100)], "squat", "intermediate"),
    )!;
    // 함수·Map·Date 가 섞이면 서버 컴포넌트가 클라이언트로 못 넘긴다.
    expect(JSON.parse(JSON.stringify(advice))).toEqual(advice);
  });
});

describe("isApplicable — '적용' 버튼을 달 수 있는가", () => {
  it("넣을 값이 있으면 true", () => {
    const advice = toAdvice(
      overloadPlan(
        [
          rec(1, "squat", 5, SQUAT_TARGET, 100),
          rec(2, "squat", 5, SQUAT_TARGET, 105),
        ],
        "squat",
        "intermediate",
      ),
    )!;
    expect(isApplicable(advice)).toBe(true);
  });

  it("휴식 권장은 넣을 값이 없다 — 눌러도 아무 일이 없는 버튼을 만들지 않는다", () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      rec(i + 1, "squat", 5, 3, 100),
    );
    const advice = toAdvice(overloadPlan(rows, "squat", "intermediate"))!;
    expect(advice.action).toBe("rest");
    expect(isApplicable(advice)).toBe(false);
  });
});

describe("buildAdviceMap — 여러 종목을 한 번에", () => {
  const rows = [
    rec(1, "squat", 5, SQUAT_TARGET, 100),
    rec(2, "squat", 5, SQUAT_TARGET, 105),
    rec(3, "bench-press", 5, 5, 60),
  ];

  it("물어본 종목만 답한다", () => {
    const map = buildAdviceMap(rows, [{ exerciseId: "squat" }], "intermediate");
    expect(Object.keys(map)).toEqual(["squat"]);
  });

  it("기록이 없는 종목은 키 자체가 없다", () => {
    const map = buildAdviceMap(
      rows,
      [{ exerciseId: "squat" }, { exerciseId: "deadlift" }],
      "intermediate",
    );
    expect(map.deadlift).toBeUndefined();
    expect(map.squat).toBeDefined();
  });

  it("같은 종목이 여러 줄에 있어도 한 번만 판단한다", () => {
    const map = buildAdviceMap(
      rows,
      [{ exerciseId: "squat" }, { exerciseId: "squat" }],
      "intermediate",
    );
    expect(Object.keys(map)).toEqual(["squat"]);
  });

  it("빈 id 는 무시한다(편집 중 아직 안 고른 줄)", () => {
    const map = buildAdviceMap(rows, [{ exerciseId: "" }], "intermediate");
    expect(map).toEqual({});
  });

  it("계획이 시킨 횟수를 넘기면 그 기준으로 목표를 본다", () => {
    // 지난번 SQUAT_TARGET 회를 했다 → 처방 기준으로는 '목표 달성 → 증량'.
    // 계획이 더 많은 횟수를 시켰다면 아직 못 채운 것이라 '횟수 채우기'가 나와야 한다.
    const higher = buildAdviceMap(
      rows,
      [{ exerciseId: "squat", targetReps: SQUAT_TARGET + 4 }],
      "intermediate",
    );
    expect(higher.squat.action).toBe("add-reps");
    expect(higher.squat.suggestedReps).toBe(SQUAT_TARGET + 4);

    const dflt = buildAdviceMap(rows, [{ exerciseId: "squat" }], "intermediate");
    expect(dflt.squat.action).toBe("increase");
  });

  it("targetReps 가 null 이면 처방 기준으로 되돌아간다", () => {
    const map = buildAdviceMap(
      rows,
      [{ exerciseId: "squat", targetReps: null }],
      "intermediate",
    );
    expect(map.squat.action).toBe("increase");
  });

  it("경력에 따라 목표 횟수가 달라 판단도 갈린다 — 처방과 같은 기준을 본다", () => {
    const adv = buildAdviceMap(rows, [{ exerciseId: "squat" }], "advanced");
    const beg = buildAdviceMap(rows, [{ exerciseId: "squat" }], "beginner");
    // 목표가 낮은 쪽은 같은 기록으로도 '달성 → 증량'.
    expect(targetReps("squat", "advanced")).toBeLessThan(
      targetReps("squat", "beginner"),
    );
    expect(adv.squat.action).toBe("increase");
    expect(beg.squat.action).toBe("add-reps");
  });
});

describe("ACTION_LABEL — 모든 종류에 말머리가 있다", () => {
  it("기록 없음(none)만 빈 문자열", () => {
    for (const [action, label] of Object.entries(ACTION_LABEL)) {
      if (action === "none") expect(label).toBe("");
      else expect(label.length).toBeGreaterThan(0);
    }
  });
});
