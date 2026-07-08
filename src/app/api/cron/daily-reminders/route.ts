import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendPush, pushEnabled } from "@/features/notifications/push";
import {
  reminderKindFor,
  REMINDER_PAYLOADS,
  type ReminderKind,
} from "@/features/notifications/daily-reminder";
import {
  DAY_BLOCKS,
  isDayBlockId,
  resolveRoutine,
  routineDayOffset,
  seoulYmd,
  type DayBlockId,
} from "@/features/routine/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
type SubRow = { endpoint: string; p256dh: string; auth: string };

/**
 * 하루 리마인더 cron — 하루 1회(저녁, KST 20시 ≈ UTC 11시) 호출.
 *
 * 각 사용자별로 오늘이 휴식일인지 운동일인지 판정한 뒤:
 * - 휴식일 + 식단 미기록 → "식단 적으세요" 푸시
 * - 운동일 + 본운동 미완료 → "운동하세요" 푸시
 * 이미 기록/완료했으면 아무것도 안 보낸다. (웹푸시라 앱 안 볼 때만 시스템 알림.)
 *
 * 보호: Vercel Cron 은 `Authorization: Bearer <CRON_SECRET>` 헤더를 보낸다.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin || !pushEnabled()) {
    return NextResponse.json(
      { ok: false, reason: "push/admin not configured" },
      { status: 200 },
    );
  }

  const todayYmd = seoulYmd();

  const { data: routines } = await admin
    .from("user_routines")
    .select(
      "user_id, splits, variant_id, custom_week, start_date, rest_date, override_date, override_block",
    );

  let sent = 0;
  let skipped = 0;

  for (const r of (routines ?? []) as RoutineRow[]) {
    const isRest = isRestDay(r, todayYmd);

    // 필요한 것만 조회: 휴식일이면 식단, 운동일이면 본운동 완료.
    let hasDiet = false;
    let hasWorkout = false;
    if (isRest) {
      hasDiet = await hasDietLog(admin, r.user_id, todayYmd);
    } else {
      hasWorkout = await hasWorkoutDone(admin, r.user_id, todayYmd);
    }

    const kind = reminderKindFor({ isRest, hasDiet, hasWorkout });
    if (!kind) {
      skipped++;
      continue;
    }

    const delivered = await sendReminder(admin, r.user_id, kind);
    if (delivered) sent++;
    else skipped++;
  }

  return NextResponse.json({
    ok: true,
    date: todayYmd,
    scanned: routines?.length ?? 0,
    sent,
    skipped,
  });
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

/** 오늘 식단 기록이 하나라도 있나. */
async function hasDietLog(
  admin: SupabaseClient,
  userId: string,
  todayYmd: string,
): Promise<boolean> {
  const { count } = await admin
    .from("food_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("for_date", todayYmd);
  return (count ?? 0) > 0;
}

/** 오늘 완료(status=done)한 본운동이 하나라도 있나. */
async function hasWorkoutDone(
  admin: SupabaseClient,
  userId: string,
  todayYmd: string,
): Promise<boolean> {
  const { count } = await admin
    .from("exercise_completions")
    .select("exercise_row_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("for_date", todayYmd)
    .eq("status", "done");
  return (count ?? 0) > 0;
}

/** 사용자의 모든 구독에 리마인더 푸시. 하나라도 전송되면 true. 만료 구독은 정리. */
async function sendReminder(
  admin: SupabaseClient,
  userId: string,
  kind: ReminderKind,
): Promise<boolean> {
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  const list = (subs ?? []) as SubRow[];
  if (list.length === 0) return false;

  const payload = REMINDER_PAYLOADS[kind];
  let ok = false;
  for (const sub of list) {
    const res = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      payload,
    );
    if (res === "ok") ok = true;
    if (res === "gone") {
      await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    }
  }
  return ok;
}