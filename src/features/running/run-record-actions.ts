"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { setConditioningStatusAction } from "@/features/routine/conditioning-completion-actions";
import type { SupabaseClient } from "@supabase/supabase-js";

/** 오늘 누적 운동 시간을 deltaSec 만큼 가감(음수 가능, 0 미만은 0). */
async function adjustWorkoutSeconds(
  supabase: SupabaseClient,
  userId: string,
  forDate: string,
  deltaSec: number,
): Promise<void> {
  const delta = Math.round(deltaSec);
  if (delta === 0) return;
  const { data } = await supabase
    .from("workout_sessions")
    .select("duration_sec")
    .eq("user_id", userId)
    .eq("for_date", forDate)
    .maybeSingle();
  const total = Math.max(0, Number(data?.duration_sec ?? 0) + delta);
  await supabase.from("workout_sessions").upsert(
    {
      user_id: userId,
      for_date: forDate,
      duration_sec: total,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,for_date" },
  );
}

/**
 * 런닝(실내/야외) 종료 → 런닝모드 기록.
 *
 * ⚠ 런닝모드 기록은 **'마무리운동 목록'에 표시하지 않는다** — 오늘 운동 시간(점수)과
 *   캘린더·기록(conditioning_completions)에만 반영한다. (사용자 규칙: 런닝모드 기록은
 *   캘린더·운동점수에만. 루틴/오늘만 편집으로 추가한 마무리 런닝만 목록에 보인다.)
 *
 * 그래서 daily_conditioning(마무리 '플랜' 행)은 만들지 않고, conditioning_completions
 * (런닝 완료)만 남긴다. 목록에 플랜 행이 없으므로 목록엔 안 뜨고, 완료취소 시 고스트로
 * 되살아나던 문제(#17)도 사라진다.
 *
 * 하루에 여러 번 달리면 완료기록 **1건**에 시간을 누적한다(같은 source_row_id 재사용).
 */
export async function recordRunAsCooldownAction(input: {
  durationMin: number;
  /** 실제 런닝 초 — 오늘 운동 시간(누적)에 더한다. 없으면 durationMin*60. */
  durationSec?: number;
  distanceKm?: number | null;
  avgKmh?: number | null;
  incline?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const today = seoulYmd();
  const durationMin = Math.max(1, Math.round(input.durationMin || 1));
  const durationSec = Math.max(
    0,
    Math.round(input.durationSec ?? durationMin * 60),
  );
  const speed =
    input.avgKmh != null && input.avgKmh > 0
      ? Math.round(input.avgKmh * 10) / 10
      : null;
  const incline =
    input.incline != null && input.incline >= 0 ? Math.round(input.incline) : null;

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // 오늘 운동 시간(누적)에 런닝 시간 더하기(삭제 시 removeTodayRunAction 이 뺀다).
  if (durationSec > 0) await adjustWorkoutSeconds(supabase, user.id, today, durationSec);

  // 오늘 이미 런닝 완료기록이 있으면 시간 누적(같은 source_row_id 재사용 → 1건 유지).
  const { data: existing } = await supabase
    .from("conditioning_completions")
    .select("source_row_id, duration_min")
    .eq("user_id", user.id)
    .eq("for_date", today)
    .eq("item_id", "running")
    .limit(1);
  const prev = (existing ?? [])[0] as
    | { source_row_id: string | null; duration_min: number | null }
    | undefined;
  const sourceRowId = prev?.source_row_id ?? randomUUID();
  const newDur = (Number(prev?.duration_min) || 0) + durationMin;

  const res = await setConditioningStatusAction(
    "cooldown",
    sourceRowId,
    "running",
    "done",
    { durationMin: newDur, speed, incline },
  );
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/routine");
  revalidatePath("/calendar");
  revalidatePath("/settings/score");
  revalidatePath("/settings/history");
  return { ok: true };
}

/**
 * 오늘 런닝모드 기록 삭제 — 런닝 완료기록을 지우고, 그 시간을 오늘 운동 시간에서 뺀다.
 * (예전 데이터 호환: daily_conditioning 에 남아있던 런닝 행도 함께 정리.)
 */
export async function removeTodayRunAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const today = seoulYmd();
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // 오늘 런닝 총 시간 → 완료기록(런닝) 기준으로 합산(런닝모드는 completion 전용).
  // 예전 daily_conditioning 런닝 행이 있으면 그걸로 폴백(중복 합산 방지).
  const [compRes, legacyRes] = await Promise.all([
    supabase
      .from("conditioning_completions")
      .select("duration_min")
      .eq("user_id", user.id)
      .eq("for_date", today)
      .eq("item_id", "running"),
    supabase
      .from("daily_conditioning")
      .select("duration_min")
      .eq("user_id", user.id)
      .eq("for_date", today)
      .eq("item_id", "running"),
  ]);
  const sumMin = (rows: { duration_min: number | null }[] | null) =>
    (rows ?? []).reduce((s, r) => s + (Number(r.duration_min) || 0), 0);
  const compMin = sumMin(compRes.data as { duration_min: number | null }[] | null);
  const legacyMin = sumMin(
    legacyRes.data as { duration_min: number | null }[] | null,
  );
  const totalMin = compMin > 0 ? compMin : legacyMin;
  const sec = Math.round(totalMin * 60);
  if (sec > 0) await adjustWorkoutSeconds(supabase, user.id, today, -sec);

  // 오늘 '러닝' 완료기록 + (레거시) 마무리 행을 item_id 기준으로 모두 삭제.
  await supabase
    .from("conditioning_completions")
    .delete()
    .eq("user_id", user.id)
    .eq("for_date", today)
    .eq("item_id", "running");
  await supabase
    .from("daily_conditioning")
    .delete()
    .eq("user_id", user.id)
    .eq("for_date", today)
    .eq("item_id", "running");

  revalidatePath("/routine");
  revalidatePath("/settings/score");
  revalidatePath("/settings/history");
  revalidatePath("/calendar");
  return { ok: true };
}
