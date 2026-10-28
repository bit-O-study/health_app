"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { getFitAccess } from "@/features/routine/fit-access";
import { toUserError } from "@/lib/user-error";

export type OrderActionResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 운동 순서 정리(라이트, 2026-10-28) — 오늘만 이 순서로. user_routines.today_order 에 날짜와 함께 둔다.
 * routine_exercises·daily_plan 의 position 은 건드리지 않는다(원칙 #2 — 내일은 원래 순서).
 */
export async function applyTodayOrderAction(ids: string[]): Promise<OrderActionResult> {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 80 || !ids.every((id) => typeof id === "string" && UUID.test(id))) {
    return { ok: false, error: "순서를 확인하지 못했어요. 새로고침 후 다시 해 주세요." };
  }
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  // 화면이 잠금을 보여도 서버에서 한 번 더 — 라이트 이상만.
  const access = await getFitAccess();
  if (!access.full) return { ok: false, error: "순서 정리는 라이트에서 쓸 수 있어요." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("user_routines")
    .update({ today_order_date: seoulYmd(), today_order: ids })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: toUserError(error) };
  revalidatePath("/routine");
  return { ok: true };
}

/** 오늘 정한 순서를 지우고 원래(루틴) 순서로. */
export async function clearTodayOrderAction(): Promise<OrderActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("user_routines")
    .update({ today_order_date: null, today_order: null })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: toUserError(error) };
  revalidatePath("/routine");
  return { ok: true };
}
