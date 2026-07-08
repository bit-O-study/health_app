import { describe, expect, it } from "vitest";

import {
  reminderKindFor,
  REMINDER_PAYLOADS,
} from "@/features/notifications/daily-reminder";

describe("reminderKindFor — 하루 리마인더 판정", () => {
  it("휴식일 + 식단 미기록 → diet", () => {
    expect(
      reminderKindFor({ isRest: true, hasDiet: false, hasWorkout: false }),
    ).toBe("diet");
  });

  it("휴식일 + 식단 기록 있음 → null(안 보냄)", () => {
    expect(
      reminderKindFor({ isRest: true, hasDiet: true, hasWorkout: false }),
    ).toBeNull();
  });

  it("운동일 + 운동 미완료 → workout", () => {
    expect(
      reminderKindFor({ isRest: false, hasDiet: false, hasWorkout: false }),
    ).toBe("workout");
  });

  it("운동일 + 운동 완료 → null(안 보냄)", () => {
    expect(
      reminderKindFor({ isRest: false, hasDiet: false, hasWorkout: true }),
    ).toBeNull();
  });

  it("운동일엔 식단 기록 여부와 무관하게 운동만 본다", () => {
    expect(
      reminderKindFor({ isRest: false, hasDiet: true, hasWorkout: false }),
    ).toBe("workout");
    expect(
      reminderKindFor({ isRest: false, hasDiet: true, hasWorkout: true }),
    ).toBeNull();
  });

  it("휴식일엔 운동 완료 여부와 무관하게 식단만 본다", () => {
    expect(
      reminderKindFor({ isRest: true, hasDiet: false, hasWorkout: true }),
    ).toBe("diet");
  });
});

describe("REMINDER_PAYLOADS — 종류별 페이로드", () => {
  it("diet/workout 각각 title·body·url·type 을 갖는다", () => {
    for (const kind of ["diet", "workout"] as const) {
      const p = REMINDER_PAYLOADS[kind];
      expect(p.title).toBeTruthy();
      expect(p.body).toBeTruthy();
      expect(p.type).toContain("reminder");
      expect(p.url.startsWith("/")).toBe(true);
    }
  });

  it("diet 는 /diet, workout 은 /routine 으로 이동", () => {
    expect(REMINDER_PAYLOADS.diet.url).toBe("/diet");
    expect(REMINDER_PAYLOADS.workout.url).toBe("/routine");
  });
});