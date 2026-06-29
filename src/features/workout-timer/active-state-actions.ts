"use server";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import type { RestRemainingInput } from "@/features/routine/rest-remaining";

/**
 * 진행 중 운동 세션 상태 — 서버가 '무활동 30분'을 판정해 (앱이 닫혀 있어도) 푸시를 보내기
 * 위한 1인 1행. 클라이언트가 시작/활동/스누즈/종료 때 갱신한다.
 */

/** 운동 시작 — 활성 세션 생성/리셋. remaining = 현재 남은 운동 스냅샷. */
export async function startActiveSessionAction(
  remaining: RestRemainingInput,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  await supabase.from("workout_active_state").upsert(
    {
      user_id: user.id,
      for_date: seoulYmd(),
      active: true,
      started_at: now,
      last_activity_at: now,
      prompted_at: null,
      remaining,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
}

/** 완료/스킵 등 활동 발생 — 무활동 카운트 리셋 + 남은 운동 갱신. */
export async function updateActiveActivityAction(
  remaining: RestRemainingInput,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  await supabase.from("workout_active_state").upsert(
    {
      user_id: user.id,
      for_date: seoulYmd(),
      active: true,
      last_activity_at: now,
      prompted_at: null,
      remaining,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
}

/** '아니오'(스누즈) — 다시 30분 무활동 감지. */
export async function snoozeActiveAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  await supabase
    .from("workout_active_state")
    .update({ last_activity_at: now, prompted_at: null, updated_at: now })
    .eq("user_id", user.id);
}

/** 세션 종료 — 더 이상 푸시하지 않게 비활성화. */
export async function endActiveSessionAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("workout_active_state")
    .update({
      active: false,
      prompted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
}
