"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyUser, notifyEnabled } from "@/features/notifications/push-fanout";
import { getUserProfile } from "@/features/profile/data-access";
import { isValidCheer, normalizeCheer } from "@/features/groups/cheers";
import { isChallengeMetric } from "@/features/groups/challenge";
import { applyDeposit } from "@/features/groups/gym";
import { cosmetic, isCosmeticSlot } from "@/features/groups/cosmetics";
import { weekRange } from "@/features/groups/ranking";
import { seoulYmd } from "@/features/routine/data";

export type GroupActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

/** 그룹 생성 — 생성자는 owner 멤버로 자동 가입. */
export async function createGroupAction(name: string): Promise<GroupActionResult> {
  const clean = name.trim().slice(0, 30);
  if (!clean) return { ok: false, error: "그룹 이름을 입력하세요." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase
    .from("groups")
    .insert({ name: clean, owner_id: user.id })
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "생성 실패" };
  const id = (data as { id: string }).id;

  const profile = await getUserProfile();
  const metaName =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
  const displayName = (
    profile?.nickname?.trim() ||
    profile?.name?.trim() ||
    metaName.trim() ||
    user.email?.split("@")[0] ||
    "회원"
  ).slice(0, 30);

  const { error: memErr } = await supabase
    .from("group_members")
    .insert({ group_id: id, user_id: user.id, role: "owner", display_name: displayName });
  if (memErr) return { ok: false, error: memErr.message };

  revalidatePath("/groups");
  return { ok: true, id };
}

/** 공유 링크 토큰으로 그룹 참여. */
export async function joinGroupByTokenAction(
  token: string,
): Promise<GroupActionResult> {
  const clean = token.trim();
  if (!clean) return { ok: false, error: "초대 코드가 없습니다." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase.rpc("join_group_by_token", { token: clean });
  if (error) return { ok: false, error: "유효하지 않은 초대 링크입니다." };

  revalidatePath("/groups");
  return { ok: true, id: data as string };
}

/** 그룹 나가기(본인 멤버십 삭제). */
export async function leaveGroupAction(groupId: string): Promise<GroupActionResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/groups");
  return { ok: true };
}

/**
 * 응원을 받은 그룹원에게 웹푸시 알림. 상대 구독 조회는 RLS(본인 전용)를 넘어야 해서
 * 서비스롤 admin 클라이언트를 쓴다. 실패해도 응원 자체엔 영향 없음(조용히 무시).
 */
async function notifyCheerRecipient(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  groupId: string,
  toUser: string,
  fromUserId: string,
): Promise<void> {
  try {
    if (!notifyEnabled()) return;
    const admin = createSupabaseAdminClient();
    if (!admin) return;
    // 상대가 보는 '보낸 사람 이름' = 그룹 가입 스냅샷(display_name).
    const { data: mem } = await supabase
      .from("group_members")
      .select("display_name")
      .eq("group_id", groupId)
      .eq("user_id", fromUserId)
      .maybeSingle();
    const fromName =
      ((mem as { display_name: string | null } | null)?.display_name ?? "").trim() ||
      "그룹원";

    // 웹푸시 + FCM(네이티브 앱) 양쪽으로 전송.
    await notifyUser(admin, toUser, {
      type: "group-cheer",
      title: "응원이 도착했어요 💪",
      body: `${fromName}님이 응원을 남겼습니다`,
      url: `/groups/${groupId}`,
    });
  } catch {
    /* 알림 실패는 무시 */
  }
}

/**
 * 응원 문구 남기기/수정 — 그날(오늘) 그룹원에게 10자 이내 한 마디. 하루 한 문구(수정 가능).
 * 빈 문구면 삭제. RLS 가 그룹원·본인 여부를 강제한다. 남기면 상대에게 푸시 알림.
 */
