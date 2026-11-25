import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "sleeper-stretch";
it("connects sleeper stretch hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("supports the side-lying pelvis, feet and head with a 90-degree elbow and assisted wrist", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/sleeper/native/sleeper-stretch/kinematics.json','utf8'));
 expect(r.staticHold).toBe(true);
 expect(r.elbowDegrees).toBeCloseTo(90);
 expect(r.handContactGap).toBeGreaterThan(.005);
 expect(r.handContactGap).toBeLessThan(.05);
 for(const gap of Object.values(r.supportGaps)){expect(gap).toBeGreaterThan(.01);expect(gap).toBeLessThan(.025);}
});
