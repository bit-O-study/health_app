"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  firstDayIndexForFocus,
  focusToDaysMap,
  routineDayOffset,
  routineDaySlots,
  seoulYmd,
} from "@/features/routine/data";
import { getUserProfile } from "@/features/profile/data-access";
import { getUserRoutine } from "@/features/routine/data-access";
import { getCurrentGym } from "@/features/gym/gym-data-access";
import {
  isEquipmentAvailable,
  toGymEquipmentSet,
} from "@/features/gym/gym-equipment-mapping";
import {
  ALL_FOCUSES,
  exercisesForFocus,
  getCatalogExercise,
  isEquipmentId,
  prescribe,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
import {
  focusExercisesForSlot,
  sideExercisesForSlot,
} from "@/features/routine/recommend";
import {
  isValidSetDetails,
  toRowFields,
  type SetDetail,
} from "@/features/routine/set-details";
import { registerRecommendedConditioningAction } from "@/features/routine/conditioning-actions";
import { carryOverCompletions } from "@/features/routine/completion-carry";
import { APPEND_POSITION_BASE } from "@/features/routine/plan-order";

/** 운동의 기구 옵션 중 헬스장에 있는 첫 번째. 없으면 첫 번째. */
function pickEquipment(
  ex: { equipments: { equipment: EquipmentId }[] },
  gymSet: ReadonlySet<string> | null,
): EquipmentId {
  const ok = ex.equipments.find((eq) =>
    isEquipmentAvailable(eq.equipment, gymSet),
  );
  return ok?.equipment ?? ex.equipments[0].equipment;
}

export type SavePlanResult = { ok: true } | { ok: false; error: string };

export type ManualPlanItem = {
  exerciseId: string;
  equipment: EquipmentId;
  sets: number;
  reps: number;
  weightKg: number | null;
  /** 세트별 무게·횟수. 있으면 sets/reps/weightKg 대신 이걸 사용. */
  setDetails?: SetDetail[] | null;
};

/**
 * 추천 운동들로 등록: 루틴의 각 일차(day_index)·부위에 (성별·경력·체형) 기반
 * 운동/세트/횟수/무게를 채워 넣는다(기존 등록은 전부 대체). 같은 부위가 여러
 * 일차에 나와도 일차별로 독립 시드한다. 보조(사이드) 부위는 2개만 채운다.
 */
export async function registerRecommendedPlanAction(): Promise<SavePlanResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const [profile, gym, routine] = await Promise.all([
    getUserProfile(),
    getCurrentGym(),
    getUserRoutine(),
  ]);
  if (!profile) return { ok: false, error: "프로필이 필요합니다." };
  const gymSet = toGymEquipmentSet(gym?.equipmentIds ?? null);

  const gender = profile.gender;
  const opts = {
    gender,
    experience: profile.experience,
    bodyType: profile.bodyType ?? ("average" as const),
    weightKg: profile.weightKg ?? 65,
  };

  // 루틴이 있으면 일차별 슬롯으로, 없으면(드뭄) 전 부위를 0일차에 폴백.
  const slots = routine
    ? routineDaySlots(routine.splits, routine.variantId, routine.customWeek)
    : ALL_FOCUSES.map((focus) => ({
        dayIndex: 0,
        focus,
        blockIds: [focus],
        isSide: false,
        label: "",
      }));

  const rows = slots.flatMap((slot) => {
    const list = slot.isSide
      ? sideExercisesForSlot(slot.focus, slot.blockIds, gender)
      : focusExercisesForSlot(slot.focus, slot.blockIds, gender);
    return list.map((ex, index) => {
      const p = prescribe(ex.id, opts);
      return {
        user_id: user.id,
        day_index: slot.dayIndex,
        focus: slot.focus,
        position: index,
        exercise_id: ex.id,
        equipment: pickEquipment(ex, gymSet),
        sets: p.sets,
        reps: p.reps,
        weight_kg: p.weightKg,
      };
    });
  });

  // 완료기록(exercise_completions) 보존을 위해, 기존 행의 UUID 를
  // (day_index, focus, exercise_id) 키로 모아 두고, 같은 운동이면 재등록 시에도
  // 같은 UUID 를 재사용한다 → 완료 체크가 유지된다.
  const { data: oldRows } = await supabase
    .from("routine_exercises")
    .select("id, day_index, focus, exercise_id")
    .eq("user_id", user.id);
  const oldIdByKey = new Map<string, string>();
  for (const r of (oldRows ?? []) as {
    id: string;
    day_index: number | null;
    focus: string;
    exercise_id: string;
  }[]) {
    oldIdByKey.set(`${r.day_index ?? 0}:${r.focus}:${r.exercise_id}`, r.id);
  }

  const del = await supabase
    .from("routine_exercises")
    .delete()
    .eq("user_id", user.id);
  if (del.error) return { ok: false, error: del.error.message };

  if (rows.length > 0) {
    const rowsWithId = rows.map((r) => {
      const id = oldIdByKey.get(`${r.day_index}:${r.focus}:${r.exercise_id}`);
      return id ? { ...r, id } : r;
    });
    const ins = await supabase.from("routine_exercises").insert(rowsWithId);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  // 워밍업·마무리도 기본 추천으로 함께 채운다
  await registerRecommendedConditioningAction();

  revalidatePath("/routine");
  return { ok: true };
}

/**
 * 표시 순서 변경(드래그 정렬).
 *
 * ids 는 새 순서로 정렬된 행 id 배열로, 기본 등록 행(`routine_exercises`)
 * 이거나 오늘만 오버라이드 행(`daily_plan`) 일 수 있다.
 * 두 테이블 모두 UUID 라 충돌이 없어 양쪽에 update 를 시도하고,
 * 매칭되지 않는 쪽은 자연스럽게 no-op 으로 끝난다.
 *
 * 이전 버전은 routine_exercises 만 업데이트해서"오늘만 변경" 으로 만들어진
 * daily_plan 행들은 순서 저장이 silently 실패했음 → 새로고침하면 순서가
 * 되돌아갔고, 그 와중에 완료/휴식 처리하면 다른 행이 마킹된 것처럼 보였음.
 *
 *`focus` 인자는 호환을 위해 유지하지만 ID 매칭만으로 충분해 필터로 쓰지 않는다.
 */
export async function reorderPlanAction(
  _focus: string,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return;

  await Promise.all(
    ids.flatMap((id, index) => [
      supabase
        .from("routine_exercises")
        .update({ position: index })
        .eq("user_id", user.id)
        .eq("id", id),
      supabase
        .from("daily_plan")
        .update({ position: index })
        .eq("user_id", user.id)
        .eq("id", id),
    ]),
  );

  // 클라이언트가 로컬 state 로 즉시 반영하므로 revalidatePath 생략 — 불필요한 RSC 재요청을 막아
  // 드래그 직후의 체감 지연을 없앤다.
}

/**
 * 직접 등록: 특정 일차(day_index)·부위의 운동 목록을 통째로 교체한다.
 * 같은 부위가 다른 일차에 있어도 그 일차는 건드리지 않는다(일차별 독립).
 */
export async function saveManualPlanAction(
  dayIndex: number,
  focus: string,
  items: ManualPlanItem[],
): Promise<SavePlanResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) {
    return { ok: false, error: "일차 값이 올바르지 않습니다." };
  }

  for (const it of items) {
    if (!getCatalogExercise(it.exerciseId) || !isEquipmentId(it.equipment)) {
      return { ok: false, error: "운동/기구 값이 올바르지 않습니다." };
    }
    if (it.setDetails && it.setDetails.length > 0) {
      if (!isValidSetDetails(it.setDetails)) {
        return { ok: false, error: "세트별 무게/횟수 값이 올바르지 않습니다." };
      }
    } else if (
      !Number.isInteger(it.sets) ||
      it.sets < 1 ||
      it.sets > 20 ||
      !Number.isInteger(it.reps) ||
      it.reps < 1 ||
      it.reps > 100
    ) {
      return { ok: false, error: "세트/횟수 값이 올바르지 않습니다." };
    }
  }

  // 기존 메모를 운동별로 보존 — 이 액션은 부위 운동을 통째로 지우고 다시 넣기 때문에
  // 기존 행의 memo 를 exercise_id 기준으로 모아 뒀다가 같은 운동에 다시 붙인다.
  const { data: prev } = await supabase
    .from("routine_exercises")
    .select("exercise_id, memo")
    .eq("user_id", user.id)
    .eq("day_index", dayIndex)
    .eq("focus", focus)
    .order("position", { ascending: true });
  const memoByExercise = new Map<string, string>();
  for (const r of (prev ?? []) as { exercise_id: string; memo?: unknown }[]) {
    if (typeof r.memo === "string" && r.memo.trim() !== "") {
      memoByExercise.set(r.exercise_id, r.memo);
    }
  }

  const del = await supabase
    .from("routine_exercises")
    .delete()
    .eq("user_id", user.id)
    .eq("day_index", dayIndex)
    .eq("focus", focus);
  if (del.error) return { ok: false, error: del.error.message };

  if (items.length > 0) {
    const rows = items.map((it, index) => ({
      user_id: user.id,
      day_index: dayIndex,
      focus,
      position: index,
      exercise_id: it.exerciseId,
      equipment: it.equipment,
      ...toRowFields(it),
      memo: memoByExercise.get(it.exerciseId) ?? null,
    }));
    const ins = await supabase
      .from("routine_exercises")
      .insert(rows)
      .select("id, exercise_id");
    if (ins.error) return { ok: false, error: ins.error.message };

    // ⚠ 행 id 가 새로 생기므로 오늘 완료기록을 새 행으로 옮긴다 — 안 그러면 운동 중에
    //   루틴을 편집·저장하는 순간 완료한 세트가 다 풀린 것처럼 보인다.
    await carryOverCompletions(
      supabase,
      user.id,
      seoulYmd(),
      focus,
      ((ins.data ?? []) as { id: string; exercise_id: string }[]).map((r) => ({
        id: r.id,
        exerciseId: r.exercise_id,
      })),
    );
  }

  revalidatePath("/routine");
  return { ok: true };
}

