import "server-only";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { resolveMemberName } from "./member-name";
import { weekRange } from "./ranking";
import { TIERS, rankCompetitors, type PointBreakdown, type CompetitionSnapshot } from "./competition";

/** Always uses the caller's session and existing RLS, never a service-role client. */
export async function loadCompetition(groupId: string | null): Promise<CompetitionSnapshot | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = await createSupabaseServerClient();
  let members = [{ user_id: user.id, display_name: "나" as string | null }];
  if (groupId) {
    const membership = await db.from("group_members").select("user_id").eq("group_id", groupId).eq("user_id", user.id).maybeSingle();
    if (membership.error) throw new Error("그룹 권한을 확인하지 못했어요.");
    if (!membership.data) return null;
    const result = await db.from("group_members").select("user_id,display_name").eq("group_id", groupId);
    if (result.error) throw new Error("그룹원을 불러오지 못했어요.");
    members = result.data;
  }
  const ids = members.map(m => m.user_id), today = seoulYmd();
  const [totals, profiles] = await Promise.all([
    db.rpc("competition_totals", { p_group_id: groupId }),
    db.from("profiles").select("user_id,name,nickname").in("user_id", ids),
  ]);
  if (totals.error) throw new Error("운동 점수를 불러오지 못했어요.");
  if (profiles.error) throw new Error("그룹원 정보를 불러오지 못했어요.");
  const scores = new Map((totals.data as { user_id: string; week: PointBreakdown; today: PointBreakdown; lifetime: PointBreakdown }[]).map(r => [r.user_id, r]));
  let leagueGroupId = groupId;
  let leagueGroupName: string | undefined;
  if (!leagueGroupId) {
    const primary = await db.from("group_members").select("group_id").eq("user_id", user.id).order("joined_at").limit(1).maybeSingle();
    if (primary.error) throw new Error("리그를 불러오지 못했어요.");
    if (primary.data) {
      leagueGroupId = primary.data.group_id;
      const group = await db.from("groups").select("name").eq("id", leagueGroupId).maybeSingle();
      leagueGroupName = group.data?.name;
    }
  }
  const leagues = leagueGroupId ? await db.rpc("group_league_snapshot", { p_group_id: leagueGroupId }) : null;
  if (leagues?.error) throw new Error("리그를 불러오지 못했어요.");
  const leagueMap = new Map(((leagues?.data ?? []) as { user_id: string; tier: number; eligible_from: string; last_result: string | null; last_week: string | null }[]).map(r => [r.user_id, r]));
  const names = new Map(profiles.data.map(p => [p.user_id, p]));
  return { groupId, today, weekFrom: weekRange(today).from, members: rankCompetitors(members.map(m => {
    const p = names.get(m.user_id);
    const score = scores.get(m.user_id);
    const league = leagueMap.get(m.user_id);
    if (!score) throw new Error("그룹 구성이 변경됐어요. 다시 확인해 주세요.");
    return { userId: m.user_id, name: resolveMemberName(p?.nickname, p?.name, m.display_name), isMe: m.user_id === user.id, rank: 0,
      week: score.week, today: score.today, lifetime: score.lifetime, leagueGroupName,
      league: league ? { index: league.tier, name: TIERS[league.tier].name, icon: TIERS[league.tier].icon, eligibleFrom: league.eligible_from, lastResult: league.last_result, lastWeek: league.last_week } : undefined };
  })) };
}
