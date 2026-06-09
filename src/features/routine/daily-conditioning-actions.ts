"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  getConditioningItem,
  isConditioningKind,
  type ConditioningKind,
} from "@/features/routine/conditioning-catalog";
import type {
  ConditioningInput,
  SaveConditioningResult,
} from "@/features/routine/conditioning-actions";

/** YYYY-MM-DD 형식 간이 검증 */
function isValidYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** 특정 날짜·종류의 워밍업/마무리 오버라이드를 통째로 교체한다. */
export async function saveDailyConditioningAction(
  dateYmd: string,
  kind: string,
  items: ConditioningInput[],
): Promise<SaveConditioningResult> {
  if (!isValidYmd(dateYmd)) {
    return { ok: false, error: "날짜 형식이 올바르지 않습니다." };
  }
  if (!isConditioningKind(kind)) {
    return { ok: false, error: "워밍업/마무리 구분이 올바르지 않습니다." };
  }
  for (const it of items) {
    const item = getConditioningItem(it.itemId);
    if (!item || !item.kinds.includes(kind)) {
      return { ok: false, error: "선택한 항목이 이 종류와 맞지 않습니다." };
    }
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const del = await supabase
    .from("daily_conditioning")
    .delete()
    .eq("user_id", user.id)
    .eq("for_date", dateYmd)
    .eq("kind", kind);
  if (del.error) return { ok: false, error: del.error.message };

  if (items.length > 0) {
    const rows = items.map((it, index) => ({
      user_id: user.id,
      for_date: dateYmd,
      kind,
      position: index,
      item_id: it.itemId,
      duration_min: it.durationMin,
      speed: it.speed,
      incline: it.incline,
    }));
    const ins = await supabase.from("daily_conditioning").insert(rows);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  revalidatePath("/routine");
  revalidatePath("/plan/today");
  return { ok: true };
}

/** 특정 날짜·종류의 오버라이드를 제거해 기본값으로 되돌린다. */
export async function resetDailyConditioningAction(
  dateYmd: string,
  kind: ConditioningKind,
): Promise<void> {
  if (!isValidYmd(dateYmd) || !isConditioningKind(kind)) return;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return;

  await supabase
    .from("daily_conditioning")
    .delete()
    .eq("user_id", user.id)
    .eq("for_date", dateYmd)
    .eq("kind", kind);

  revalidatePath("/routine");
  revalidatePath("/plan/today");
}
