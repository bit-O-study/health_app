import "server-only";

import { cache } from "react";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  exerciseCompletionKey,
  type CompletionStatus,
} from "@/features/routine/completion-match";
// ⚠ 라벨 계층만 필요하다 — exercise-catalog 를 쓰면 운동 목록 274 KiB 가 딸려온다.
import {
  isEquipmentId,
  type EquipmentId,
} from "@/features/routine/exercise-catalog-labels";
import { parseSetDetails, type SetDetail } from "@/features/routine/set-details";
import type { ProgressRecord } from "@/features/routine/progress";

// 순수 매칭 로직은 completion-match 로 분리(단위 테스트 가능). 호환을 위해 재노출.
export {
  exerciseCompletionKey,
  resolveTodayStatus,
} from "@/features/routine/completion-match";
export type { CompletionStatus } from "@/features/routine/completion-match";

export type ExerciseCompletionRow = {
  forDate: string;
  exerciseRowId: string;
  exerciseId: string | null;
  status: CompletionStatus;
  focus: string | null;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  /**
   * 완료 시점 세트별 무게·횟수. null = 균일 세트.
   *
   * 성장 집계가 이 값을 **반드시 봐야 한다** — 드롭세트·피라미드를 이 앱은 여기에
   * 저장하는데, 예전엔 조회에서 빠져 있어 균일 세트로만 계산됐다(볼륨·1RM 오차).
   */
  setDetails: SetDetail[] | null;
};

type Row = {
  for_date: string;
  exercise_row_id: string;
  exercise_id: string | null;
  status: string;
  focus: string | null;
  sets: number | null;
  reps: number | null;
  weight_kg: number | string | null;
  set_details?: unknown;
};

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function toStatus(s: string): CompletionStatus {
  return s === "skipped" ? "skipped" : "done";
}

/** 오늘 운동별 상태 맵 (done/skipped). row_id + (부위:운동) 키 둘 다 포함. 미기록은 맵에 없음. */
export async function getStatusMapToday(
  todayYmd: string,
): Promise<Map<string, CompletionStatus>> {
  const user = await getCurrentUser();
  if (!user) return new Map();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("exercise_completions")
    .select("exercise_row_id, status, focus, exercise_id")
    .eq("user_id", user.id)
    .eq("for_date", todayYmd);

  if (error || !data) return new Map();
  const map = new Map<string, CompletionStatus>();
  for (const r of data as {
    exercise_row_id: string;
    status: string;
    focus: string | null;
    exercise_id: string | null;
  }[]) {
    const st = toStatus(r.status);
    map.set(r.exercise_row_id, st);
    // 같은 운동을 오늘 done 했으면 done 우선(skip 으로 덮지 않음).
    const key = exerciseCompletionKey(r.focus, r.exercise_id);
    if (st === "done" || !map.has(key)) map.set(key, st);
  }
  return map;
}

/** 오늘 완료/스킵한 본운동의 스냅샷(렌더용). exercise_id 가 있는(스냅샷 저장된) 행만. */
export type TodayCompletedItem = {
  exerciseRowId: string;
  /** 스냅샷이 없는(옛) 기록은 null — 행 id 직접 매칭엔 쓰이지만 고스트로는 못 그린다. */
  exerciseId: string | null;
  equipment: EquipmentId;
  sets: number;
  reps: number;
  weightKg: number | null;
  setDetails: SetDetail[] | null;
  focus: string | null;
  status: CompletionStatus;
};

/**
 * 오늘 완료/스킵 처리된 본운동들의 스냅샷 목록.
 * 부위를 바꿔(오늘만 변경) 현재 플랜에서 빠진 운동도 '완료'로 계속 보여주기 위해 쓴다.
 * (등 완료 후 가슴으로 바꿔도 등 완료가 사라지지 않게 — 호출부가 plan 에 없는 것만 합친다.)
 */
export const getTodayCompletedItems = cache(async function getTodayCompletedItems(
  todayYmd: string,
): Promise<TodayCompletedItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("exercise_completions")
    .select(
      "exercise_row_id, status, focus, exercise_id, equipment, sets, reps, weight_kg, set_details",
    )
    .eq("user_id", user.id)
    .eq("for_date", todayYmd);

  if (error || !data) return [];
  const out: TodayCompletedItem[] = [];
  for (const r of data as {
    exercise_row_id: string;
    status: string;
    focus: string | null;
    exercise_id: string | null;
    equipment: unknown;
    sets: number | null;
    reps: number | null;
    weight_kg: number | string | null;
    set_details?: unknown;
  }[]) {
    // 스냅샷(exercise_id) 없는 옛 기록도 포함 — 행 id 직접 매칭(완료 판정)엔 필요.
    // 고스트(완료 보존 표시)는 호출부가 exerciseId 있는 것만 그린다.
    out.push({
      exerciseRowId: r.exercise_row_id,
      exerciseId: r.exercise_id ?? null,
      equipment: isEquipmentId(r.equipment) ? r.equipment : "barbell",
      sets: r.sets ?? 1,
      reps: r.reps ?? 1,
      weightKg: num(r.weight_kg),
      setDetails: parseSetDetails(r.set_details),
      focus: r.focus ?? null,
      status: toStatus(r.status),
    });
  }
  return out;
});

