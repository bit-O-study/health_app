import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "puppy-pose";
it("connects supported extended puppy pose hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("keeps hips above knees and supports forehead, knees and palms", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/puppy/native/puppy-pose/kinematics.json','utf8'));
 expect(r.staticHold).toBe(true);
 for(const angle of Object.values(r.kneeDegrees)){expect(angle).toBeGreaterThan(80);expect(angle).toBeLessThan(95);}
 expect(r.supportGaps.head).toBeCloseTo(.015);
 expect(r.supportGaps.palms).toBeLessThan(.04);
 for(const gap of r.supportGaps.knees){expect(gap).toBeGreaterThan(0);expect(gap).toBeLessThan(.04);}
});
