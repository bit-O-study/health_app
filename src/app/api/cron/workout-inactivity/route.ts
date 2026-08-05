import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  loadDevices,
  notifyDevices,
  notifyEnabled,
} from "@/features/notifications/push-fanout";
import {
  INACTIVITY_LIMIT_MS,
  NO_RESPONSE_LIMIT_MS,
} from "@/features/workout-timer/inactivity";
import { chunk, mapWithConcurrency } from "@/lib/batch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 알림 발송 동시 실행 수. */
const USER_CONCURRENCY = 8;
/** `.in(...)` 한 번에 넣을 최대 개수(URL 길이 제한). */
const IN_CHUNK = 100;

type StateRow = {
  user_id: string;
  last_activity_at: string;
  prompted_at: string | null;
};

/**
 * 무활동 감지 cron — Vercel Cron 이 주기적으로 호출(예: 10분마다).
 * 활성 세션 중 30분 무활동이면 종료 확인 푸시를 보내고, 알림 후 10분 무응답이면
 * 세션을 자동 종료(비활성화)한다. (기록 시간은 마지막 활동까지 이미 저장됨.)
 *
 * 판정은 메모리에서 끝내고, 푸시는 제한 동시성으로, 상태 UPDATE 는 사용자별이 아니라
 * **한 번에 묶어서** 처리한다(동시 운동자가 늘어도 실행시간이 비례하지 않게).
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
  if (!admin || !notifyEnabled()) {
    return NextResponse.json(
      { ok: false, reason: "push/admin not configured" },
      { status: 200 },
    );
  }

  const now = Date.now();
  const { data: states } = await admin
    .from("workout_active_state")
    .select("user_id, last_activity_at, prompted_at")
    .eq("active", true);
  const rows = (states ?? []) as StateRow[];

  // 1) 판정 — DB 없이.
  const toPrompt: string[] = [];
  const toEnd: string[] = [];
  for (const s of rows) {
    const last = new Date(s.last_activity_at).getTime();
    const promptedAt = s.prompted_at ? new Date(s.prompted_at).getTime() : null;
    if (promptedAt === null) {
      if (now - last >= INACTIVITY_LIMIT_MS) toPrompt.push(s.user_id);
    } else if (now - promptedAt >= NO_RESPONSE_LIMIT_MS) {
      toEnd.push(s.user_id);
    }
  }

  // 2) 종료 확인 푸시 — 대상자 기기를 한 번에 읽고 제한 동시성으로 발송.
  //    (웹푸시의 예/아니오 액션은 SW 가 처리, FCM 은 기본 알림.)
  const devices = await loadDevices(admin, toPrompt);
  await mapWithConcurrency(toPrompt, USER_CONCURRENCY, (userId) =>
    notifyDevices(admin, devices.get(userId), {
      type: "workout-end",
      title: "운동을 종료하시겠습니까?",
      body: "30분 동안 완료된 운동이 없어요. 예/아니오를 눌러주세요.",
    }),
  );

  // 3) 상태 갱신 — 사용자마다 UPDATE 하지 않고 묶어서.
  const promptedAt = new Date().toISOString();
  await Promise.all([
    ...chunk(toPrompt, IN_CHUNK).map((ids) =>
      admin
        .from("workout_active_state")
        .update({ prompted_at: promptedAt })
        .in("user_id", ids),
    ),
    ...chunk(toEnd, IN_CHUNK).map((ids) =>
      admin
        .from("workout_active_state")
        .update({ active: false })
        .in("user_id", ids),
    ),
  ]);

  return NextResponse.json({
    ok: true,
    scanned: rows.length,
    prompted: toPrompt.length,
    ended: toEnd.length,
  });
}
