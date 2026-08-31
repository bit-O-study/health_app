import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  loadDevices,
  notifyDevices,
} from "@/features/notifications/push-fanout";
import {
  splitAlreadySent,
  weeklyMvpKey,
} from "@/features/notifications/dedup";
import { loadSentKeys, markSent } from "@/features/notifications/sent-log";
import { chunk, mapWithConcurrency } from "@/lib/batch";
import { failureReason } from "@/lib/cron/run-log";
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

/** `.in(...)` 한 번에 넣을 최대 개수(PostgREST 는 GET 이라 URL 길이 제한이 있다). */
const IN_CHUNK = 100;
/** 발송 동시 실행 수. */
const SEND_CONCURRENCY = 8;

type ProfileRow = {
  user_id: string;
  name: string | null;
  nickname: string | null;
  weight_kg: number | string | null;
};
type ExRow = { user_id: string; exercise_id: string | null; sets: number | null };
type CondRow = {
  user_id: string;
  item_id: string | null;
  duration_min: number | null;
  speed: number | string | null;
};

/** id 묶음마다 조회해 한 배열로 합친다(대상이 많아도 URL 길이에 안 걸리게). */
async function batched<T>(
  idBatches: string[][],
  query: (ids: string[]) => PromiseLike<{ data: unknown }>,
): Promise<T[]> {
  const results = await Promise.all(idBatches.map((ids) => query(ids)));
  return results.flatMap((r) => (r.data ?? []) as T[]);
}

/** 배열을 키별로 묶는다(사용자별 기록 나누기용). */
function groupBy<T>(rows: T[], keyOf: (row: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) {
    const k = keyOf(r);
    const arr = out.get(k);
    if (arr) arr.push(r);
    else out.set(k, [r]);
  }
  return out;
}

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
 * - **같은 주 결과는 한 번만** 나간다 — 보낸 (사용자, 그룹, 주) 를 기록해 두고
 *   재실행 시 건너뛴다(월요일에 크론이 두 번 돌아도 랭킹 알림은 1회).
 * 서비스 롤 admin 클라이언트로 RLS 우회(모든 그룹/멤버 조회).
 */
