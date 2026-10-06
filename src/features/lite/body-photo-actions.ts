"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { resolvePlan } from "@/features/billing/plan-store";
import { isPose, photoLimitError, PHOTO_MAX_BASE64 } from "@/features/lite/body-photos";

export type BodyPhotoResult = { ok: true } | { ok: false; error: string };

const BUCKET = "body-photos";

/**
 * 몸 사진 올리기 — 기기에서 줄인 JPEG(base64)를 받아 **한도를 먼저 본 뒤** 내 폴더에 올리고 기록한다.
 * 처음 올릴 때는 동의(consent)가 있어야 한다(민감할 수 있는 사진).
 */
export async function addBodyPhotoAction(input: {
  base64: string;
  pose: string;
  takenOn: string;
  consent: boolean;
}): Promise<BodyPhotoResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };
  if (!isPose(input?.pose)) return { ok: false, error: "방향(앞·옆·뒤)을 골라 주세요." };
  const today = seoulYmd();
  const takenOn = /^\d{4}-\d{2}-\d{2}$/.test(String(input.takenOn)) && input.takenOn <= today ? input.takenOn : today;
  const base64 = typeof input.base64 === "string" ? input.base64 : "";
  if (!base64 || base64.length > PHOTO_MAX_BASE64) return { ok: false, error: "사진이 너무 커요. 다른 사진으로 해 주세요." };

  const supabase = await createSupabaseServerClient();
  const [plan, total, todayCount] = await Promise.all([
    resolvePlan(),
    supabase.from("body_photos").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("body_photos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00+09:00`),
  ]);
  if ((total.count ?? 0) === 0 && !input.consent) return { ok: false, error: "처음 올릴 때는 안내에 동의해 주세요." };
  const limit = photoLimitError(plan, total.count ?? 0, todayCount.count ?? 0);
  if (limit) return { ok: false, error: limit };

  const bytes = Buffer.from(base64, "base64");
  const path = `${user.id}/${Date.now()}-${input.pose}.jpg`;
  const up = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (up.error) return { ok: false, error: "사진을 올리지 못했어요. 잠시 후 다시 해 주세요." };
  const { error } = await supabase.from("body_photos").insert({ user_id: user.id, taken_on: takenOn, pose: input.pose, path });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, error: "사진을 저장하지 못했어요." };
  }
  revalidatePath("/settings/body-photos");
  revalidatePath("/fit");
  return { ok: true };
}

/** 사진 지우기 — 기록과 파일을 함께. */
export async function deleteBodyPhotoAction(id: string): Promise<BodyPhotoResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("body_photos").select("path").eq("id", id).eq("user_id", user.id).maybeSingle();
  const path = (data as { path?: string } | null)?.path;
  if (!path) return { ok: false, error: "사진을 찾지 못했어요." };
  await supabase.storage.from(BUCKET).remove([path]);
  const { error } = await supabase.from("body_photos").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: "지우지 못했어요." };
  revalidatePath("/settings/body-photos");
  revalidatePath("/fit");
  return { ok: true };
}

/** 탈퇴할 때 몸 사진은 바로 지운다(복구 대상 아님 — 민감할 수 있는 사진). 실패해도 탈퇴는 계속. */
export async function purgeMyBodyPhotos(): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("body_photos").select("path").eq("user_id", user.id);
    const paths = ((data ?? []) as { path: string }[]).map((r) => r.path);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    await supabase.from("body_photos").delete().eq("user_id", user.id);
  } catch {
    /* 탈퇴는 그대로 진행 */
  }
}