/** 근육별 운동선택(3D 마네킹) 한 줄 — 어느 부위(focus)에 어떤 운동을 담을지. */
export type MuscleSelectionItem = { focus: string; exerciseId: string };

/**
 * 근육별 운동선택 저장 — 3D 마네킹에서 부위를 눌러 고른 운동들을 등록한다.
 *
 * - 선택이 들어온 부위(focus)만 통째로 교체한다. 선택이 없는 부위는 건드리지 않음.
 * - 세트·횟수·무게는 프로필 기반 prescribe 추천값, 기구는 내 헬스장 우선으로 자동 지정.
 * - 같은 운동의 기존 메모는 부위 단위로 보존한다(saveManualPlanAction 과 동일 규칙).
 */
export async function saveMuscleSelectionAction(
  selections: MuscleSelectionItem[],
): Promise<SavePlanResult> {
  if (!Array.isArray(selections) || selections.length === 0) {
    return { ok: false, error: "선택한 운동이 없습니다." };
  }

  // 부위(focus)별로 운동 id 묶기 (입력 순서 유지, 중복 제거)
  const byFocus = new Map<string, string[]>();
  for (const sel of selections) {
    if (!ALL_FOCUSES.includes(sel.focus as (typeof ALL_FOCUSES)[number])) {
      return { ok: false, error: "부위가 올바르지 않습니다." };
    }
    if (!getCatalogExercise(sel.exerciseId)) {
      return { ok: false, error: "운동 값이 올바르지 않습니다." };
    }
    const list = byFocus.get(sel.focus) ?? [];
    if (!list.includes(sel.exerciseId)) list.push(sel.exerciseId);
    byFocus.set(sel.focus, list);
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const [profile, gym, routine] = await Promise.all([
    getUserProfile(),
    getCurrentGym(),
    getUserRoutine(),
  ]);
  if (!profile) return { ok: false, error: "프로필이 필요합니다." };
  const gymSet = toGymEquipmentSet(gym?.equipmentIds ?? null);
  const opts = {
    gender: profile.gender,
    experience: profile.experience,
    bodyType: profile.bodyType ?? ("average" as const),
    weightKg: profile.weightKg ?? 65,
  };

  // 부위 → 이 루틴이 그 부위를 쓰는 일차들. 근육별 선택은 "이 부위를 쓰는 모든
  // 일차"에 동일하게 반영한다. 루틴에 없는 부위면 0일차에만 둔다(폴백 노출용).
  const focusDays = routine
    ? focusToDaysMap(
        routineDaySlots(routine.splits, routine.variantId, routine.customWeek),
      )
    : new Map<string, number[]>();

  for (const [focus, exerciseIds] of byFocus) {
    const days = focusDays.get(focus as never) ?? [0];

    // 기존 메모 보존 (운동 id 기준) — 이 부위 전체에서 모음
    const { data: prev } = await supabase
      .from("routine_exercises")
      .select("exercise_id, memo")
      .eq("user_id", user.id)
      .eq("focus", focus);
    const memoByExercise = new Map<string, string>();
    for (const r of (prev ?? []) as { exercise_id: string; memo?: unknown }[]) {
      if (typeof r.memo === "string" && r.memo.trim() !== "") {
        memoByExercise.set(r.exercise_id, r.memo);
      }
    }

    for (const dayIndex of days) {
      const del = await supabase
        .from("routine_exercises")
        .delete()
        .eq("user_id", user.id)
        .eq("day_index", dayIndex)
        .eq("focus", focus);
      if (del.error) return { ok: false, error: del.error.message };

      const rows = exerciseIds.map((exerciseId, index) => {
        const ex = getCatalogExercise(exerciseId)!;
        const p = prescribe(exerciseId, opts);
        return {
          user_id: user.id,
          day_index: dayIndex,
          focus,
          position: index,
          exercise_id: exerciseId,
          equipment: pickEquipment(ex, gymSet),
          sets: p.sets,
          reps: p.reps,
          weight_kg: p.weightKg,
          memo: memoByExercise.get(exerciseId) ?? null,
        };
      });
      const ins = await supabase.from("routine_exercises").insert(rows);
      if (ins.error) return { ok: false, error: ins.error.message };
    }
  }

  revalidatePath("/routine");
  revalidatePath("/plan");
  return { ok: true };
}

/**
 * 본운동 1행의 세트·횟수·무게를 즉시 수정한다. rowId 는 routine_exercises
 * 또는 daily_plan 의 id 일 수 있어 두 테이블 모두에 update 시도한다.
 * 완료/스킵 기록(exercise_completions)은 건드리지 않는다.
 */
export async function updateExerciseAction(
  rowId: string,
  values: {
    sets: number;
    reps: number;
    weightKg: number | null;
    /** 세트별 무게·횟수. 있으면 sets/reps/weightKg 대신 사용, null/생략이면 균일로 되돌림. */
    setDetails?: SetDetail[] | null;
    /** 개인 메모. 생략하면 메모는 건드리지 않음. */
    memo?: string | null;
  },
): Promise<SavePlanResult> {
  if (!rowId) return { ok: false, error: "행을 찾을 수 없습니다." };
  const hasSetDetails = !!values.setDetails && values.setDetails.length > 0;
  if (hasSetDetails) {
    if (!isValidSetDetails(values.setDetails!)) {
      return { ok: false, error: "세트별 무게/횟수 값이 올바르지 않습니다." };
    }
  } else {
    if (
      !Number.isInteger(values.sets) ||
      values.sets < 1 ||
      values.sets > 20 ||
      !Number.isInteger(values.reps) ||
      values.reps < 1 ||
      values.reps > 100
    ) {
      return { ok: false, error: "세트/횟수 값이 올바르지 않습니다." };
    }
    if (
      values.weightKg !== null &&
      (!Number.isFinite(values.weightKg) ||
        values.weightKg < 0 ||
        values.weightKg > 1000)
    ) {
      return { ok: false, error: "무게 값이 올바르지 않습니다." };
    }
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const update = toRowFields(values);
  // memo 는 plan 테이블에만 (exercise_completions 엔 memo 컬럼 없음).
  // 생략(undefined)이면 메모 미변경, 빈 문자열이면 null 로 지움.
  const planUpdate =
    values.memo === undefined
      ? update
      : {
          ...update,
          memo:
            typeof values.memo === "string" && values.memo.trim() !== ""
              ? values.memo.trim().slice(0, 1000)
              : null,
        };
  await Promise.all([
    supabase
      .from("routine_exercises")
      .update(planUpdate)
      .eq("user_id", user.id)
      .eq("id", rowId),
    supabase
      .from("daily_plan")
      .update(planUpdate)
      .eq("user_id", user.id)
      .eq("id", rowId),
    // 이미 done/skip 처리된 기록의 snapshot 도 함께 갱신 — 기록·점수가 옛값으로 남지 않게.
    supabase
      .from("exercise_completions")
      .update(update)
      .eq("user_id", user.id)
      .eq("exercise_row_id", rowId),
  ]);

  // 클라이언트가 로컬 state 로 즉시 반영. revalidate 생략 — 인라인 저장이 즉시 끝난 느낌으로.
  return { ok: true };
}

/**
 * 메모만 빠르게 저장 — 메인 화면의 메모 버튼에서 사용. rowId 는 routine_exercises
 * 또는 daily_plan 의 id. 빈 문자열이면 메모 제거(null).
 */
export async function updateExerciseMemoAction(
  rowId: string,
  memo: string | null,
): Promise<SavePlanResult> {
  if (!rowId) return { ok: false, error: "행을 찾을 수 없습니다." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const value =
    typeof memo === "string" && memo.trim() !== ""
      ? memo.trim().slice(0, 1000)
      : null;

  const [re, dp] = await Promise.all([
    supabase
      .from("routine_exercises")
      .update({ memo: value })
      .eq("user_id", user.id)
      .eq("id", rowId),
    supabase
      .from("daily_plan")
      .update({ memo: value })
      .eq("user_id", user.id)
      .eq("id", rowId),
  ]);
  if (re.error && dp.error) {
    return { ok: false, error: re.error.message };
  }
  return { ok: true };
}

/**
 * 메인"오늘의 운동" 편집 모드에서 한 개 운동을 오늘 목록에 즉시 추가한다.
 * - 그 부위에 이미 daily_plan 오버라이드가 있으면 그쪽에 append (오늘만 반영)
 * - 없으면 routine_exercises 에 append (기본 루틴에 영구 추가)
 * 세트·횟수·무게는 프로필 기반 prescribe 추천값을 사용한다.
 */
export async function addExerciseToTodayAction(
  dayIndex: number,
  focus: string,
  exerciseId: string,
  equipment: EquipmentId,
): Promise<SavePlanResult> {
  if (!ALL_FOCUSES.includes(focus as (typeof ALL_FOCUSES)[number])) {
    return { ok: false, error: "부위가 올바르지 않습니다." };
  }
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) {
    return { ok: false, error: "일차 값이 올바르지 않습니다." };
  }
  if (!getCatalogExercise(exerciseId) || !isEquipmentId(equipment)) {
    return { ok: false, error: "운동/기구 값이 올바르지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const profile = await getUserProfile();
  if (!profile) return { ok: false, error: "프로필이 필요합니다." };

  const p = prescribe(exerciseId, {
    gender: profile.gender,
    experience: profile.experience,
    bodyType: profile.bodyType ?? ("average" as const),
    weightKg: profile.weightKg ?? 65,
  });

  const todayYmd = seoulYmd();

  // 새로 추가하는 운동은 부위 그룹 중간이 아니라 "오늘 전체 리스트 맨 아래"에
  // 붙어야 한다(멀티 부위 일자 포함). 그래서 그날(또는 그 날짜) 전 부위에서 가장
  // 큰 position 보다 큰 값 + 충분히 큰 append-base 를 부여한다.
  const appendPos = (currentMax: number) =>
    Math.max(currentMax + 1, APPEND_POSITION_BASE);

  // 오늘이 '오늘만 변경' 상태(마커 last_deferred_date / override_date, 또는 어떤
  // daily 오버라이드 존재)면 새 운동도 '오늘만'(daily_plan)에 넣는다. 그래야 직접
  // 담기 중 다른 부위(등 등)를 추가해도 영구 루틴이 아니라 오늘 화면에 바로 뜬다.
  // 일반 날은 기본 루틴(routine_exercises)에 추가(오늘 이후에도 유지).
  const [{ data: rtRow }, { data: dmax }] = await Promise.all([
    supabase
      .from("user_routines")
      .select("last_deferred_date, override_date")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("daily_plan")
      .select("position")
      .eq("user_id", user.id)
      .eq("for_date", todayYmd)
      .order("position", { ascending: false })
      .limit(1),
  ]);
  const rr = rtRow as {
    last_deferred_date?: string | null;
    override_date?: string | null;
  } | null;
  const isTodayChanged =
    (dmax && dmax.length > 0) ||
    rr?.last_deferred_date === todayYmd ||
    rr?.override_date === todayYmd;

  if (isTodayChanged) {
    const nextPos = appendPos((dmax?.[0]?.position as number | undefined) ?? -1);
    const ins = await supabase.from("daily_plan").insert({
      user_id: user.id,
      for_date: todayYmd,
      focus,
      position: nextPos,
      exercise_id: exerciseId,
      equipment,
      sets: p.sets,
      reps: p.reps,
      weight_kg: p.weightKg,
    });
    if (ins.error) return { ok: false, error: ins.error.message };
  } else {
    // 오버라이드 없음 → 기본 루틴의 그 일차에 append (오늘 이후에도 유지).
    // 그 일차 전 부위 통틀어 최대 position 기준으로 맨 아래에 붙인다.
    const { data: tail } = await supabase
      .from("routine_exercises")
      .select("position")
      .eq("user_id", user.id)
      .eq("day_index", dayIndex)
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = appendPos((tail?.[0]?.position as number | undefined) ?? -1);
    const ins = await supabase.from("routine_exercises").insert({
      user_id: user.id,
      day_index: dayIndex,
      focus,
      position: nextPos,
      exercise_id: exerciseId,
      equipment,
      sets: p.sets,
      reps: p.reps,
      weight_kg: p.weightKg,
    });
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  // 신규 행이 추가됐으므로 캐시 무효화는 필요 — 클라이언트가 router.refresh() 호출해 보여줌
  revalidatePath("/routine");
  return { ok: true };
}

/**
 *"오늘만 루틴 변경 → 추천 운동으로": 오늘을 해당 부위로 바꾸고(override),
 * 그 부위의 등록 운동을 체형 맞춤 추천으로 채워 넣는다.
 */
export async function applyTodayRecommendedAction(
  focus: string,
): Promise<void> {
  const target = ALL_FOCUSES.find((f) => f === focus);
  if (!target) return;

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return;

  const [profile, gym, routine] = await Promise.all([
    getUserProfile(),
    getCurrentGym(),
    getUserRoutine(),
  ]);
  if (!profile) return;
  const gymSet = toGymEquipmentSet(gym?.equipmentIds ?? null);

  await supabase
    .from("user_routines")
    .update({
      override_date: seoulYmd(),
      override_block: target,
      rest_date: null,
    })
    .eq("user_id", user.id);

  // 오늘 화면이 이 부위를 읽을 일차와 같은 곳에 써야 한다 — 그 부위가 루틴에
  // 있으면 첫 등장 일차, 없으면 오늘 일차.
  const slots = routine
    ? routineDaySlots(routine.splits, routine.variantId, routine.customWeek)
    : [];
  const offsetToday = routine
    ? routineDayOffset(routine.startDate, seoulYmd())
    : 0;
  const dayIndex = firstDayIndexForFocus(slots, target) ?? offsetToday;

  const opts = {
    gender: profile.gender,
    experience: profile.experience,
    bodyType: profile.bodyType ?? ("average" as const),
    weightKg: profile.weightKg ?? 65,
  };
  const rows = exercisesForFocus(target, profile.gender).map((ex, index) => {
    const p = prescribe(ex.id, opts);
    return {
      user_id: user.id,
      day_index: dayIndex,
      focus: target,
      position: index,
      exercise_id: ex.id,
      equipment: pickEquipment(ex, gymSet),
      sets: p.sets,
      reps: p.reps,
      weight_kg: p.weightKg,
    };
  });

  await supabase
    .from("routine_exercises")
    .delete()
    .eq("user_id", user.id)
    .eq("day_index", dayIndex)
    .eq("focus", target);
  if (rows.length > 0) {
    await supabase.from("routine_exercises").insert(rows);
  }

  revalidatePath("/routine");
}