export async function runWeeklyGroupMvp(
  admin: SupabaseClient,
  todayYmd: string = seoulYmd(),
): Promise<{
  groups: number;
  /** 실제로 푸시가 나간 사람 수(기기가 있어 발송된 대상). */
  notified: number;
  /** 중복 제외 후 발송을 시도한 대상 수. */
  targeted: number;
  deduped: number;
  failed: number;
  reason?: string;
}> {
  const thisWeek = weekRange(todayYmd);
  const from = addDaysYmd(thisWeek.from, -7);
  const to = addDaysYmd(thisWeek.from, -1);

  const { data: groups } = await admin.from("groups").select("id, name");
  const groupRows = (groups ?? []) as { id: string; name: string }[];
  if (groupRows.length === 0) return { groups: 0, notified: 0, targeted: 0, deduped: 0, failed: 0 };

  // 그룹마다 회원·프로필·기록을 다시 읽지 않는다 — 전체를 한 번에 읽어 메모리에서 나눈다.
  // (예전엔 그룹 수 × 4회 조회 + 회원별 직렬 푸시라, 그룹이 늘면 그대로 시간이 늘었다.
  //  여러 그룹에 든 사용자는 같은 완료 기록을 그룹 수만큼 반복해서 읽기까지 했다.)
  const { data: allMemberRows } = await admin
    .from("group_members")
    .select("group_id, user_id, display_name");
  const memberRowsByGroup = new Map<
    string,
    { user_id: string; display_name: string | null }[]
  >();
  const allMemberIds = new Set<string>();
  for (const m of (allMemberRows ?? []) as {
    group_id: string;
    user_id: string;
    display_name: string | null;
  }[]) {
    const arr = memberRowsByGroup.get(m.group_id) ?? [];
    arr.push({ user_id: m.user_id, display_name: m.display_name });
    memberRowsByGroup.set(m.group_id, arr);
    allMemberIds.add(m.user_id);
  }
  if (allMemberIds.size === 0) return { groups: 0, notified: 0, targeted: 0, deduped: 0, failed: 0 };

  const idBatches = chunk([...allMemberIds], IN_CHUNK);
  const [profileRows, exAll, condAll] = await Promise.all([
    batched<ProfileRow>(idBatches, (ids) =>
      admin
        .from("profiles")
        .select("user_id, name, nickname, weight_kg")
        .in("user_id", ids),
    ),
    batched<ExRow>(idBatches, (ids) =>
      admin
        .from("exercise_completions")
        .select("user_id, exercise_id, sets")
        .in("user_id", ids)
        .eq("status", "done")
        .gte("for_date", from)
        .lte("for_date", to),
    ),
    batched<CondRow>(idBatches, (ids) =>
      admin
        .from("conditioning_completions")
        .select("user_id, item_id, duration_min, speed")
        .in("user_id", ids)
        .eq("status", "done")
        .gte("for_date", from)
        .lte("for_date", to),
    ),
  ]);
  const exByUser = groupBy(exAll, (r) => r.user_id);
  const condByUser = groupBy(condAll, (r) => r.user_id);

  let groupsNotified = 0;
  let notified = 0;
  /** 그룹별 발송 대상(멤버 전원) — 기기 조회는 마지막에 한 번에 한다. */
  const pending: {
    userId: string;
    /** 중복 방지 키 — (그룹, 지난주) 단위. */
    key: string;
    groupName: string;
    rank: number;
    total: number;
    winner: string;
  }[] = [];

  for (const g of groupRows) {
    const members = memberRowsByGroup.get(g.id) ?? [];
    const memberIds = members.map((m) => m.user_id);
    if (memberIds.length === 0) continue;

    const memberIdSet = new Set(memberIds);
    const profiles = profileRows.filter((p) => memberIdSet.has(p.user_id));
    const exRows = memberIds.flatMap((id) => exByUser.get(id) ?? []);
    const condRows = memberIds.flatMap((id) => condByUser.get(id) ?? []);

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

    for (const m of ranking) {
      pending.push({
        userId: m.userId,
        key: weeklyMvpKey(g.id, from),
        groupName: g.name,
        rank: m.rank,
        total: ranking.length,
        winner: winner.name,
      });
    }
    if (ranking.length > 0) groupsNotified += 1;
  }

  // 이미 이번 주 결과를 받은 사람은 제외 — 월요일에 크론이 두 번 돌아도 1회만.
  const sentKeys = await loadSentKeys(admin, pending);
  const { fresh: targets, deduped } = splitAlreadySent(pending, sentKeys);

  // 발송 — 대상자 기기를 한 번에 읽고(사용자당 2회 조회 제거), 제한 동시성으로 병렬.
  const devices = await loadDevices(admin, [
    ...new Set(targets.map((t) => t.userId)),
  ]);
  let failed = 0;
  let firstFailure: string | undefined;
  const results = await mapWithConcurrency(
    targets,
    SEND_CONCURRENCY,
    async (p) => {
      const { title, body } = buildWeeklyMvpMessage(
        p.groupName,
        p.winner,
        p.rank,
        p.total,
      );
      // 웹푸시 + FCM(네이티브 앱) 양쪽으로. 한 명이 터져도 나머지는 계속(부분 실패 격리).
      try {
        return await notifyDevices(admin, devices.get(p.userId), {
          type: "weekly-mvp",
          title,
          body,
        });
      } catch (err) {
        failed += 1;
        firstFailure ??= failureReason(err);
        return false;
      }
    },
  );

  // 실제로 나간 것만 기록(기기가 없던 사람은 남기지 않는다).
  const delivered = targets.filter((_, i) => results[i]);
  await markSent(admin, delivered);
  notified = delivered.length;

  return {
    groups: groupsNotified,
    notified,
    targeted: targets.length,
    deduped,
    failed,
    ...(firstFailure ? { reason: firstFailure } : {}),
  };
}
