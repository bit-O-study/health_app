import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendPush, pushEnabled } from "@/features/notifications/push";
import {
  INACTIVITY_LIMIT_MS,
  NO_RESPONSE_LIMIT_MS,
} from "@/features/workout-timer/inactivity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StateRow = {
  user_id: string;
  last_activity_at: string;
  prompted_at: string | null;
};
type SubRow = { endpoint: string; p256dh: string; auth: string };

/**
 * 무활동 감지 cron — Vercel Cron 이 주기적으로 호출(예: 10분마다).
 * 활성 세션 중 30분 무활동이면 종료 확인 푸시를 보내고, 알림 후 10분 무응답이면
 * 세션을 자동 종료(비활성화)한다. (기록 시간은 마지막 활동까지 이미 저장됨.)
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

  const now = Date.now();
  const { data: states } = await admin
    .from("workout_active_state")
    .select("user_id, last_activity_at, prompted_at")
    .eq("active", true);

  let prompted = 0;
  let ended = 0;

  for (const s of (states ?? []) as StateRow[]) {
    const last = new Date(s.last_activity_at).getTime();
    const promptedAt = s.prompted_at ? new Date(s.prompted_at).getTime() : null;

    if (promptedAt === null) {
      if (now - last >= INACTIVITY_LIMIT_MS) {
        await sendToUser(admin, s.user_id);
        await admin
          .from("workout_active_state")
          .update({ prompted_at: new Date().toISOString() })
          .eq("user_id", s.user_id);
        prompted++;
      }
    } else if (now - promptedAt >= NO_RESPONSE_LIMIT_MS) {
      await admin
        .from("workout_active_state")
        .update({ active: false })
        .eq("user_id", s.user_id);
      ended++;
    }
  }

  return NextResponse.json({ ok: true, scanned: states?.length ?? 0, prompted, ended });
}

async function sendToUser(admin: SupabaseClient, userId: string) {
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  const payload = {
    type: "workout-end",
    title: "운동을 종료하시겠습니까?",
    body: "30분 동안 완료된 운동이 없어요. 예/아니오를 눌러주세요.",
  };

  for (const sub of (subs ?? []) as SubRow[]) {
    const res = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      payload,
    );
    if (res === "gone") {
      await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    }
  }
}
