import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  estimateStrengthKcal,
  estimateConditioningKcal,
} from "@/features/routine/calories";
import { conditioningDefaults } from "@/features/routine/conditioning-catalog";
import { seoulYmd } from "@/features/routine/data";
import { weekRange, rankMembers, type MemberStat, type RankedMember } from "@/features/groups/ranking";

const num = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export type GroupSummary = {
  id: string;
  name: string;
  inviteToken: string;
  isOwner: boolean;
  memberCount: number;
};

/** 내가 속한 그룹 목록. */
export async function getMyGroups(): Promise<GroupSummary[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();

  const { data: mem } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);
  const ids = (mem ?? []).map((r) => (r as { group_id: string }).group_id);
  if (ids.length === 0) return [];

  const [{ data: groups }, { data: allMem }] = await Promise.all([
    supabase.from("groups").select("id, name, owner_id, invite_token").in("id", ids),
    supabase.from("group_members").select("group_id").in("group_id", ids),
  ]);

  const counts = new Map<string, number>();
  for (const r of (allMem ?? []) as { group_id: string }[]) {
    counts.set(r.group_id, (counts.get(r.group_id) ?? 0) + 1);
  }

  return ((groups ?? []) as {
    id: string;
    name: string;
    owner_id: string;
    invite_token: string;
  }[])
    .map((g) => ({
      id: g.id,
      name: g.name,
      inviteToken: g.invite_token,
      isOwner: g.owner_id === user.id,
      memberCount: counts.get(g.id) ?? 1,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export type GroupDetail = {
  id: string;
  name: string;
  inviteToken: string;
  isOwner: boolean;
  weekFrom: string;
  weekTo: string;
  ranking: RankedMember[];
};

/** 그룹 상세 + 이번 주 운동 랭킹. 내가 멤버가 아니면 null. */
export async function getGroupDetail(groupId: string): Promise<GroupDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, owner_id, invite_token")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return null;
  const g = group as { id: string; name: string; owner_id: string; invite_token: string };

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, display_name")
    .eq("group_id", groupId);
  const memberRows = (members ?? []) as { user_id: string; display_name: string | null }[];
  const memberIds = memberRows.map((r) => r.user_id);
  if (!memberIds.includes(user.id)) return null; // 멤버 아님

  const today = seoulYmd();
  const { from, to } = weekRange(today);

  const [{ data: profiles }, { data: exRows }, { data: condRows }, { data: foodRows }] =
    await Promise.all([
      supabase.from("profiles").select("user_id, name, weight_kg").in("user_id", memberIds),
      supabase
        .from("exercise_completions")
        .select("user_id, for_date, exercise_id, sets")
        .in("user_id", memberIds)
        .eq("status", "done")
        .gte("for_date", from)
        .lte("for_date", to),
      supabase
        .from("conditioning_completions")
        .select("user_id, for_date, item_id, duration_min, speed")
        .in("user_id", memberIds)
        .eq("status", "done")
        .gte("for_date", from)
        .lte("for_date", to),
      supabase
        .from("food_logs")
        .select("user_id, kcal")
        .in("user_id", memberIds)
        .eq("for_date", today),
    ]);

  const nameOf = new Map<string, string>();
  const weightOf = new Map<string, number>();
  for (const r of memberRows) {
    if (r.display_name?.trim()) nameOf.set(r.user_id, r.display_name.trim());
  }
  for (const p of (profiles ?? []) as {
    user_id: string;
    name: string | null;
    weight_kg: number | string | null;
  }[]) {
    if (!nameOf.has(p.user_id)) nameOf.set(p.user_id, p.name?.trim() || "회원");
    weightOf.set(p.user_id, num(p.weight_kg) || 65);
  }

  // 오늘 섭취 kcal(식단 공유)
  const todayIntakeOf = new Map<string, number>();
  for (const r of (foodRows ?? []) as { user_id: string; kcal: number | string }[]) {
    todayIntakeOf.set(r.user_id, (todayIntakeOf.get(r.user_id) ?? 0) + num(r.kcal));
  }
  // 오늘 운동 소비 kcal (raw 누적)
  const todayBurnedOf = new Map<string, number>();
  const addToday = (uid: string, v: number) =>
    todayBurnedOf.set(uid, (todayBurnedOf.get(uid) ?? 0) + v);

  const stats = new Map<string, MemberStat>();
  const ensure = (uid: string): MemberStat => {
    let s = stats.get(uid);
    if (!s) {
      s = {
        userId: uid,
        name: nameOf.get(uid) ?? "회원",
        kcal: 0,
        workouts: 0,
        days: 0,
        todayIntake: 0,
        todayBurned: 0,
        isMe: uid === user.id,
      };
      stats.set(uid, s);
    }
    return s;
  };
  for (const uid of memberIds) ensure(uid);

  const daySet = new Map<string, Set<string>>();
  const markDay = (uid: string, date: string) => {
    let set = daySet.get(uid);
    if (!set) {
      set = new Set();
      daySet.set(uid, set);
    }
    set.add(date);
  };

  for (const r of (exRows ?? []) as {
    user_id: string;
    for_date: string;
    exercise_id: string | null;
    sets: number | null;
  }[]) {
    if (!r.exercise_id) continue;
    const s = ensure(r.user_id);
    const v = estimateStrengthKcal(weightOf.get(r.user_id) ?? 65, r.exercise_id, num(r.sets));
    s.kcal += v;
    s.workouts += 1;
    markDay(r.user_id, r.for_date);
    if (r.for_date === today) addToday(r.user_id, v);
  }
  for (const r of (condRows ?? []) as {
    user_id: string;
    for_date: string;
    item_id: string | null;
    duration_min: number | null;
    speed: number | string | null;
  }[]) {
    if (!r.item_id) continue;
    const d = conditioningDefaults(r.item_id);
    const s = ensure(r.user_id);
    const v = estimateConditioningKcal(
      weightOf.get(r.user_id) ?? 65,
      r.item_id,
      r.duration_min ?? d.durationMin,
      r.speed === null ? d.speed : num(r.speed),
    );
    s.kcal += v;
    s.workouts += 1;
    markDay(r.user_id, r.for_date);
    if (r.for_date === today) addToday(r.user_id, v);
  }

  for (const [uid, set] of daySet) ensure(uid).days = set.size;
  for (const s of stats.values()) {
    s.kcal = Math.round(s.kcal);
    s.todayIntake = Math.round(todayIntakeOf.get(s.userId) ?? 0);
    s.todayBurned = Math.round(todayBurnedOf.get(s.userId) ?? 0);
  }

  return {
    id: g.id,
    name: g.name,
    inviteToken: g.invite_token,
    isOwner: g.owner_id === user.id,
    weekFrom: from,
    weekTo: to,
    ranking: rankMembers([...stats.values()]),
  };
}
