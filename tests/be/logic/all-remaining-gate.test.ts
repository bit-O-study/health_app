import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "gate-pose";
it("connects supported gate pose hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("keeps one leg straight, the other knee grounded and hand resting on thigh", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/gate/native/gate-pose/kinematics.json','utf8'));
 expect(r.staticHold).toBe(true);expect(r.kneeDegrees.L).toBeGreaterThan(179);expect(r.kneeDegrees.R).toBeCloseTo(90);
 expect(r.handThighGap).toBeGreaterThan(.001);expect(r.handThighGap).toBeLessThan(.04);
 for(const gap of [...r.supportGaps.feet,r.supportGaps.knee]){expect(gap).toBeGreaterThan(0);expect(gap).toBeLessThan(.07);}
});
