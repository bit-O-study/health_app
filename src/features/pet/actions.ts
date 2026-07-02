"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { roomItem, type RoomCat } from "@/features/pet/catalog";

export type PetActionResult = { ok: true } | { ok: false; error: string };

const MAX_DECOR = 8;

function revalidatePet() {
  revalidatePath("/pet");
  revalidatePath("/groups");
}

type PetState = {
  points: number;
  owned: string[];
  equipped: Record<string, unknown>;
};

async function loadState(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<PetState> {
  const { data } = await supabase
    .from("pets")
    .select("points, owned, equipped")
    .eq("user_id", userId)
    .maybeSingle();
  const d = data as {
    points?: number | null;
    owned?: unknown;
    equipped?: unknown;
  } | null;
  return {
    points: d?.points ?? 0,
    owned: Array.isArray(d?.owned) ? (d!.owned as string[]) : [],
    equipped:
      d?.equipped && typeof d.equipped === "object"
        ? { ...(d.equipped as Record<string, unknown>) }
        : {},
  };
}

async function save(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  patch: Partial<{ points: number; owned: string[]; equipped: Record<string, unknown> }>,
): Promise<PetActionResult> {
  const { error } = await supabase.from("pets").upsert(
    { user_id: userId, ...patch, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePet();
  return { ok: true };
}

/** 늑대 이름 지정(≤12자). */
export async function setPetNameAction(name: string): Promise<PetActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const supabase = await createSupabaseServerClient();
  return save(supabase, user.id, { name: name.trim().slice(0, 12) } as never);
}

/** 아이템 구매 — 포인트 차감 + 보유목록 추가. 무료(0P)/이미 보유는 성공 처리. */
export async function buyItemAction(itemId: string): Promise<PetActionResult> {
  const item = roomItem(itemId);
  if (!item) return { ok: false, error: "없는 아이템입니다." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const supabase = await createSupabaseServerClient();
  const st = await loadState(supabase, user.id);

  if (item.price === 0 || st.owned.includes(itemId)) return { ok: true };
  if (st.points < item.price) {
    return { ok: false, error: "포인트가 부족해요. 운동으로 모아보세요!" };
  }
  return save(supabase, user.id, {
    points: st.points - item.price,
    owned: [...st.owned, itemId],
  });
}

function canUse(st: PetState, itemId: string): boolean {
  const item = roomItem(itemId);
  return !!item && (item.price === 0 || st.owned.includes(itemId));
}

/** 벽지/바닥 적용 — 단일 슬롯. itemId null 이면 기본으로 되돌림(슬롯 비움). */
export async function equipRoomAction(
  cat: RoomCat,
  itemId: string | null,
): Promise<PetActionResult> {
  if (cat !== "wall" && cat !== "floor") {
    return { ok: false, error: "벽/바닥만 적용할 수 있어요." };
  }
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const supabase = await createSupabaseServerClient();
  const st = await loadState(supabase, user.id);

  if (itemId) {
    const item = roomItem(itemId);
    if (!item || item.cat !== cat) return { ok: false, error: "맞지 않는 아이템입니다." };
    if (!canUse(st, itemId)) return { ok: false, error: "먼저 구매해야 해요." };
    st.equipped[cat] = itemId;
  } else {
    delete st.equipped[cat];
  }
  return save(supabase, user.id, { equipped: st.equipped });
}

/** 소품 배치/치우기 토글 — 방에 최대 8개까지. */
export async function toggleDecorAction(
  itemId: string,
): Promise<PetActionResult> {
  const item = roomItem(itemId);
  if (!item || item.cat !== "decor") {
    return { ok: false, error: "소품이 아니에요." };
  }
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const supabase = await createSupabaseServerClient();
  const st = await loadState(supabase, user.id);
  if (!canUse(st, itemId)) return { ok: false, error: "먼저 구매해야 해요." };

  const decor = Array.isArray(st.equipped.decor)
    ? (st.equipped.decor as string[])
    : [];
  const next = decor.includes(itemId)
    ? decor.filter((x) => x !== itemId)
    : [...decor, itemId];
  if (next.length > MAX_DECOR) {
    return { ok: false, error: `소품은 최대 ${MAX_DECOR}개까지 놓을 수 있어요.` };
  }
  st.equipped.decor = next;
  return save(supabase, user.id, { equipped: st.equipped });
}
