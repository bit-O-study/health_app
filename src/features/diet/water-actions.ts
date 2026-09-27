"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { WATER_MAX_ML } from "@/features/diet/water";

export type WaterActionResult =
  | { ok: true; ml: number }
  | { ok: false; error: string };

/**
 * 수분 섭취를 더하거나(컵 담기) 뺀다(되돌리기).
 *
 * 합산은 **DB 함수 한 문장**이 한다(`add_water_ml`) — 읽고 나서 쓰면 컵을 연타할 때
 * 요청 사이에 다른 요청이 끼어들어 한 잔이 조용히 사라진다.
 */
export async function addWaterAction(
  deltaMl: number,
  dateYmd?: string,
): Promise<WaterActionResult> {
  if (!Number.isFinite(deltaMl) || deltaMl === 0) {
    return { ok: false, error: "잘못된 값입니다." };
  }
  const delta = Math.round(Math.min(WATER_MAX_ML, Math.max(-WATER_MAX_ML, deltaMl)));

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const date =
    typeof dateYmd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateYmd)
      ? dateYmd
      : seoulYmd();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("add_water_ml", {
    p_date: date,
    p_delta: delta,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/diet");
  return { ok: true, ml: Number(data ?? 0) };
}

/* ── 기록 단위(2026-09-25) ───────────────────────────────────────────────
 * 하루 합계 한 숫자로는 되돌리기가 화면을 새로고침하면 끊기고, 언제 마셨는지도
 * 남지 않는다. 그래서 마신 기록을 하나씩 남기고 합계는 트리거가 맞춘다.
 */

export type WaterEntry = { id: string; ml: number; at: string };

export type WaterLogResult =
  | { ok: true; ml: number; entries: WaterEntry[] }
  | { ok: false; error: string };

/** 한 번에 담을 수 있는 양(ml) — 3L 짜리 통을 한 번에 기록하는 일은 없다. */
const MAX_ONE_ML = 3000;

async function readDay(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  date: string,
): Promise<{ ml: number; entries: WaterEntry[] }> {
  const { data } = await supabase
    .from("water_entries")
    .select("id, ml, at")
    .eq("user_id", userId)
    .eq("for_date", date)
    .order("at", { ascending: false });
  const entries = ((data ?? []) as { id: string; ml: number; at: string }[]).map(
    (r) => ({ id: r.id, ml: Number(r.ml), at: r.at }),
  );
  return { ml: entries.reduce((s, e) => s + e.ml, 0), entries };
}

/** 한 잔 기록 — 컵 버튼과 직접 입력이 같이 쓴다. */
export async function logWaterAction(
  ml: number,
  dateYmd?: string,
): Promise<WaterLogResult> {
  const amount = Math.round(Number(ml));
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_ONE_ML) {
    return { ok: false, error: `1~${MAX_ONE_ML}ml 사이로 입력해 주세요.` };
  }
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const date =
    typeof dateYmd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateYmd)
      ? dateYmd
      : seoulYmd();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("water_entries")
    .insert({ user_id: user.id, for_date: date, ml: amount });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/diet");
  revalidatePath("/commitments");
  return { ok: true, ...(await readDay(supabase, user.id, date)) };
}

/** 기록 하나 지우기 — 잘못 담았을 때. 합계는 트리거가 다시 맞춘다. */
export async function deleteWaterEntryAction(
  id: string,
  dateYmd?: string,
): Promise<WaterLogResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const date =
    typeof dateYmd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateYmd)
      ? dateYmd
      : seoulYmd();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("water_entries").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/diet");
  revalidatePath("/commitments");
  return { ok: true, ...(await readDay(supabase, user.id, date)) };
}
