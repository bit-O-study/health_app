"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SaveBodyCompResult = { ok: true } | { ok: false; error: string };

export type SaveBodyCompInput = {
  measuredAt: string; // YYYY-MM-DD
  consented: boolean;
  weightKg?: number | null;
  skeletalMuscleKg?: number | null;
  bodyFatKg?: number | null;
  bodyFatPct?: number | null;
  muscleRightArm?: number | null;
  muscleLeftArm?: number | null;
  muscleTrunk?: number | null;
  muscleRightLeg?: number | null;
  muscleLeftLeg?: number | null;
  fatRightArm?: number | null;
  fatLeftArm?: number | null;
  fatTrunk?: number | null;
  fatRightLeg?: number | null;
  fatLeftLeg?: number | null;
  imagePath?: string | null;
};

function inRange(
  v: number | null | undefined,
  lo: number,
  hi: number,
): { v: number | null; bad: boolean } {
  if (v === null || v === undefined) return { v: null, bad: false };
  const ok = Number.isFinite(v) && v >= lo && v <= hi;
  return { v: ok ? v : null, bad: !ok };
}

export async function saveBodyCompositionAction(
  input: SaveBodyCompInput,
): Promise<SaveBodyCompResult> {
  if (!input.consented) {
    return {
      ok: false,
      error: "민감정보(건강) 수집·이용 동의가 필요합니다.",
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.measuredAt)) {
    return { ok: false, error: "측정일이 올바르지 않습니다." };
  }

  // 범위 검증 — 모든 부위 0~80kg, 체지방율 1~70%, 체중 30~250kg
  const checks = [
    inRange(input.weightKg, 30, 250),
    inRange(input.skeletalMuscleKg, 5, 80),
    inRange(input.bodyFatKg, 0, 100),
    inRange(input.bodyFatPct, 1, 70),
    inRange(input.muscleRightArm, 0.5, 20),
    inRange(input.muscleLeftArm, 0.5, 20),
    inRange(input.muscleTrunk, 5, 60),
    inRange(input.muscleRightLeg, 1, 30),
    inRange(input.muscleLeftLeg, 1, 30),
    inRange(input.fatRightArm, 0, 10),
    inRange(input.fatLeftArm, 0, 10),
    inRange(input.fatTrunk, 0, 60),
    inRange(input.fatRightLeg, 0, 20),
    inRange(input.fatLeftLeg, 0, 20),
  ];
  if (checks.some((c) => c.bad)) {
    return { ok: false, error: "입력값 범위를 확인해 주세요." };
  }
  if (
    checks.every((c) => c.v === null) &&
    !input.imagePath
  ) {
    return { ok: false, error: "한 가지 이상 입력하거나 사진을 첨부해 주세요." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // 업로드된 이미지는 사용자 폴더(<userId>/) 안에 있어야 함
  if (input.imagePath && !input.imagePath.startsWith(`${user.id}/`)) {
    return { ok: false, error: "이미지 경로가 올바르지 않습니다." };
  }

  const { error } = await supabase.from("body_compositions").insert({
    user_id: user.id,
    measured_at: input.measuredAt,
    weight_kg: checks[0].v,
    skeletal_muscle_kg: checks[1].v,
    body_fat_kg: checks[2].v,
    body_fat_pct: checks[3].v,
    muscle_right_arm: checks[4].v,
    muscle_left_arm: checks[5].v,
    muscle_trunk: checks[6].v,
    muscle_right_leg: checks[7].v,
    muscle_left_leg: checks[8].v,
    fat_right_arm: checks[9].v,
    fat_left_arm: checks[10].v,
    fat_trunk: checks[11].v,
    fat_right_leg: checks[12].v,
    fat_left_leg: checks[13].v,
    image_path: input.imagePath ?? null,
  });

  if (error) return { ok: false, error: error.message };

  // 프로필의 체중/근육량/체지방률 최신값도 같이 갱신
  const patch: Record<string, number> = {};
  if (checks[0].v !== null) patch.weight_kg = checks[0].v;
  if (checks[1].v !== null) patch.muscle_mass_kg = checks[1].v;
  if (checks[3].v !== null) patch.body_fat_pct = checks[3].v;
  if (Object.keys(patch).length > 0) {
    await supabase.from("profiles").update(patch).eq("user_id", user.id);
  }

  revalidatePath("/settings/body-composition");
  revalidatePath("/settings/score");
  revalidatePath("/settings/profile");
  revalidatePath("/");
  return { ok: true };
}
