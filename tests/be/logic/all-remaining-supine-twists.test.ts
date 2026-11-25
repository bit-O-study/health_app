import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["supine-spinal-twist", "reclined-spinal-twist"]) {
it("connects supine twist hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("holds a supported supine twist with bent knees stacked to one side", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/supine-twists/native/'+id+'/kinematics.json','utf8'));
 expect(r.staticHold).toBe(true);
 expect(r.kneeDegrees.L).toBeGreaterThan(88);
 expect(r.kneeDegrees.L).toBeLessThan(94);
 expect(r.kneeDegrees.R).toBeGreaterThan(88);
 expect(r.kneeDegrees.R).toBeLessThan(94);
 expect(r.kneeGap).toBeGreaterThan(.005);
 expect(r.kneeGap).toBeLessThan(.2);
 for (const gap of Object.values(r.supportGaps)) { expect(gap).toBeGreaterThan(0); expect(gap).toBeLessThan(.2); }
});
}
