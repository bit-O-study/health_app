import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "90-90-hip-stretch";
it("connects 90/90 hip stretch hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("keeps opposite hip rotations with right-angle knees and supported feet", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/ninety-hip/native/90-90-hip-stretch/kinematics.json','utf8'));
 expect(r.staticHold).toBe(true);
 for(const angle of Object.values(r.kneeDegrees)){expect(angle).toBeGreaterThan(88);expect(angle).toBeLessThan(92);}
 for(const gap of r.supportGaps.feet){expect(gap).toBeGreaterThan(.005);expect(gap).toBeLessThan(.15);}
 for(const gap of r.handThighGaps){expect(gap).toBeGreaterThan(.001);expect(gap).toBeLessThan(.03);}
});
