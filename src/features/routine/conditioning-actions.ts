"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ALL_FOCUSES,
  type FocusKey,
} from "@/features/routine/exercise-catalog";
import {
  defaultsFor,
  getConditioningItem,
  isConditioningKind,
  type ConditioningKind,
} from "@/features/routine/conditioning-catalog";

export type SaveConditioningResult =
  | { ok: true }
  | { ok: false; error: string };

export type ConditioningInput = {
  itemId: string;
  durationMin: number | null;
  speed: number | null;
  incline: number | null;
};

function isItemValidForKind(itemId: string, kind: ConditioningKind): boolean {
  const item = getConditioningItem(itemId);
  return !!item && item.kinds.includes(kind);
}

/** 특정 부위·종류의 컨디셔닝 항목 전체를 교체한다. */
export async function saveConditioningAction(
  focus: string,
  kind: string,
  items: ConditioningInput[],
): Promise<SaveConditioningResult> {
  if (!isConditioningKind(kind)) {
    return { ok: false, error: "워밍업/마무리 구분 값이 올바르지 않습니다." };
  }
  for (const it of items) {
    if (!isItemValidForKind(it.itemId, kind)) {
      return { ok: false, error: "선택한 항목이 이 종류와 맞지 않습니다." };
    }
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const del = await supabase
    .from("routine_conditioning")
    .delete()
    .eq("user_id", user.id)
    .eq("focus", focus)
    .eq("kind", kind);
  if (del.error) return { ok: false, error: del.error.message };

  if (items.length > 0) {
    const rows = items.map((it, index) => ({
      user_id: user.id,
      focus,
      kind,
      position: index,
      item_id: it.itemId,
      duration_min: it.durationMin,
      speed: it.speed,
      incline: it.incline,
    }));
    const ins = await supabase.from("routine_conditioning").insert(rows);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  revalidatePath("/");
  revalidatePath("/plan");
  return { ok: true };
}

/**
 * 모든 부위 × 워밍업/마무리를 기본 추천으로 채운다(기존 컨디셔닝 대체).
 * registerRecommendedPlanAction 과 함께 호출돼 한 번에 전부 세팅.
 */
export async function registerRecommendedConditioningAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const kinds: ConditioningKind[] = ["warmup", "cooldown"];
  const rows = ALL_FOCUSES.flatMap((focus: FocusKey) =>
    kinds.flatMap((kind) =>
      defaultsFor(focus, kind).map((itemId, index) => {
        const item = getConditioningItem(itemId);
        return {
          user_id: user.id,
          focus,
          kind,
          position: index,
          item_id: itemId,
          duration_min: item?.defaultMin ?? null,
          speed: item?.defaultSpeed ?? null,
          incline: item?.defaultIncline ?? null,
        };
      }),
    ),
  );

  await supabase
    .from("routine_conditioning")
    .delete()
    .eq("user_id", user.id);

  if (rows.length > 0) {
    await supabase.from("routine_conditioning").insert(rows);
  }

  revalidatePath("/");
  revalidatePath("/plan");
}
