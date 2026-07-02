"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { isValidCheer, normalizeCheer } from "@/features/groups/cheers";
import { isChallengeMetric } from "@/features/groups/challenge";
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
 * 응원 문구 남기기/수정 — 그날(오늘) 그룹원에게 10자 이내 한 마디. 하루 한 문구(수정 가능).
 * 빈 문구면 삭제. RLS 가 그룹원·본인 여부를 강제한다.
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
