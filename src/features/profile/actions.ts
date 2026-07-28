"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isBodyType,
  isExperienceLevel,
  isGender,
  type BodyMetrics,
  type BodyType,
  type ExperienceLevel,
  type Gender,
} from "@/features/profile/data";
import { goalTargetKind, isGoal, type Goal } from "@/features/profile/goal";
import { socialProfilePatch } from "@/features/auth/social-name";

export type SaveProfileResult = { ok: true } | { ok: false; error: string };

/** 운동 목표 + 목표치(선택). goal 만 있고 목표치는 종류에 맞는 것만 저장한다. */
export type GoalInput = {
  goal: Goal;
  targetWeightKg?: number | null;
  targetBodyFatPct?: number | null;
  targetMuscleKg?: number | null;
};

/**
 * 현재 사용자의 온보딩 프로필을 저장(없으면 생성, 있으면 갱신)합니다.
 * 가입 직후 온보딩 단계에서 호출됩니다. metrics 는 체형 단계에서 함께 전달.
 */
export async function saveProfileAction(
  gender: Gender,
  experience: ExperienceLevel,
  metrics?: BodyMetrics,
  goalInput?: GoalInput,
): Promise<SaveProfileResult> {
  if (!isGender(gender) || !isExperienceLevel(experience)) {
    return { ok: false, error: "성별/경력 값이 올바르지 않습니다." };
  }

  if (goalInput && !isGoal(goalInput.goal)) {
    return { ok: false, error: "목표 값이 올바르지 않습니다." };
  }

  if (metrics) {
    const okHeight =
      Number.isFinite(metrics.heightCm) &&
      metrics.heightCm >= 120 &&
      metrics.heightCm <= 230;
    const okWeight =
      Number.isFinite(metrics.weightKg) &&
      metrics.weightKg >= 30 &&
      metrics.weightKg <= 250;
    if (!okHeight || !okWeight || !isBodyType(metrics.bodyType)) {
      return { ok: false, error: "키·몸무게·체형 값이 올바르지 않습니다." };
    }
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  // 가입 시 user_metadata 에 담아둔 이름/닉네임/전화번호를 프로필로 복사(있을 때만).
  // 소셜(구글/카카오) 가입은 그 키가 없어서 공급자가 준 이름 키들까지 훑고(이름),
  // 닉네임을 따로 안 받으므로 **초기엔 닉네임 칸에도 같은 이름**을 넣는다
  // (socialProfilePatch). 이미 값이 있는 칸은 건드리지 않는다.
  const meta = (user.user_metadata ?? {}) as { phone?: unknown };
  const { data: current } = await supabase
    .from("profiles")
    .select("name, nickname")
    .eq("user_id", user.id)
    .maybeSingle();
  const namePatch = socialProfilePatch(
    meta as Record<string, unknown>,
    (current ?? {}) as { name?: string | null; nickname?: string | null },
  );
  const metaPhone =
    typeof meta.phone === "string" && meta.phone.trim() !== "" ? meta.phone.trim() : null;

  // 목표 + 목표치 — goal 종류에 맞는 목표치만 저장(나머지는 null).
  const num = (v: number | null | undefined): number | null =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
  const goalFields = goalInput
    ? (() => {
        const kind = goalTargetKind(goalInput.goal);
        return {
          goal: goalInput.goal,
          target_weight_kg: kind === "weight" ? num(goalInput.targetWeightKg) : null,
          target_body_fat_pct:
            kind === "bodyFat" ? num(goalInput.targetBodyFatPct) : null,
          target_muscle_kg: kind === "muscle" ? num(goalInput.targetMuscleKg) : null,
        };
      })()
    : {};

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      gender,
      experience,
      ...namePatch,
      ...(metaPhone ? { phone: metaPhone } : {}),
      ...(metrics
        ? {
            height_cm: metrics.heightCm,
            weight_kg: metrics.weightKg,
            body_type: metrics.bodyType,
          }
        : {}),
      ...goalFields,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/routine");
  return { ok: true };
}

/** 닉네임 저장(빈 값이면 해제). 그룹·마이페이지 공개 표시 이름. */
export async function updateNicknameAction(
  nickname: string,
): Promise<SaveProfileResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const clean = nickname.trim().slice(0, 20);
  const { error } = await supabase
    .from("profiles")
    .update({ nickname: clean || null })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/me");
  revalidatePath("/groups");
  return { ok: true };
}

