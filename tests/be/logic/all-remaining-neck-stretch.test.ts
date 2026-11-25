import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "neck-stretch";
it("connects the neck stretch as a hold in both themes", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("holds a lateral neck bend while the torso, seat and feet remain supported", () => {
  const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/neck-stretch/native/${id}/kinematics.json`, "utf8"));
  expect(r.staticHold).toBe(true);
  expect(r.stationaryUprightTorso).toBe(true);
  expect(r.headSideBendDegrees).toBe(20);
  expect(r.handShoulderGap).toBeGreaterThan(0.01);
  expect(r.handShoulderGap).toBeLessThan(0.06);
  for (const gap of [r.seatGap, r.footGap]) {
    expect(gap).toBeGreaterThan(0.01);
    expect(gap).toBeLessThan(0.02);
  }
});
