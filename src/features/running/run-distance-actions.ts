"use server";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { resolveMemberName } from "@/features/groups/member-name";
import type { RunRankMember } from "@/features/running/leaderboard";

/**
 * 오늘 달린 거리(m)를 누적한다(러닝 종료 시). 반환: 오늘 누적 총 m.
 * 너무 짧은(안 뛴) 세션은 호출측에서 거른다.
 */
export async function addRunDistanceAction(
  meters: number,
): Promise<{ ok: boolean; total?: number }> {
  const add = Math.max(0, Math.round(meters));
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();

  const { data } = await supabase
    .from("daily_run_distance")
    .select("meters")
    .eq("user_id", user.id)
    .eq("for_date", today)
    .maybeSingle();
  const total = Number((data as { meters?: number } | null)?.meters ?? 0) + add;

  const { error } = await supabase.from("daily_run_distance").upsert(
    {
      user_id: user.id,
      for_date: today,
      meters: total,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,for_date" },
  );
  if (error) return { ok: false };
  return { ok: true, total };
}

export type GroupRunLeaderboard = {
  groupId: string;
  groupName: string;
  members: RunRankMember[];
  myUserId: string;
};

/**
 * 내가 속한 (첫) 그룹의 '오늘 달린 거리' 순위 데이터. 그룹이 없으면 null.
 * 그룹원 거리는 RLS(shares_group_with)로 열람 가능.
 */
export async function getGroupRunLeaderboardAction(): Promise<GroupRunLeaderboard | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();

  // 내 첫 그룹.
  const { data: myMem } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .limit(1);
  const groupId = (myMem?.[0] as { group_id: string } | undefined)?.group_id;
  if (!groupId) return null;

  const [{ data: group }, { data: members }] = await Promise.all([
    supabase.from("groups").select("id, name").eq("id", groupId).maybeSingle(),
    supabase
      .from("group_members")
      .select("user_id, display_name")
      .eq("group_id", groupId),
  ]);
  if (!group) return null;

  const memberRows = (members ?? []) as {
    user_id: string;
    display_name: string | null;
  }[];
  const ids = memberRows.map((r) => r.user_id);
  if (ids.length === 0) return null;

  const today = seoulYmd();
  const [{ data: profiles }, { data: dist }] = await Promise.all([
    supabase.from("profiles").select("user_id, name, nickname").in("user_id", ids),
    supabase
      .from("daily_run_distance")
      .select("user_id, meters")
      .in("user_id", ids)
      .eq("for_date", today),
  ]);

  const dispOf = new Map<string, string | null>();
  for (const r of memberRows) dispOf.set(r.user_id, r.display_name);
  const nameOf = new Map<string, string>();
  for (const p of (profiles ?? []) as {
    user_id: string;
    name: string | null;
    nickname: string | null;
  }[]) {
    nameOf.set(
      p.user_id,
      resolveMemberName(p.nickname, p.name, dispOf.get(p.user_id)),
    );
  }
  const metersOf = new Map<string, number>();
  for (const r of (dist ?? []) as { user_id: string; meters: number }[]) {
    metersOf.set(r.user_id, Number(r.meters) || 0);
  }

  const runMembers: RunRankMember[] = ids.map((id) => ({
    userId: id,
    name: nameOf.get(id) ?? resolveMemberName(null, null, dispOf.get(id)),
    meters: metersOf.get(id) ?? 0,
  }));

  return {
    groupId,
    groupName: (group as { name: string }).name,
    members: runMembers,
    myUserId: user.id,
  };
}