/** 최근 N일의 운동별 완료/스킵 기록(최신→과거) */
export async function getRecentExerciseCompletions(
  days = 90,
): Promise<ExerciseCompletionRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  const fromStr = from.toISOString().slice(0, 10);

  // exercise_completions 자체에 저장된 snapshot (focus/sets/reps/weight_kg) 을 직접 사용.
  // routine_exercises 와의 FK 가 제거돼 있어 PostgREST 자동 join 이 불안정하고,
  // daily_plan 으로 등록된 운동의 완료 행은 routine_exercises 에 매칭되지 않아 점수 누락이 발생했음.
  const { data, error } = await supabase
    .from("exercise_completions")
    .select(
      "for_date, exercise_row_id, exercise_id, status, focus, sets, reps, weight_kg, set_details",
    )
    .eq("user_id", user.id)
    .gte("for_date", fromStr)
    .order("for_date", { ascending: false });

  if (error || !data) return [];
  return (data as Row[]).map((r) => ({
    forDate: r.for_date,
    exerciseRowId: r.exercise_row_id,
    exerciseId: r.exercise_id ?? null,
    status: toStatus(r.status),
    focus: r.focus ?? null,
    sets: r.sets ?? null,
    reps: r.reps ?? null,
    weightKg: num(r.weight_kg ?? null),
    setDetails: parseSetDetails(r.set_details),
  }));
}

export type LastExerciseValues = {
  weightKg: number | null;
  reps: number | null;
  sets: number | null;
};

/** '마지막 실제값'을 찾아볼 기간(일). 이보다 오래된 기록은 미리채움 근거로 안 쓴다. */
export const LAST_VALUES_WINDOW_DAYS = 180;
/** 한 번에 읽을 최대 행 수 — 응답 크기·메모리 상한(기간 안에서도 폭주하지 않게). */
const LAST_VALUES_MAX_ROWS = 3000;

/**
 * 최근 완료(done) 기록 — **미리채움과 과부하 추천이 같이 쓰는 한 번의 조회**.
 *
 * 둘 다 "이 운동을 최근에 어떻게 했나"를 본다. 따로 읽으면 같은 표를 같은 조건으로
 * 두 번 읽게 되는데, 서울↔싱가포르는 왕복 1회가 그대로 체감 지연이라 나눌 이유가 없다.
 * `cache()` 라 한 요청 안에서 여러 곳이 불러도 DB 콜은 1번.
 *
 * ⚠ 예전엔 사용자의 **완료 기록 전체**를 제한 없이 읽어 앱에서 골랐다. 기록이 쌓일수록
 * 응답 크기와 JSON 처리 비용이 선형으로 늘어나는 구조라, 최근 180일 + 상한 행수로 묶었다.
 * 반년 넘게 안 한 운동은 지난 무게를 미리 채워도 맞지 않으니 계획값으로 시작하는 게 낫다.
 *
 * `set_details` 를 **반드시 함께 읽는다** — 드롭세트·피라미드가 거기 있어서, 빼면
 * 과부하 판단이 균일 세트로만 계산돼 1RM·볼륨이 틀어진다(2.1 에서 겪은 결함).
 * 최신순(내림차순)이라 운동별 첫 항목이 가장 최근 값이다.
 */
export const getRecentDoneRecords = cache(
  async function getRecentDoneRecords(): Promise<ProgressRecord[]> {
    const user = await getCurrentUser();
    if (!user) return [];
    const supabase = await createSupabaseServerClient();
    const since = new Date(Date.now() - LAST_VALUES_WINDOW_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const { data, error } = await supabase
      .from("exercise_completions")
      .select("exercise_id, sets, reps, weight_kg, set_details, for_date")
      .eq("user_id", user.id)
      .eq("status", "done")
      .gte("for_date", since)
      .order("for_date", { ascending: false })
      .limit(LAST_VALUES_MAX_ROWS);
    if (error || !data) return [];
    return (
      data as {
        exercise_id: string | null;
        sets: number | null;
        reps: number | null;
        weight_kg: number | string | null;
        set_details: unknown;
        for_date: string;
      }[]
    ).map((r) => ({
      forDate: r.for_date,
      exerciseId: r.exercise_id ?? null,
      status: "done" as const,
      sets: r.sets ?? null,
      reps: r.reps ?? null,
      weightKg: num(r.weight_kg ?? null),
      setDetails: parseSetDetails(r.set_details),
    }));
  },
);

/**
 * 운동별 '마지막으로 실제 한 값'(가장 최근 done 완료 스냅샷). 운동모드/루틴이 다시 돌아오면
 * 이 값으로 미리 채워, 사용자가 매번 다시 입력하지 않게 한다(비고정 모드). 없으면 맵에 없음.
 */
export const getLastExerciseValues = cache(async function getLastExerciseValues(): Promise<
  Map<string, LastExerciseValues>
> {
  const out = new Map<string, LastExerciseValues>();
  for (const r of await getRecentDoneRecords()) {
    // 최신순 → 운동별 첫 항목이 가장 최근 값.
    if (!r.exerciseId || out.has(r.exerciseId)) continue;
    out.set(r.exerciseId, {
      weightKg: r.weightKg,
      reps: r.reps,
      sets: r.sets,
    });
  }
  return out;
});
