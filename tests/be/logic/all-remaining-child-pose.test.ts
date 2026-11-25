import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "child-s-pose";
it("connects supported extended child pose hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("keeps bent knees, hips toward heels and supported forehead and palms", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/child-pose/native/child-s-pose/kinematics.json','utf8'));
 expect(r.staticHold).toBe(true);
 for(const angle of Object.values(r.kneeDegrees)){expect(angle).toBeGreaterThan(10);expect(angle).toBeLessThan(25);}
 for(const gap of r.heelHipGaps){expect(gap).toBeGreaterThan(.001);expect(gap).toBeLessThan(.2);}
 expect(r.supportGaps.head).toBeCloseTo(.015);
 expect(r.supportGaps.palms).toBeCloseTo(.015);
});