/**
 * 개인설정: '운동영상 안 보기' on/off 저장. true 면 운동 시작 시 영상 가이드 대신
 * 타이머(중지/시작/저장)만 표시한다. /routine·/settings 화면을 무효화해 즉시 반영.
 */
export async function setHideExerciseVideosAction(
  hide: boolean,
): Promise<SaveProfileResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("profiles")
    .update({ hide_exercise_videos: hide })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/routine");
  revalidatePath("/settings");
  revalidatePath("/settings/personal");
  return { ok: true };
}

/** 개인설정 boolean 토글 — 화이트리스트한 컬럼만 갱신(임의 컬럼 주입 차단). */
const PERSONAL_BOOL_COLUMNS = {
  showExerciseGuide: "show_exercise_guide",
  restSound: "rest_sound",
  restHaptic: "rest_haptic",
  lockWeightReps: "lock_weight_reps",
} as const;

export type PersonalBoolKey = keyof typeof PERSONAL_BOOL_COLUMNS;

/**
 * 개인설정 토글 저장(동작 흐름·상세 가이드·휴식 소리·휴식 진동).
 * key 는 화이트리스트로만 받아 임의 컬럼 업데이트를 막는다.
 */
export async function setPersonalPrefAction(
  key: PersonalBoolKey,
  value: boolean,
): Promise<SaveProfileResult> {
  const column = PERSONAL_BOOL_COLUMNS[key];
  if (!column) return { ok: false, error: "알 수 없는 설정입니다." };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("profiles")
    .update({ [column]: value })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/routine");
  revalidatePath("/settings");
  revalidatePath("/settings/personal");
  return { ok: true };
}

export type BodyLogInput = {
  weightKg?: number | null;
  heightCm?: number | null;
  bodyFatPct?: number | null;
  muscleMassKg?: number | null;
  bodyType?: BodyType | null;
};

function clamp(
  v: number | null | undefined,
  lo: number,
  hi: number,
): { v: number | null; bad: boolean } {
  if (v === null || v === undefined) return { v: null, bad: false };
  const ok = Number.isFinite(v) && v >= lo && v <= hi;
  return { v: ok ? v : null, bad: !ok };
}

/**
 * 메인/설정에서 체형 지표(몸무게·키·체지방률·근육량)를 기록한다.
 * 입력된 항목만 weight_logs 에 누적하고 profiles 의 해당 값도 최신으로 갱신.
 */
export async function logBodyAction(
  input: BodyLogInput,
): Promise<SaveProfileResult> {
  const w = clamp(input.weightKg, 30, 250);
  const h = clamp(input.heightCm, 120, 230);
  const f = clamp(input.bodyFatPct, 1, 70);
  const m = clamp(input.muscleMassKg, 5, 120);

  if (w.bad || h.bad || f.bad || m.bad) {
    return { ok: false, error: "입력값 범위를 확인해 주세요." };
  }
  const bodyType =
    input.bodyType == null
      ? null
      : isBodyType(input.bodyType)
        ? input.bodyType
        : false;
  if (bodyType === false) {
    return { ok: false, error: "체형 값이 올바르지 않습니다." };
  }
  if (
    w.v === null &&
    h.v === null &&
    f.v === null &&
    m.v === null &&
    bodyType === null
  ) {
    return { ok: false, error: "한 가지 이상 입력해 주세요." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const log = await supabase.from("weight_logs").insert({
    user_id: user.id,
    weight_kg: w.v,
    height_cm: h.v,
    body_fat_pct: f.v,
    muscle_mass_kg: m.v,
  });
  if (log.error) return { ok: false, error: log.error.message };

  const patch: Record<string, number | string> = {};
  if (w.v !== null) patch.weight_kg = w.v;
  if (h.v !== null) patch.height_cm = h.v;
  if (f.v !== null) patch.body_fat_pct = f.v;
  if (m.v !== null) patch.muscle_mass_kg = m.v;
  if (bodyType !== null) patch.body_type = bodyType;
  if (Object.keys(patch).length > 0) {
    await supabase.from("profiles").update(patch).eq("user_id", user.id);
  }

  revalidatePath("/routine");
  revalidatePath("/settings/profile");
  return { ok: true };
}
