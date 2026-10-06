import { describe, expect, it } from "vitest";
import { prepareCoachQuestion, DEFAULT_COACH_PREFERENCES } from "@/features/coach/manual-model";
import { buildAdviceMap } from "@/features/routine/overload-advice";
import { buildCoachReview, resolveReviewTargets } from "@/features/coach/workout-review";
import type { ProgressRecord } from "@/features/routine/progress";
const today = "2026-10-01";
const record = (forDate: string, exerciseId = "bench-press"): ProgressRecord => ({ forDate, exerciseId, status: "done", equipment: "barbell", sets: 3, reps: 8, weightKg: 40 });
describe("practical coaching requests", () => {
  it("preserves time, equipment and replacement target for the operator", () => {
    const result = prepareCoachQuestion("recommendation", "벤치가 사용 중이에요", { minutes: 20, equipment: "dumbbells", purpose: "alternative", exercise: "벤치프레스" });
    expect(result.error).toBeNull();
    if (result.error === null) { expect(result.question).toContain("20분"); expect(result.question).toContain("덤벨만"); expect(result.question).toContain("벤치프레스"); }
  });
  it.each([{ minutes: 999 }, { equipment: "constructor" }, { purpose: "__proto__" }, { exercise: null }])("rejects forged conditions %j", patch => {
    expect(prepareCoachQuestion("recommendation", "", { ...DEFAULT_COACH_PREFERENCES, ...patch }).error).toBeTruthy();
  });
  it("requires a target for replacement or plateau help", () => {
    expect(prepareCoachQuestion("recommendation", "", { ...DEFAULT_COACH_PREFERENCES, purpose: "plateau" }).error).toBeTruthy();
  });
  it("enforces the database limit after adding structured preferences", () => {
    expect(prepareCoachQuestion("recommendation", "가".repeat(2000), DEFAULT_COACH_PREFERENCES).error).toBeTruthy();
  });
  it("keeps existing clients and consultations compatible", () => {
    expect(prepareCoachQuestion("recommendation", "기존 요청")).toEqual({ error: null, question: "기존 요청" });
    expect(prepareCoachQuestion("consultation", "질문입니다", DEFAULT_COACH_PREFERENCES)).toEqual({ error: null, question: "질문입니다" });
  });
});
describe("read-only training review", () => {
  it("compares two equal seven-day windows, counts days once, excludes future/skipped rows", () => {
    const result = buildCoachReview([record("2026-09-25"), record("2026-09-25", "squat"), record("2026-10-01"), record("2026-09-18"), record("2026-09-24"), record("2026-09-17"), record("2026-10-02"), { ...record("2026-09-29"), status: "skipped" }], today, "beginner");
    expect(result.workoutDays).toBe(2); expect(result.previousDays).toBe(2); expect(result.from).toBe("2026-09-25");
  });
  it("does not invent weights or progress for empty data", () => {
    const result = buildCoachReview([], today, "beginner");
    expect(result.exercises).toEqual([]); expect(result.observation).toContain("기록이 없어요");
  });
  it("does not classify unknown exercises as core or suggest stale records", () => {
    const result = buildCoachReview([record("2026-10-01", "unknown"), record("2026-09-10")], today, "beginner");
    expect(result.exercises).toEqual([]); expect(result.check).not.toContain("코어");
  });
  it("keeps a missing profile from causing guessed prescriptions", () => {
    expect(buildCoachReview([record(today)], today, null).exercises).toEqual([]);
  });
  it("prioritizes existing plateau advice and does not mutate records", () => {
    const rows = [record("2026-09-25"), record("2026-09-27"), record("2026-09-29"), record("2026-10-01")];
    const snapshot = JSON.stringify(rows);
    const result = buildCoachReview(rows, today, "intermediate", undefined, [{ exerciseId: "bench-press", equipment: "barbell", targetReps: 8 }]);
    expect(result.exercises[0].attention).toBe(true);
    expect(result.check).toContain(result.exercises[0].reason);
    expect(JSON.stringify(rows)).toBe(snapshot);
  });
});
describe("cross-check prescriptions against the existing workout engine", () => {
  const plan = { exercise_id: "bench-press", equipment: "barbell", reps: 15 };
  it("uses the stored target, not a default or last achieved reps", () => {
    const rows = [{ ...record("2026-09-28"), weightKg: 35 }, record(today)];
    const targets = resolveReviewTargets([plan], []);
    const result = buildCoachReview(rows, today, "beginner", undefined, targets);
    const existing = buildAdviceMap(rows, targets, "beginner")["bench-press"];
    expect(result.exercises[0]).toMatchObject(existing);
    expect(result.exercises[0].suggestedKg).toBe(40);
    expect(result.exercises[0].suggestedReps).toBe(15);
    expect(result.exercises[0].action).toBe("add-reps");
  });
  it("gives today's override precedence without modifying the routine", () => {
    const routine = [plan]; const snapshot = JSON.stringify(routine);
    expect(resolveReviewTargets(routine, [{ ...plan, reps: 12 }])[0].targetReps).toBe(12);
    expect(JSON.stringify(routine)).toBe(snapshot);
  });
  it("does not guess between different day targets or per-set prescriptions", () => {
    expect(resolveReviewTargets([plan, { ...plan, reps: 8 }], [])).toEqual([]);
    expect(resolveReviewTargets([{ ...plan, set_details: [{ reps: 10, weightKg: 40 }] }], [])).toEqual([]);
  });
  it("does not combine dumbbell and barbell records or reuse stale equipment history", () => {
    const rows = [{ ...record("2026-09-27"), equipment: "dumbbell", weightKg: 10 }, record(today)];
    const result = buildCoachReview(rows, today, "beginner", undefined, resolveReviewTargets([plan], []));
    expect(result.exercises[0].action).toBe("first");
    const stale = [record("2026-09-05"), { ...record(today), equipment: "dumbbell" }];
    expect(buildCoachReview(stale, today, "beginner", undefined, resolveReviewTargets([plan], [])).exercises).toEqual([]);
  });
  it("shows no invented prescription when there is no stored plan", () => {
    expect(buildCoachReview([record(today)], today, "beginner").exercises).toEqual([]);
  });
});