export async function setCheerAction(
  groupId: string,
  toUser: string,
  message: string,
): Promise<GroupActionResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (toUser === user.id) {
    return { ok: false, error: "내 기록엔 응원할 수 없어요." };
  }
  const forDate = seoulYmd();
  const msg = normalizeCheer(message);

  // 빈 문구 → 삭제(응원 취소).
  if (msg === "") {
    const { error } = await supabase
      .from("group_cheers")
      .delete()
      .eq("group_id", groupId)
      .eq("from_user", user.id)
      .eq("to_user", toUser)
      .eq("for_date", forDate);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/groups/${groupId}`);
    return { ok: true };
  }

  if (!isValidCheer(msg)) {
    return { ok: false, error: "응원은 10자 이내로 입력하세요." };
  }

  const { error } = await supabase.from("group_cheers").upsert(
    {
      group_id: groupId,
      from_user: user.id,
      to_user: toUser,
      for_date: forDate,
      message: msg,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "group_id,from_user,to_user,for_date" },
  );
  if (error) return { ok: false, error: error.message };

  await notifyCheerRecipient(supabase, groupId, toUser, user.id);

  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

/**
 * 이번 주 그룹 챌린지 설정/수정 — 그룹장만(RLS 강제). 주(week_from)당 하나로 upsert.
 */
export async function setGroupChallengeAction(
  groupId: string,
  metric: string,
  target: number,
): Promise<GroupActionResult> {
  if (!isChallengeMetric(metric)) {
    return { ok: false, error: "목표 종류가 올바르지 않습니다." };
  }
  const t = Math.floor(Number(target));
  if (!Number.isFinite(t) || t <= 0) {
    return { ok: false, error: "목표 값을 1 이상으로 입력하세요." };
  }
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { from } = weekRange(seoulYmd());
  const { error } = await supabase.from("group_challenges").upsert(
    {
      group_id: groupId,
      metric,
      target: t,
      week_from: from,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "group_id,week_from" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

/** 이번 주 챌린지 삭제 — 그룹장만(RLS 강제). */
export async function clearGroupChallengeAction(
  groupId: string,
): Promise<GroupActionResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { from } = weekRange(seoulYmd());
  const { error } = await supabase
    .from("group_challenges")
    .delete()
    .eq("group_id", groupId)
    .eq("week_from", from);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

/**
 * 그룹 펫에 코인 '넣기' — 모인 코인 중 원하는 만큼 다음 레벨에 투입한다. 투입한 코인이
 * 다음 레벨 비용을 채우면 자동으로 레벨업(넘친 만큼 다음 레벨로 이월). 그룹원 누구나.
 */
export async function depositCoinsAction(
  groupId: string,
  amount: number,
): Promise<GroupActionResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data } = await supabase
    .from("group_pets")
    .select("level, coins, progress")
    .eq("group_id", groupId)
    .maybeSingle();
  const level0 = (data as { level: number | null } | null)?.level ?? 0;
  const coins0 = (data as { coins: number | null } | null)?.coins ?? 0;
  const progress0 = (data as { progress: number | null } | null)?.progress ?? 0;

  const next = applyDeposit(level0, coins0, progress0, amount);
  if (next.added <= 0) {
    return { ok: false, error: "넣을 코인이 없어요. 운동으로 모아요!" };
  }

  const { error } = await supabase.from("group_pets").upsert(
    {
      group_id: groupId,
      level: next.level,
      coins: next.coins,
      progress: next.progress,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "group_id" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/groups`);
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

/** 상점에서 꾸미기 아이템 구매 — 코인 차감 + 보유목록 추가. 이미 있으면 성공 처리. */
export async function buyPetItemAction(
  groupId: string,
  itemId: string,
): Promise<GroupActionResult> {
  const item = cosmetic(itemId);
  if (!item) return { ok: false, error: "없는 아이템입니다." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data } = await supabase
    .from("group_pets")
    .select("coins, owned")
    .eq("group_id", groupId)
    .maybeSingle();
  const coins = (data as { coins: number | null } | null)?.coins ?? 0;
  const owned = Array.isArray((data as { owned?: unknown } | null)?.owned)
    ? ((data as { owned: string[] }).owned)
    : [];

  if (owned.includes(itemId)) return { ok: true };
  if (coins < item.price) {
    return { ok: false, error: "코인이 부족해요. 운동으로 모아요!" };
  }
  const { error } = await supabase.from("group_pets").upsert(
    {
      group_id: groupId,
      coins: coins - item.price,
      owned: [...owned, itemId],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "group_id" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

/** 꾸미기 착용/해제 — itemId null 이면 그 부위 벗기. 보유한 것만 착용. */
export async function equipPetItemAction(
  groupId: string,
  slot: string,
  itemId: string | null,
): Promise<GroupActionResult> {
  if (!isCosmeticSlot(slot)) return { ok: false, error: "잘못된 부위입니다." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data } = await supabase
    .from("group_pets")
    .select("owned, equipped")
    .eq("group_id", groupId)
    .maybeSingle();
  const owned = Array.isArray((data as { owned?: unknown } | null)?.owned)
    ? ((data as { owned: string[] }).owned)
    : [];
  const equipped: Record<string, string> =
    (data as { equipped?: unknown } | null)?.equipped &&
    typeof (data as { equipped: unknown }).equipped === "object"
      ? { ...((data as { equipped: Record<string, string> }).equipped) }
      : {};

  if (itemId) {
    const it = cosmetic(itemId);
    if (!it || it.slot !== slot) return { ok: false, error: "맞지 않는 부위예요." };
    if (!owned.includes(itemId)) return { ok: false, error: "먼저 구매해야 해요." };
    equipped[slot] = itemId;
  } else {
    delete equipped[slot];
  }
  const { error } = await supabase.from("group_pets").upsert(
    { group_id: groupId, equipped, updated_at: new Date().toISOString() },
    { onConflict: "group_id" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

/** 그룹 펫 이름 짓기(≤12자) — 그룹원 누구나. */
export async function setGroupPetNameAction(
  groupId: string,
  name: string,
): Promise<GroupActionResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { error } = await supabase.from("group_pets").upsert(
    { group_id: groupId, name: name.trim().slice(0, 12), updated_at: new Date().toISOString() },
    { onConflict: "group_id" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/groups`);
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

/** 그룹 삭제(소유자만 — RLS로 강제). */
export async function deleteGroupAction(groupId: string): Promise<GroupActionResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .eq("owner_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/groups");
  return { ok: true };
}
