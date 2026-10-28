import "server-only";

import { cache } from "react";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import type { CompletionStatus } from "@/features/routine/exercise-completions";
import {
  isConditioningKind,
  type ConditioningKind,
} from "@/features/routine/conditioning-catalog";
import type { CondRecord } from "@/features/routine/conditioning-carry";

function toStatus(s: string): CompletionStatus {
  return s === "skipped" ? "skipped" : "done";
}

const numOrNull = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** 오늘 완료/스킵한 워밍업·마무리의 스냅샷(렌더용). 루틴(요일)을 바꿔 그 종목이
 * 더는 안 보여도 '완료'로 계속 보여주기 위해 쓴다(본운동 완료 보존과 동일). */
export type TodayCompletedConditioning = {
  sourceRowId: string;
  kind: ConditioningKind;
  itemId: string;
  status: CompletionStatus;
  durationMin: number | null;
  speed: number | null;
  incline: number | null;
  sets: number | null;
  reps: number | null;
};

export const getTodayCompletedConditioning = cache(
  async function getTodayCompletedConditioning(
    todayYmd: string,
  ): Promise<TodayCompletedConditioning[]> {
    const user = await getCurrentUser();
    if (!user) return [];
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("conditioning_completions")
      .select(
        "source_row_id, kind, item_id, status, duration_min, speed, incline, sets, reps",
      )
      .eq("user_id", user.id)
      .eq("for_date", todayYmd);

    if (error || !data) return [];
    const out: TodayCompletedConditioning[] = [];
    for (const r of data as {
      source_row_id: string | null;
      kind: string | null;
      item_id: string | null;
      status: string;
      duration_min: number | string | null;
      speed: number | string | null;
      incline: number | string | null;
      sets: number | null;
      reps: number | null;
    }[]) {
      if (!r.source_row_id || !r.item_id || !isConditioningKind(r.kind ?? ""))
        continue;
      out.push({
        sourceRowId: r.source_row_id,
        kind: r.kind as ConditioningKind,
        itemId: r.item_id,
        status: toStatus(r.status),
        durationMin: numOrNull(r.duration_min),
        speed: numOrNull(r.speed),
        incline: numOrNull(r.incline),
        sets: r.sets ?? null,
        reps: r.reps ?? null,
      });
    }
    return out;
  },
);

/**
 * 런닝 이어하기(2026-10-28) — 오늘 전 180일의 워밍업·마무리 **완료** 기록(최근 순).
 * 루틴이 다시 돌아오면 이 값으로 런닝(트레드밀)의 시간·속도·경사를 채운다(conditioning-carry.ts).
 * 실패하면 빈 목록 — 채우기만 빠지고 화면은 루틴 값 그대로.
 */
export const getRecentConditioningRecords = cache(
  async function getRecentConditioningRecords(todayYmd: string): Promise<CondRecord[]> {
    const user = await getCurrentUser();
    if (!user) return [];
    const supabase = await createSupabaseServerClient();
    const from = new Date(Date.parse(`${todayYmd}T00:00:00Z`) - 180 * 86_400_000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("conditioning_completions")
      .select("for_date, kind, item_id, source_row_id, duration_min, speed, incline")
      .eq("user_id", user.id)
      .eq("status", "done")
      .gte("for_date", from)
      .lt("for_date", todayYmd)
      .order("for_date", { ascending: false })
      .limit(500);
    if (error || !data) return [];
    return (data as {
      for_date: string;
      kind: string | null;
      item_id: string | null;
      source_row_id: string | null;
      duration_min: number | string | null;
      speed: number | string | null;
      incline: number | string | null;
    }[])
      .filter((r) => r.item_id && isConditioningKind(r.kind ?? ""))
      .map((r) => ({
        forDate: r.for_date,
        kind: r.kind as string,
        itemId: r.item_id as string,
        sourceRowId: r.source_row_id,
        durationMin: numOrNull(r.duration_min),
        speed: numOrNull(r.speed),
        incline: numOrNull(r.incline),
      }));
  },
);

/** 워밍업/마무리 완료의 (종류:항목) 키. 본운동과 같은 이유로, 루틴을 바꿔 행 UUID 가
 * 새로 생겨도 오늘 같은 항목이 보이면 완료로 유지되게 한다. */
export function conditioningCompletionKey(
  kind: string | null | undefined,
  itemId: string | null | undefined,
): string {
  return `c:${kind ?? ""}:${itemId ?? ""}`;
}

/** 오늘의 워밍업/마무리 상태 맵. source_row_id + (종류:항목) 키 포함.
 * (예전엔 "종류 단위" 키로 오늘 워밍업 한번 하면 루틴을 바꿔도 새 워밍업까지 완료로
 *  표시했는데, 그러면 새 루틴의 워밍업이 완료로 떠 버리고 표시행 id 로는 취소도 안 돼
 *  본운동과 동작이 달랐다. 이제 본운동과 동일하게 행 id + (종류:항목) 으로만 매칭한다.) */
export async function getConditioningStatusMapToday(
  todayYmd: string,
): Promise<Map<string, CompletionStatus>> {
  const user = await getCurrentUser();
  if (!user) return new Map();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("conditioning_completions")
    .select("source_row_id, status, kind, item_id")
    .eq("user_id", user.id)
    .eq("for_date", todayYmd);

  if (error || !data) return new Map();
  const map = new Map<string, CompletionStatus>();
  for (const r of data as {
    source_row_id: string | null;
    status: string;
    kind: string | null;
    item_id: string | null;
  }[]) {
    const st = toStatus(r.status);
    if (r.source_row_id) map.set(r.source_row_id, st);
    // 같은 항목을 오늘 done 했으면 done 우선(skip 으로 덮지 않음).
    const key = conditioningCompletionKey(r.kind, r.item_id);
    if (st === "done" || !map.has(key)) map.set(key, st);
  }
  return map;
}
