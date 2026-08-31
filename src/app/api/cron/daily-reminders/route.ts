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
  loadSentKeys,
  markSent,
  purgeOldSends,
} from "@/features/notifications/sent-log";
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
    const { fresh: targets, deduped } = splitAlreadySent(all, sentKeys);

    // 대상자 기기를 한 번에 읽고(사용자당 2회 → 전체 몇 회), 발송은 제한 동시성으로.
    const devices = await loadDevices(
      admin,
      targets.map((t) => t.userId),
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

    // 실제로 나간 것만 기록 — 기기가 없던 사람은 남기지 않는다(기기 등록 후 받게).
    const delivered = targets.filter((_, i) => results[i]);
    await markSent(admin, delivered);
    await purgeOldSends(admin);

    return {
      counts: {
        scanned: rows.length,
        targeted: targets.length,
        sent: delivered.length,
        deduped,
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
