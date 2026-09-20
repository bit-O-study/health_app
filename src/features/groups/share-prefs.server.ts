import "server-only";

import { cache } from "react";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { resolveMemberName } from "@/features/groups/member-name";
import {
  DEFAULT_SHARE_PREFS,
  parseSharePrefs,
  type SharePrefs,
} from "@/features/groups/share-prefs";

/** 설정 화면 한 줄 — 나를 보는 트레이너 한 명(= 내가 속한 그룹 하나). */
export type TrainerConnection = {
  groupId: string;
  groupName: string;
  /** 그 그룹의 트레이너(그룹장) 이름. 못 찾으면 "트레이너". */
  trainerName: string;
  prefs: SharePrefs;
};

/**
 * **나를 보는 트레이너 목록.** 내가 그룹장인 그룹은 뺀다 — 자기 자신을 '제거' 할 수 없고,
 * 자기에게 정보 제공을 끊는다는 말도 성립하지 않는다.
 *
 * 왕복은 그룹 수와 무관하게 고정(멤버십 → 그룹 → 그룹장 이름 → 내 설정, 각 1회).
 */
export const getTrainerConnections = cache(
  async (): Promise<TrainerConnection[]> => {
    const user = await getCurrentUser();
    if (!user) return [];
    const supabase = await createSupabaseServerClient();

    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);
    const groupIds = ((memberships ?? []) as { group_id: string }[]).map(
      (m) => m.group_id,
    );
    if (groupIds.length === 0) return [];

    const { data: groups } = await supabase
      .from("groups")
      .select("id, name, owner_id")
      .in("id", groupIds);
    const rows = ((groups ?? []) as { id: string; name: string; owner_id: string }[])
      // 내가 그룹장인 그룹은 '나를 보는 트레이너' 가 아니다.
      .filter((g) => g.owner_id !== user.id);
    if (rows.length === 0) return [];

    // 그룹장 이름과 내 설정을 한 번에(그룹마다 물으면 그룹 수만큼 왕복이 는다).
    const [{ data: owners }, { data: prefRows }] = await Promise.all([
      supabase
        .from("group_members")
        .select("group_id, user_id, display_name")
        .in("group_id", rows.map((g) => g.id))
        .in("user_id", [...new Set(rows.map((g) => g.owner_id))]),
      supabase
        .from("member_share_prefs")
        .select("group_id, share_workout, share_diet, share_body, allow_prescription")
        .eq("user_id", user.id),
    ]);

    // 이름은 그룹 가입 스냅샷을 쓴다 — 회원이 그룹에서 보던 그 이름이어야 누군지 안다
    // (트레이너 코멘트 알림과 같은 규칙).
    const nameOf = new Map<string, string>();
    for (const o of (owners ?? []) as {
      group_id: string;
      user_id: string;
      display_name: string | null;
    }[]) {
      nameOf.set(`${o.group_id}:${o.user_id}`, resolveMemberName(null, null, o.display_name));
    }

    const prefOf = new Map<string, SharePrefs>();
    for (const r of (prefRows ?? []) as ({ group_id: string } & Record<string, unknown>)[]) {
      prefOf.set(r.group_id, parseSharePrefs(r));
    }

    return rows
      .map((g) => ({
        groupId: g.id,
        groupName: g.name,
        trainerName: nameOf.get(`${g.id}:${g.owner_id}`) ?? "트레이너",
        prefs: prefOf.get(g.id) ?? DEFAULT_SHARE_PREFS,
      }))
      .sort((a, b) => a.groupName.localeCompare(b.groupName, "ko"));
  },
);

/**
 * 한 그룹의 **회원별** 제공 설정(트레이너 화면이 가릴 항목을 정하는 데 쓴다).
 * 행이 없는 회원은 기본값(전부 제공). 그룹장만 읽을 수 있다(RLS).
 */
export async function getGroupSharePrefs(
  groupId: string,
): Promise<Map<string, SharePrefs>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("member_share_prefs")
    .select("user_id, share_workout, share_diet, share_body, allow_prescription")
    .eq("group_id", groupId);
  const out = new Map<string, SharePrefs>();
  for (const r of (data ?? []) as ({ user_id: string } & Record<string, unknown>)[]) {
    out.set(r.user_id, parseSharePrefs(r));
  }
  return out;
}

/**
 * **트레이너가 이 회원을 볼 때** 가려야 할 항목. 보는 사람이 그룹장이 아니면 null
 * (= 가리지 않는다 — 그룹원끼리 서로 보는 기능은 이 스위치의 대상이 아니다).
 *
 * 🔴 트레이너 전용 화면뿐 아니라 **트레이너가 열 수 있는 그룹원 상세**에도 적용해야 한다.
 *    한쪽만 막으면 "식단을 껐는데 트레이너가 회원 상세에서는 그대로 본다" 가 된다.
 */
export async function trainerMaskFor(
  groupId: string,
  memberId: string,
): Promise<SharePrefs | null> {
  const user = await getCurrentUser();
  if (!user || user.id === memberId) return null;
  const supabase = await createSupabaseServerClient();

  const { data: group } = await supabase
    .from("groups")
    .select("owner_id")
    .eq("id", groupId)
    .maybeSingle();
  if ((group as { owner_id: string } | null)?.owner_id !== user.id) return null;

  const { data } = await supabase
    .from("member_share_prefs")
    .select("share_workout, share_diet, share_body, allow_prescription")
    .eq("group_id", groupId)
    .eq("user_id", memberId)
    .maybeSingle();
  return parseSharePrefs(data);
}
