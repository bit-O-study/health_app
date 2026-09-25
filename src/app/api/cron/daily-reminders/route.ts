import type { SupabaseClient } from "@supabase/supabase-js";

import {
  loadDevices,
  notifyDevices,
} from "@/features/notifications/push-fanout";
import {
  reminderKindFor,
  REMINDER_PAYLOADS,
  type ReminderKind,
} from "@/features/notifications/daily-reminder";
import {
  dailyReminderKey,
  splitAlreadySent,
} from "@/features/notifications/dedup";
import {
  balanceNudgeFor,
  isNudgeDay,
  weeklyBalanceKey,
  type BalancePayload,
} from "@/features/notifications/weekly-balance";
import { REGION_LIST, type Region } from "@/features/routine/score";
import { subMusclesForExercise } from "@/features/routine/muscle-detail";
import { parseSetDetails } from "@/features/routine/set-details";
import {
  addDays,
  setsByRegion,
  weekStartOf,
  type SetRecord,
} from "@/features/routine/training-volume";
import { REGION_LABEL_KO } from "@/features/routine/weekly-training-view";
import {
  loadSentKeys,
  markSent,
  purgeOldSends,
} from "@/features/notifications/sent-log";
import { purgeOldAppEvents } from "@/features/observability/purge";
import {
  filterByPreference,
  seoulHour,
} from "@/features/notifications/preferences";
import { loadPreferences } from "@/features/notifications/preferences-data";
import {
  DAY_BLOCKS,
  isDayBlockId,
  resolveRoutine,
  routineDayOffset,
  seoulYmd,
  type DayBlockId,
} from "@/features/routine/data";
import { fetchAllPages, mapWithConcurrency } from "@/lib/batch";
import { handleCron } from "@/lib/cron/handler";
import { failureReason } from "@/lib/cron/run-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 사용자별 발송 동시 실행 수(각 사용자 안에서 기기 발송이 또 병렬이라 과하지 않게). */
const USER_CONCURRENCY = 8;

type RoutineRow = {
  user_id: string;
  splits: number;
  variant_id: string;
  custom_week: unknown;
  start_date: string;
  rest_date: string | null;
  override_date: string | null;
  override_block: unknown;
};

/**
 * 하루 리마인더 cron — 하루 1회(저녁, KST 20시 ≈ UTC 11시) 호출.
 *
 * 각 사용자별로 오늘이 휴식일인지 운동일인지 판정한 뒤:
 * - 휴식일 + 식단 미기록 → "식단 적으세요" 푸시
 * - 운동일 + 본운동 미완료 → "운동하세요" 푸시
 * 이미 기록/완료했으면 아무것도 안 보낸다. (웹푸시라 앱 안 볼 때만 시스템 알림.)
 *
 * ⚠ 조회는 **사용자 수와 무관하게 고정 회수**로 한다. 예전엔 사용자마다
 * (식단/완료 1회 + 기기 존재 2회 + 발송 시 기기 2회) 를 직렬로 돌아서, 사용자가
 * 늘면 왕복만으로 크론 제한시간을 넘길 구조였다. 지금은 오늘 치 기록을 한 번에
 * 읽어 Set 으로 판정하고, 기기도 대상자 전체를 모아 읽는다.
 *
 * ⚠ **재실행해도 같은 사람에게 두 번 가지 않는다** — 보낸 사람은
 * `(user_id, 'daily-reminders:<종류>:<날짜>')` 로 기록해 두고 다음 실행에서 건너뛴다.
 * 날짜가 키에 있으므로 내일은 정상적으로 다시 나간다.
 *
 * 인증·실행기록(`cron_runs`)은 `handleCron` 이 담당한다.
 */
