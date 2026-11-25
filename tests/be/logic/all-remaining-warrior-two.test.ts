import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "warrior-ii-pose";
it("connects warrior two hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("keeps front knee above ankle, rear leg straight and heel grounded", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/warrior-two/native/warrior-ii-pose/kinematics.json','utf8'));
 expect(r.staticHold).toBe(true);expect(r.kneeDegrees.L).toBeCloseTo(90);expect(r.kneeDegrees.R).toBeGreaterThan(179);expect(Math.abs(r.supportGaps.rearAnkleLift)).toBeLessThan(.01);expect(r.supportGaps.rearHeel).toBeLessThan(.04);
 for(const gap of r.supportGaps.feet){expect(gap).toBeGreaterThan(0);expect(gap).toBeLessThan(.07);}
});
