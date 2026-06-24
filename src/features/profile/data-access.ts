import "server-only";

import { cache } from "react";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  isBodyType,
  isExperienceLevel,
  isGender,
  type BodyType,
  type ExperienceLevel,
  type Gender,
} from "@/features/profile/data";

export type UserProfile = {
  gender: Gender;
  experience: ExperienceLevel;
  heightCm: number | null;
  weightKg: number | null;
  bodyType: BodyType | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  /** 이름(성명) — 선택 입력 */
  name: string | null;
  /** 전화번호 — 선택 입력 */
  phone: string | null;
  /** 개인설정: 운동영상(가이드) 안 보기. true 면 운동 시작 시 영상 대신 타이머만. */
  hideExerciseVideos: boolean;
  /** 자세 잡기·자극 부위·핵심 포인트·초보 팁 상세 가이드 카드 표시. 기본 true. */
  showExerciseGuide: boolean;
  /** 휴식 종료 시 비프음. 기본 true. */
  restSound: boolean;
  /** 휴식 종료 시 진동(햅틱). 기본 true. */
  restHaptic: boolean;
  /** 무게·횟수를 미리 '고정'으로 정할지. 기본 false(끔) = 메인·편집·등록에서 숨기고
   *  운동모드에서 그때그때 설정. true 면 미리 정해 메인에 표시/수정(운동모드 조절 X). */
  lockWeightReps: boolean;
};

type ProfileRow = {
  gender: unknown;
  experience: unknown;
  height_cm: unknown;
  weight_kg: unknown;
  body_type: unknown;
  body_fat_pct: unknown;
  muscle_mass_kg: unknown;
  name: unknown;
  phone: unknown;
  hide_exercise_videos: unknown;
  show_exercise_guide: unknown;
  rest_sound: unknown;
  rest_haptic: unknown;
  lock_weight_reps: unknown;
};

/**
 * 현재 로그인 사용자의 온보딩 프로필을 반환합니다. 없으면 null.
 *
 * React.cache 로 한 요청 내 단 1회만 쿼리. 여러 server component 에서
 * 동시에 불러도 DB 콜은 1번.
 */
export const getUserProfile = cache(async (): Promise<UserProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "gender, experience, height_cm, weight_kg, body_type, body_fat_pct, muscle_mass_kg, name, phone, hide_exercise_videos, show_exercise_guide, rest_sound, rest_haptic, lock_weight_reps",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as ProfileRow;

  if (!isGender(row.gender) || !isExperienceLevel(row.experience)) {
    return null;
  }

  const n = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  };

  return {
    gender: row.gender,
    experience: row.experience,
    heightCm: n(row.height_cm),
    weightKg: n(row.weight_kg),
    bodyType: isBodyType(row.body_type) ? row.body_type : null,
    bodyFatPct: n(row.body_fat_pct),
    muscleMassKg: n(row.muscle_mass_kg),
    name: typeof row.name === "string" && row.name.trim() !== "" ? row.name : null,
    phone:
      typeof row.phone === "string" && row.phone.trim() !== "" ? row.phone : null,
    hideExerciseVideos: row.hide_exercise_videos === true,
    // 기본 true(컬럼 default) — 명시적으로 false 일 때만 끈다.
    showExerciseGuide: row.show_exercise_guide !== false,
    restSound: row.rest_sound !== false,
    restHaptic: row.rest_haptic !== false,
    // 기본 false(컬럼 default) — 명시적으로 true 일 때만 고정.
    lockWeightReps: row.lock_weight_reps === true,
  };
});
