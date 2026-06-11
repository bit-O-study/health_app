import { describe, expect, it } from "vitest";

import {
  CONDITIONING_PHOTO_DB,
  EXERCISE_PHOTO_DB,
  EXERCISE_PHOTO_DB_BY_EQUIP,
  conditioningPhotoFrames,
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

  it("예전에 사진이 없던 운동들도 이제 실사가 나온다", () => {
    // 마운틴 클라이머·토스 투 바 등 — 전엔 SVG 폴백이라 '안 보였던' 운동들(기본 매핑).
    for (const id of [
      "mountain-climber", "toes-to-bar", "v-up", "hollow-hold", "bicycle-crunch",
      "side-plank", "diamond-pushup", "cossack-squat", "belt-squat",
      "pendlay-row", "meadows-row", "wood-chopper", "hip-abduction", "triceps-kickback",
    ]) {
      expect(exercisePhotoFrames(id), id).not.toBeNull();
    }
    // 기구별 매핑만 있는 운동(기구 인자 필요).
    expect(exercisePhotoFrames("curtsy-lunge", "bodyweight"), "curtsy-lunge").not.toBeNull();
    expect(exercisePhotoFrames("sumo-squat", "dumbbell"), "sumo-squat").not.toBeNull();
    expect(exercisePhotoFrames("chest-supported-row", "machine"), "chest-supported-row").not.toBeNull();
    expect(exercisePhotoFrames("mountain-climber")![0]).toContain("/Mountain_Climbers/0.jpg");
    expect(exercisePhotoFrames("toes-to-bar")![0]).toContain("/Hanging_Leg_Raise/0.jpg");
  });

  it("매핑 없는 운동은 null → 호출부가 SVG 폴백", () => {
    expect(exercisePhotoFrames("nonexistent-exercise")).toBeNull();
    expect(exercisePhotoFrames("another-fake-id", "barbell")).toBeNull();
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

describe("기구별 시연 사진 (바벨/덤벨/머신이 서로 달라야)", () => {
  it("벤치프레스는 바벨/덤벨/머신이 모두 다른 사진", () => {
    const bb = exercisePhotoFrames("bench-press", "barbell")![0];
    const db = exercisePhotoFrames("bench-press", "dumbbell")![0];
    const mc = exercisePhotoFrames("bench-press", "machine")![0];
    expect(bb).toContain("/Barbell_Bench_Press_-_Medium_Grip/0.jpg");
    expect(db).toContain("/Dumbbell_Bench_Press_with_Neutral_Grip/0.jpg");
    expect(mc).toContain("/Machine_Bench_Press/0.jpg");
    expect(new Set([bb, db, mc]).size).toBe(3); // 셋 다 다름
  });

  it("스쿼트도 바벨/머신/맨몸이 다른 사진", () => {
    const slugs = (["barbell", "machine", "bodyweight"] as const).map(
      (eq) => exercisePhotoFrames("squat", eq)![0],
    );
    expect(slugs[0]).toContain("/Barbell_Squat/");
    expect(slugs[1]).toContain("/Smith_Machine_Squat/");
    expect(slugs[2]).toContain("/Bodyweight_Squat/");
    expect(new Set(slugs).size).toBe(3);
  });

  it("기구 전용 매핑이 없으면 운동 기본 매핑으로 폴백", () => {
    // deadlift 는 기구별 매핑이 없음 → 기본(Barbell_Deadlift)
    const withEq = exercisePhotoFrames("deadlift", "barbell")![0];
    const base = exercisePhotoFrames("deadlift")![0];
    expect(withEq).toBe(base);
    expect(withEq).toContain("/Barbell_Deadlift/");
  });

  it("기구 미지정이면 기존처럼 기본 매핑", () => {
    expect(exercisePhotoFrames("bench-press")![0]).toContain(
      `/${EXERCISE_PHOTO_DB["bench-press"]}/0.jpg`,
    );
  });

  it("한 운동의 기구별 슬러그는 서로 중복되지 않는다(같은 사진 금지)", () => {
    for (const [id, m] of Object.entries(EXERCISE_PHOTO_DB_BY_EQUIP)) {
      const slugs = Object.values(m);
      expect(new Set(slugs).size, `${id} 기구별 사진 중복`).toBe(slugs.length);
    }
  });
});

describe("워밍업·마무리 실사 시연 사진 (conditioningPhotoFrames)", () => {
  it("런닝·캣카우·보디웨이트 스쿼트는 실사 2프레임을 준다", () => {
    expect(conditioningPhotoFrames("running")![0]).toContain("/Running_Treadmill/0.jpg");
    expect(conditioningPhotoFrames("cat-cow")![1]).toContain("/Cat_Stretch/1.jpg");
    expect(conditioningPhotoFrames("bw-squat")![0]).toContain("/Bodyweight_Squat/0.jpg");
  });

  it("매핑 없는 컨디셔닝(데드행 등)은 null → 호출부가 모션 일러스트 폴백", () => {
    expect(conditioningPhotoFrames("dead-hang")).toBeNull();
    expect(conditioningPhotoFrames("wall-slide")).toBeNull();
    expect(conditioningPhotoFrames("sleeper-stretch")).toBeNull();
    expect(conditioningPhotoFrames("nonexistent")).toBeNull();
  });

  it("매핑 값은 모두 0/1 프레임 형식 + jsdelivr CDN", () => {
    for (const [id, db] of Object.entries(CONDITIONING_PHOTO_DB)) {
      const f = conditioningPhotoFrames(id);
      expect(f, id).not.toBeNull();
      expect(f![0]).toContain(`/${db}/0.jpg`);
      expect(f![1]).toContain(`/${db}/1.jpg`);
      expect(f![0]).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/gh\/yuhonas\/free-exercise-db/);
    }
  });
});
