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
 * 런닝 완료취소 — **취소한 그 행 1건만** 지우고, 그 기록의 시간만 오늘 운동 시간에서 뺀다.
 *
 * ⚠ 예전엔 인자 없이 "오늘 item_id='running' 인 완료기록 전부 + daily_conditioning 의
 *   런닝 행 전부"를 지웠다. 런닝이 2개(워밍업+마무리, 또는 마무리에 2개)일 때
 *   하나를 취소하면 **나머지 런닝 완료까지 같이 날아가고**, 사용자가 '오늘만'으로 담아둔
 *   런닝 **플랜 행 자체가 삭제**돼(그러면 목록이 루틴 기본값으로 되돌아감) 취소가
 *   안 먹는 것처럼 보였다. 이제 행 단위로만 지운다.
 *
 * @param sourceRowId 취소할 완료기록의 source_row_id. 화면의 런닝 행이 '런닝모드 기록'
 *   (무작위 id)에 매칭돼 완료로 떠 있을 수 있으므로, 클라이언트는 그 행에 **실제로 배정된
 *   기록의 id**를 넘긴다. (없으면 행 id 로 폴백.)
 */
export async function removeTodayRunAction(sourceRowId?: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const today = seoulYmd();
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const base = supabase
    .from("conditioning_completions")
    .select("source_row_id, duration_min")
    .eq("user_id", user.id)
    .eq("for_date", today)
    .eq("item_id", "running");
  const { data } = sourceRowId
    ? await base.eq("source_row_id", sourceRowId)
    : await base;
  const rows = (data ?? []) as {
    source_row_id: string | null;
    duration_min: number | null;
  }[];
  if (rows.length === 0) {
    // 지울 게 없으면(이미 취소됨) 조용히 성공 — 재시도/연타에도 안전.
    revalidatePath("/routine");
    return { ok: true };
  }

  // 지우는 기록들의 시간만 오늘 운동 시간에서 뺀다(다른 런닝 기록 시간은 그대로).
  const totalMin = rows.reduce((s, r) => s + (Number(r.duration_min) || 0), 0);
  const sec = Math.round(totalMin * 60);
  if (sec > 0) await adjustWorkoutSeconds(supabase, user.id, today, -sec);

  const del = supabase
    .from("conditioning_completions")
    .delete()
    .eq("user_id", user.id)
    .eq("for_date", today)
    .eq("item_id", "running");
  const { error } = sourceRowId
    ? await del.eq("source_row_id", sourceRowId)
    : await del;
  if (error) return { ok: false, error: error.message };

  // ⚠ daily_conditioning(플랜 행)은 건드리지 않는다 — 완료 '기록'만 지운다.
  //   (예전엔 여기서 오늘 런닝 플랜 행까지 지워, 사용자가 담아둔 런닝이 사라졌다.)

  revalidatePath("/routine");
  revalidatePath("/settings/score");
  revalidatePath("/settings/history");
  revalidatePath("/calendar");
  return { ok: true };
}