export async function GET(req: Request) {
  // Support recovery must not depend on workout push configuration.
  if (process.env.CRON_SECRET && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`) {
    const { supportMaintenance } = await import("@/features/support/messaging.server");
    await supportMaintenance().catch(() => undefined);
  }
  return handleCron(req, "daily-reminders", async (admin) => {
    const todayYmd = seoulYmd();

    const { data: routines } = await admin
      .from("user_routines")
      .select(
        "user_id, splits, variant_id, custom_week, start_date, rest_date, override_date, override_block",
      );
    const rows = (routines ?? []) as RoutineRow[];

    // 오늘 식단을 남긴 사용자 / 오늘 본운동을 완료한 사용자 — 각각 한 번에.
    // (행 상한에 잘리면 '기록 안 했다'고 오판해 잔소리 푸시가 나가므로 페이지로 끝까지 읽는다.)
    const [dietUsers, doneUsers] = await Promise.all([
      userIdSet(admin, "food_logs", todayYmd),
      userIdSet(admin, "exercise_completions", todayYmd, true),
    ]);

    // 누구에게 무엇을 보낼지 — 여기까지는 DB 없이 메모리 판정.
    const all: { userId: string; kind: ReminderKind; key: string }[] = [];
    for (const r of rows) {
      const isRest = isRestDay(r, todayYmd);
      const kind = reminderKindFor({
        isRest,
        hasDiet: dietUsers.has(r.user_id),
        hasWorkout: doneUsers.has(r.user_id),
      });
      if (kind) {
        all.push({
          userId: r.user_id,
          kind,
          key: dailyReminderKey(kind, todayYmd),
        });
      }
    }

    // 오늘 이미 받은 사람 제외 — 크론이 두 번 돌아도 잔소리는 하루 한 번.
    const sentKeys = await loadSentKeys(admin, all);
    const { fresh, deduped } = splitAlreadySent(all, sentKeys);

    // 알림 설정(종류별 동의·야간 방해 금지)으로 한 번 더 거른다(로드맵 3.1).
    // 설정이 없는 사용자는 기본값 = 받는다.
    const hour = seoulHour();
    const prefs = await loadPreferences(
      admin,
      fresh.map((t) => t.userId),
    );
    let optedOut = 0;
    const targets: typeof fresh = [];
    // 종류(운동/식단)가 섞여 있어 한 번에 못 거른다 — 종류별로 나눠 판단한다.
    for (const kind of ["workout", "diet"] as const) {
      const group = fresh.filter((t) => t.kind === kind);
      const res = filterByPreference(
        group,
        (t) => t.userId,
        prefs,
        kind === "workout" ? "workout-reminder" : "diet-reminder",
        hour,
      );
      targets.push(...res.allowed);
      optedOut += res.blocked;
    }

    // ── 토요일이면 주간 부위 균형도 같은 실행에서 판정한다(별도 cron 은 못 둔다 —
    //    Vercel Hobby 는 cron 두 개까지고 두 자리를 이미 쓰고 있다).
    //    🔴 **리마인더가 나갈 사람에게는 안 보낸다.** 저녁에 알림이 둘 연달아 뜨는 게
    //       사람들이 알림 자체를 꺼 버리는 바로 그 이유다. 마침 이 알림이 필요한 쪽도
    //       "나오고는 있는데 한쪽만 하는 사람" 이라 리마인더 대상과 겹치지 않는다.
    const balance = isNudgeDay(todayYmd)
      ? await balanceTargets(
          admin,
          todayYmd,
          new Set(targets.map((t) => t.userId)),
          hour,
        )
      : { targets: [] as BalanceTarget[], deduped: 0 };

    // 대상자 기기를 한 번에 읽고(사용자당 2회 → 전체 몇 회), 발송은 제한 동시성으로.
    const devices = await loadDevices(
      admin,
      [...targets, ...balance.targets].map((t) => t.userId),
    );
    let failed = 0;
    let firstFailure: string | null = null;
    const results = await mapWithConcurrency(
      targets,
      USER_CONCURRENCY,
      async (t) => {
        // 한 사람 발송이 터져도 나머지는 계속 보낸다(부분 실패 격리).
        try {
          return await notifyDevices(
            admin,
            devices.get(t.userId),
            REMINDER_PAYLOADS[t.kind],
          );
        } catch (err) {
          failed += 1;
          firstFailure ??= failureReason(err);
          return false;
        }
      },
    );

    const balanceResults = await mapWithConcurrency(
      balance.targets,
      USER_CONCURRENCY,
      async (t) => {
        try {
          return await notifyDevices(admin, devices.get(t.userId), t.payload);
        } catch (err) {
          failed += 1;
          firstFailure ??= failureReason(err);
          return false;
        }
      },
    );

    // 실제로 나간 것만 기록 — 기기가 없던 사람은 남기지 않는다(기기 등록 후 받게).
    const delivered = [
      ...targets.filter((_, i) => results[i]),
      ...balance.targets.filter((_, i) => balanceResults[i]),
    ];
    await markSent(admin, delivered);
    await purgeOldSends(admin);
    // 실사용 오류 기록도 같은 자리에서 보존기간을 넘긴 것만 정리한다(로드맵 1.3).
    await purgeOldAppEvents(admin);

    return {
      counts: {
        scanned: rows.length,
        targeted: targets.length + balance.targets.length,
        sent: delivered.length,
        // 설정으로 끈 사람도 '보내지 않음' 이라 중복제외와 같은 칸에 센다
        // (관리자 화면에서 "왜 안 갔나" 를 볼 때 둘 다 같은 성격이다).
        deduped: deduped + optedOut + balance.deduped,
        failed,
      },
      body: {
        date: todayYmd,
        scanned: rows.length,
        sent: delivered.length,
        deduped,
        failed,
        reason: firstFailure ?? undefined,
        skipped: rows.length - delivered.length,
      },
    };
  });
}

/** 오늘 해당 기록이 있는 사용자 id 집합. `doneOnly` 면 status=done 만. */
async function userIdSet(
  admin: SupabaseClient,
  table: "food_logs" | "exercise_completions",
  todayYmd: string,
  doneOnly = false,
): Promise<Set<string>> {
  const rows = await fetchAllPages<{ user_id: string }>((from, to) => {
    const q = admin
      .from(table)
      .select("user_id")
      .eq("for_date", todayYmd)
      .range(from, to);
    return doneOnly ? q.eq("status", "done") : q;
  });
  return new Set(rows.map((r) => r.user_id));
}

/** 오늘이 휴식일인지 — routine 페이지의 tone 판정과 동일 규칙(휴식전환/override 우선). */
function isRestDay(r: RoutineRow, todayYmd: string): boolean {
  if (r.rest_date === todayYmd) return true;

  if (r.override_date === todayYmd && isDayBlockId(r.override_block)) {
    return DAY_BLOCKS[r.override_block as DayBlockId].day.tone === "rest";
  }

  const { variant } = resolveRoutine(
    r.splits,
    r.variant_id,
    r.custom_week as never,
  );
  const offset = routineDayOffset(r.start_date, todayYmd);
  return variant.week[offset]?.tone === "rest";
}

type BalanceTarget = { userId: string; key: string; payload: BalancePayload };

/**
 * 토요일 주간 부위 균형 알림 대상 — "이번 주 하체를 아직 안 했어요".
 *
 * 판정은 점수 화면·트레이너 화면과 **같은 함수**(`setsByRegion`)를 쓴다. 알림이
 * "하체 0세트" 라고 했는데 앱을 열면 다른 숫자가 있으면 그 알림은 신뢰를 잃는다.
 *
 * @param skip 오늘 저녁 하루 리마인더가 나갈 사람들 — 두 번 보내지 않으려고 제외한다.
 */
async function balanceTargets(
  admin: SupabaseClient,
  todayYmd: string,
  skip: ReadonlySet<string>,
  hour: number,
): Promise<{ targets: BalanceTarget[]; deduped: number }> {
  const weekStart = weekStartOf(todayYmd);
  const weekEnd = addDays(weekStart, 6);

  // 이번 주 완료 기록을 한 번에 — 사용자마다 물으면 사람이 늘 때 왕복만으로 제한시간을 넘는다.
  const rows = await fetchAllPages<{
    user_id: string;
    for_date: string;
    exercise_id: string | null;
    focus: string | null;
    sets: number | null;
    set_details?: unknown;
  }>((from, to) =>
    admin
      .from("exercise_completions")
      .select("user_id, for_date, exercise_id, focus, sets, set_details")
      .eq("status", "done")
      .gte("for_date", weekStart)
      .lte("for_date", weekEnd)
      .range(from, to),
  );

  const byUser = new Map<string, SetRecord[]>();
  for (const r of rows) {
    if (skip.has(r.user_id)) continue;
    const list = byUser.get(r.user_id) ?? [];
    list.push({
      forDate: r.for_date,
      exerciseId: r.exercise_id,
      focus: r.focus,
      sets: r.sets,
      setDetails: parseSetDetails(r.set_details),
    });
    byUser.set(r.user_id, list);
  }

  const subsOf = (id: string) => subMusclesForExercise(id).map((s) => s.id);
  const key = weeklyBalanceKey(weekStart);
  const all: BalanceTarget[] = [];
  for (const [userId, records] of byUser) {
    const sets = setsByRegion(records, subsOf, weekStart, weekEnd);
    const payload = balanceNudgeFor({
      weekSets: REGION_LIST.reduce((sum, r) => sum + sets[r], 0),
      untouchedLabels: REGION_LIST.filter((r: Region) => sets[r] === 0).map(
        (r) => REGION_LABEL_KO[r],
      ),
    });
    if (payload) all.push({ userId, key, payload });
  }

  // 같은 주에 두 번 보내지 않는다 — 크론이 재실행돼도 주당 한 번.
  const { fresh, deduped } = splitAlreadySent(all, await loadSentKeys(admin, all));
  const { allowed, blocked } = filterByPreference(
    fresh,
    (t) => t.userId,
    await loadPreferences(
      admin,
      fresh.map((t) => t.userId),
    ),
    "weekly-balance",
    hour,
  );
  return { targets: allowed, deduped: deduped + blocked };
}
