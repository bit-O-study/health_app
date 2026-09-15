import { describe, expect, it } from "vitest";

import { activityRings, WEEKLY_WORKOUT_GOAL_DAYS } from "@/features/home/activity-rings";

describe("activityRings — 홈 활동 링 3개", () => {
  const base = { workoutDays: 2, eatenKcal: 1275, targetKcal: 2550, commitDone: 1, commitTotal: 3 };

  it("운동·식단·다짐 순서로, 각자 비율을 계산한다", () => {
    const [w, d, c] = activityRings(base);
    expect([w.key, d.key, c.key]).toEqual(["workout", "diet", "commit"]);
    expect(w.pct).toBe(Math.round((2 / WEEKLY_WORKOUT_GOAL_DAYS) * 100));
    expect(d.pct).toBe(50);
    expect(c.pct).toBe(33);
  });

  it("값 글자는 사람이 읽는 형태", () => {
    const [w, d, c] = activityRings(base);
    expect(w.valueText).toBe(`2 / ${WEEKLY_WORKOUT_GOAL_DAYS}일`);
    expect(d.valueText).toBe("1,275 / 2,550kcal");
    expect(c.valueText).toBe("1 / 3");
  });

  it("100%를 넘으면 링은 한 바퀴에서 멈춘다(값 글자는 실제 수치)", () => {
    const [w, d] = activityRings({ ...base, workoutDays: 6, eatenKcal: 4000 });
    expect(w.pct).toBe(100);
    expect(d.pct).toBe(100);
    expect(w.valueText).toBe(`6 / ${WEEKLY_WORKOUT_GOAL_DAYS}일`);
  });

  it("기록이 없거나 목표가 0이면 0% — 나누기 오류 없음", () => {
    const [w, d, c] = activityRings({ workoutDays: 0, eatenKcal: 0, targetKcal: 0, commitDone: 0, commitTotal: 0 });
    expect([w.pct, d.pct, c.pct]).toEqual([0, 0, 0]);
    expect(c.valueText).toBe("없음");
  });

  it("주간 목표 일수를 바꿀 수 있다", () => {
    const [w] = activityRings({ ...base, weeklyGoalDays: 2 });
    expect(w.pct).toBe(100);
    expect(w.valueText).toBe("2 / 2일");
  });
});
