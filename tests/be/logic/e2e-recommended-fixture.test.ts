import { afterEach, expect, it, vi } from "vitest";
import { prepareRecommendedExercises } from "../../e2e/helpers/recommended-fixture";

afterEach(() => vi.unstubAllEnvs());

it("refuses preparation without a valid run owner", async () => {
  vi.stubEnv("E2E_RUN_ID", "");
  await expect(prepareRecommendedExercises("person@example.com")).rejects.toThrow("owned by this E2E run");
});

it("refuses another run's test account before opening the DB", async () => {
  vi.stubEnv("E2E_RUN_ID", "a".repeat(32));
  await expect(prepareRecommendedExercises("e2e_" + "b".repeat(32) + "_account@example.com")).rejects.toThrow("owned by this E2E run");
});
