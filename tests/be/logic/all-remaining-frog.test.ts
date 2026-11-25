import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "frog-stretch";
it("connects wide-knee frog stretch hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("keeps bent knees spread and supports knees, feet, forearms and palms", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/frog/native/frog-stretch/kinematics.json','utf8'));
 expect(r.staticHold).toBe(true);
 for(const angle of Object.values(r.kneeDegrees)){expect(angle).toBeGreaterThan(80);expect(angle).toBeLessThan(95);}
 expect(r.supportGaps.forearms).toBeLessThan(.06);
 expect(r.supportGaps.foot).toBeLessThan(.06);
 expect(r.supportGaps.palms).toBeLessThan(.06);
 for(const gap of r.supportGaps.knees){expect(gap).toBeGreaterThan(0);expect(gap).toBeLessThan(.06);}
});
