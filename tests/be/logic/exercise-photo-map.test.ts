import { describe, expect, it } from "vitest";

import {
  EXERCISE_PHOTO_DB,
  exercisePhotoFrames,
} from "@/features/workout-timer/exercise-photo-map";

// 운동 id → free-exercise-db(퍼블릭도메인) 실사 2프레임 URL 매핑.

describe("exercisePhotoFrames", () => {
  it("스쿼트는 free-exercise-db Barbell_Squat 2프레임 URL을 준다", () => {
    const f = exercisePhotoFrames("squat");
    expect(f).not.toBeNull();
    expect(f).toHaveLength(2);
    expect(f![0]).toContain("/Barbell_Squat/0.jpg");
    expect(f![1]).toContain("/Barbell_Squat/1.jpg");
    expect(f![0]).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/gh\/yuhonas\/free-exercise-db/);
  });

  it("핵심 운동들이 매핑돼 있다", () => {
    for (const id of ["bench-press", "deadlift", "rdl", "ohp", "lat-pulldown", "leg-press"]) {
      expect(exercisePhotoFrames(id), id).not.toBeNull();
    }
  });

  it("매핑 없는 운동은 null → 호출부가 SVG 폴백", () => {
    expect(exercisePhotoFrames("v-up")).toBeNull(); // 오매칭이라 일부러 제외
    expect(exercisePhotoFrames("nonexistent-exercise")).toBeNull();
  });

  it("매핑 값은 모두 0/1 프레임이 존재하는 형식", () => {
    for (const [id, db] of Object.entries(EXERCISE_PHOTO_DB)) {
      const f = exercisePhotoFrames(id);
      expect(f, id).not.toBeNull();
      expect(f![0]).toContain(`/${db}/0.jpg`);
      expect(f![1]).toContain(`/${db}/1.jpg`);
    }
  });
});
