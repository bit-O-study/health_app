import { NextResponse } from "next/server";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { restRemainingTodayAction } from "@/features/routine/rest-remaining-actions";
import type { RestRemainingInput } from "@/features/routine/rest-remaining";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY: RestRemainingInput = { planRows: [], warmup: [], cooldown: [] };

/**
 * 서비스워커 알림(예/아니오) 클릭 처리 — 앱이 닫혀 있어도 동작(쿠키로 인증).
 * - yes: 저장된 '남은 운동'을 휴식(skip) 처리 + 세션 비활성화
 * - no : 스누즈(다시 30분 무활동 감지)
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const action = body?.action === "yes" ? "yes" : "no";
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  if (action === "yes") {
    const { data } = await supabase
      .from("workout_active_state")
      .select("remaining")
      .eq("user_id", user.id)
      .maybeSingle();
    const remaining =
      (data?.remaining as RestRemainingInput | undefined) ?? EMPTY;
    await restRemainingTodayAction(remaining);
    await supabase
      .from("workout_active_state")
      .update({ active: false, prompted_at: null, updated_at: now })
      .eq("user_id", user.id);
    return NextResponse.json({ ok: true, action: "yes" });
  }

  await supabase
    .from("workout_active_state")
    .update({ last_activity_at: now, prompted_at: null, updated_at: now })
    .eq("user_id", user.id);
  return NextResponse.json({ ok: true, action: "no" });
}
