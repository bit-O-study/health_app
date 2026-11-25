import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "chin-tuck";
it("connects chin retraction in both themes for bodyweight", async () => {
 expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
 expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
 expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("continuous");
});
it("retracts the head while keeping gaze level and body supported", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/chin-tuck/native/chin-tuck/kinematics.json','utf8'));
 expect(r.headTravel).toBeCloseTo(.36);expect(r.maxStep).toBeLessThan(.005);
 expect(r.levelGaze).toBe(true);expect(r.stationaryTorsoAndLimbs).toBe(true);
 expect(r.seatGap).toBeCloseTo(.015);expect(r.footGap).toBeCloseTo(.015);expect(r.loopError).toBe(0);
});
