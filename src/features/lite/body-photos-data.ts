import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { resolvePlan } from "@/features/billing/plan-store";
import { isPose, type BodyCompAt, type BodyPhoto } from "@/features/lite/body-photos";
import type { PlanId } from "@/features/billing/plans";

export type BodyPhotoView = BodyPhoto & { url: string | null };
export type BodyPhotosView = {
  photos: BodyPhotoView[];
  plan: PlanId;
  /** 체성분 측정(비교 아래 '그 사이 변화'용, 오래된 → 최근). */
  comps: BodyCompAt[];
};

const num = (v: unknown) => (v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/** 볼 때만 여는 서명 URL — 10분. 목록이 길어도 한 번에 서명한다. */
const SIGN_SECONDS = 600;

/** 몸 사진 목록(최근 순) + 서명 URL. limit 를 주면 최근 몇 장만(리포트 카드). */
export async function loadBodyPhotos(limit = 200): Promise<BodyPhotosView | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const [{ data }, plan, comps] = await Promise.all([
    supabase
      .from("body_photos")
      .select("id, taken_on, pose, path")
      .eq("user_id", user.id)
      .order("taken_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit),
    resolvePlan(),
    supabase
      .from("body_compositions")
      .select("measured_at, weight_kg, skeletal_muscle_kg, body_fat_pct")
      .eq("user_id", user.id)
      .order("measured_at", { ascending: true })
      .limit(60),
  ]);
  const rows = ((data ?? []) as Record<string, unknown>[]).flatMap((r) =>
    isPose(r.pose) ? [{ id: String(r.id), takenOn: String(r.taken_on), pose: r.pose, path: String(r.path) }] : [],
  );
  let urls = new Map<string, string>();
  if (rows.length) {
    const signed = await supabase.storage.from("body-photos").createSignedUrls(
      rows.map((r) => r.path),
      SIGN_SECONDS,
    );
    urls = new Map(
      (signed.data ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])),
    );
  }
  return {
    photos: rows.map((r) => ({ ...r, url: urls.get(r.path) ?? null })),
    plan,
    comps: ((comps.data ?? []) as Record<string, unknown>[]).map((r) => ({
      date: String(r.measured_at),
      weightKg: num(r.weight_kg),
      muscleKg: num(r.skeletal_muscle_kg),
      fatPct: num(r.body_fat_pct),
    })),
  };
}

