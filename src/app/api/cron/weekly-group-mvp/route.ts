import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { pushEnabled } from "@/features/notifications/push";
import { runWeeklyGroupMvp } from "@/features/groups/weekly-mvp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 주간 그룹 MVP 알림 cron — 매주 월요일 호출(지난주 랭킹 결과를 멤버에게 푸시).
 * 보호: `Authorization: Bearer <CRON_SECRET>`.
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

  const result = await runWeeklyGroupMvp(admin);
  return NextResponse.json({ ok: true, ...result });
}
