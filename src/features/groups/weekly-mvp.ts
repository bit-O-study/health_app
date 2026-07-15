import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { notifyUser } from "@/features/notifications/push-fanout";
import {
  strengthKcalForCompletion,
  estimateConditioningKcal,
} from "@/features/routine/calories";
import { conditioningDefaults } from "@/features/routine/conditioning-catalog";
import { seoulYmd } from "@/features/routine/data";
import { resolveMemberName } from "@/features/groups/member-name";
import {
  rankMembers,
  weekRange,
  addDaysYmd,
  type MemberStat,
} from "@/features/groups/ranking";
import { buildWeeklyMvpMessage } from "@/features/groups/weekly-mvp-message";

const num = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** 랭킹에 필요한 최소 필드만 채운 MemberStat(나머지는 기본값). */
function baseStat(userId: string, name: string): MemberStat {
  return {
    userId,
    name,
    kcal: 0,
    workouts: 0,
    days: 0,
    todayIntake: 0,
    todayBurned: 0,
    todayPhotos: [],
    streak: 0,
    level: 0,
    isMe: false,
  };
}


/**
 * 지난주(월~일) 각 그룹의 운동 랭킹을 계산해, 멤버들에게 결과 푸시를 보낸다.
 * - 지난주 활동이 전혀 없는 그룹은 건너뛴다(스팸 방지).
 * - 매주 월요일 cron 에서 호출(지난주 = 오늘이 속한 주의 직전 주).
 * 서비스 롤 admin 클라이언트로 RLS 우회(모든 그룹/멤버 조회).
 */
export async function runWeeklyGroupMvp(
  admin: SupabaseClient,
  todayYmd: string = seoulYmd(),
): Promise<{ groups: number; notified: number }> {
  const thisWeek = weekRange(todayYmd);
  const from = addDaysYmd(thisWeek.from, -7);
  const to = addDaysYmd(thisWeek.from, -1);

  const { data: groups } = await admin.from("groups").select("id, name");
  let groupsNotified = 0;
  let notified = 0;

  for (const g of (groups ?? []) as { id: string; name: string }[]) {
    const { data: memberRows } = await admin
      .from("group_members")
      .select("user_id, display_name")
      .eq("group_id", g.id);
    const members = (memberRows ?? []) as {
      user_id: string;
      display_name: string | null;
    }[];
    const memberIds = members.map((m) => m.user_id);
    if (memberIds.length === 0) continue;

    const [{ data: profiles }, { data: exRows }, { data: condRows }] =
      await Promise.all([
        admin
          .from("profiles")
          .select("user_id, name, nickname, weight_kg")
          .in("user_id", memberIds),
        admin
          .from("exercise_completions")
          .select("user_id, exercise_id, sets")
          .in("user_id", memberIds)
          .eq("status", "done")
          .gte("for_date", from)
          .lte("for_date", to),
        admin
          .from("conditioning_completions")
          .select("user_id, item_id, duration_min, speed")
          .in("user_id", memberIds)
          .eq("status", "done")
          .gte("for_date", from)
          .lte("for_date", to),
      ]);

    const nameOf = new Map<string, string>();
    const weightOf = new Map<string, number>();
    const dispOf = new Map<string, string | null>();
    for (const m of members) dispOf.set(m.user_id, m.display_name);
    for (const p of (profiles ?? []) as {
      user_id: string;
      name: string | null;
      nickname: string | null;
      weight_kg: number | string | null;
    }[]) {
      nameOf.set(
        p.user_id,
        resolveMemberName(p.nickname, p.name, dispOf.get(p.user_id)),
      );
      weightOf.set(p.user_id, num(p.weight_kg) || 65);
    }

    const stats = new Map<string, MemberStat>();
    const ensure = (uid: string) => {
      let s = stats.get(uid);
      if (!s) {
        s = baseStat(uid, nameOf.get(uid) ?? resolveMemberName(null, null, dispOf.get(uid)));
        stats.set(uid, s);
      }
      return s;
    };
    for (const uid of memberIds) ensure(uid);

    let totalWorkouts = 0;
    for (const r of (exRows ?? []) as {
      user_id: string;
      exercise_id: string | null;
      sets: number | null;
    }[]) {
      if (!r.exercise_id) continue;
      const s = ensure(r.user_id);
      s.kcal += strengthKcalForCompletion(
        weightOf.get(r.user_id) ?? 65,
        r.exercise_id,
        num(r.sets),
      );
      s.workouts += 1;
      totalWorkouts += 1;
    }
    for (const r of (condRows ?? []) as {
      user_id: string;
      item_id: string | null;
      duration_min: number | null;
      speed: number | string | null;
    }[]) {
      if (!r.item_id) continue;
      const d = conditioningDefaults(r.item_id);
      const s = ensure(r.user_id);
      s.kcal += estimateConditioningKcal(
        weightOf.get(r.user_id) ?? 65,
        r.item_id,
        r.duration_min ?? d.durationMin,
        r.speed === null ? d.speed : num(r.speed),
      );
      s.workouts += 1;
      totalWorkouts += 1;
    }
    if (totalWorkouts === 0) continue; // 지난주 활동 없음 → 스킵

    for (const s of stats.values()) s.kcal = Math.round(s.kcal);
    const ranking = rankMembers([...stats.values()]);
    const winner = ranking[0];
    if (!winner) continue;

    let sentInGroup = false;
    for (const m of ranking) {
      const { title, body } = buildWeeklyMvpMessage(
        g.name,
        winner.name,
        m.rank,
        ranking.length,
      );
      // 웹푸시 + FCM(네이티브 앱) 양쪽으로.
      await notifyUser(admin, m.userId, {
        type: "weekly-mvp",
        title,
        body,
      });
      notified += 1;
      sentInGroup = true;
    }
    if (sentInGroup) groupsNotified += 1;
  }

  return { groups: groupsNotified, notified };
}
