import { describe, expect, it } from "vitest";

import {
  PR_MIN_GAIN_KG,
  bestOneRmByExercise,
  checkNewRecord,
  newRecordMessage,
} from "@/features/routine/personal-record";

describe("지난 최고 예상 1RM", () => {
  it("운동별 최고를 고른다(세트별 기록이면 가장 센 세트)", () => {
    const best = bestOneRmByExercise([
      { forDate: "2026-09-20", exerciseId: "squat", status: "done", sets: 4, reps: 8, weightKg: 60 },
      {
        forDate: "2026-09-25", exerciseId: "squat", status: "done", sets: 3, reps: 5, weightKg: 70,
        setDetails: [{ weightKg: 70, reps: 5 }, { weightKg: 60, reps: 8 }],
      },
      { forDate: "2026-09-25", exerciseId: "push-up", status: "done", sets: 3, reps: 15, weightKg: null },
    ]);
    expect(best.squat).toBe(81.7); // 70 × (1 + 5/30)
    expect(best["push-up"]).toBeUndefined(); // 무게 없는 운동은 세지 않는다
  });

  it("건너뛴 기록은 빼고 센다", () => {
    expect(
      bestOneRmByExercise([{ forDate: "2026-09-20", exerciseId: "squat", status: "skipped", sets: 4, reps: 8, weightKg: 100 }]),
    ).toEqual({});
  });
});

describe("신기록 판정", () => {
  it("지난 최고보다 0.5kg 이상 높으면 신기록", () => {
    // 60×8 = 76 → 62.5×8 = 79.2
    expect(checkNewRecord(76, 62.5, 8)).toEqual({ oneRmKg: 79.2, gainKg: 3.2 });
  });

  it("같거나 조금(0.5kg 미만) 높으면 아니다", () => {
    expect(checkNewRecord(76, 60, 8)).toBeNull();
    expect(checkNewRecord(79, 62.5, 8)).toBeNull(); // +0.2
    expect(PR_MIN_GAIN_KG).toBe(0.5);
  });

  it("🔴 처음 하는 운동(지난 기록 없음)은 신기록이라 하지 않는다", () => {
    expect(checkNewRecord(undefined, 100, 5)).toBeNull();
    expect(checkNewRecord(0, 100, 5)).toBeNull();
  });

  it("무게가 없으면 판단하지 않는다", () => {
    expect(checkNewRecord(76, null, 20)).toBeNull();
  });

  it("알림 문구", () => {
    expect(newRecordMessage("스쿼트", { oneRmKg: 79.2, gainKg: 3.2 })).toBe("신기록! 스쿼트 예상 1RM 79.2kg (+3.2kg)");
  });
});
