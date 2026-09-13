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
