"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { getUserProfile } from "@/features/profile/data-access";
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
  isValidSetDetails,
  toRowFields,
  type SetDetail,
} from "@/features/routine/set-details";
import { registerRecommendedConditioningAction } from "@/features/routine/conditioning-actions";

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
 * 추천 운동들로 등록: 모든 부위에 대해 (성별·경력·체형) 기반
 * 운동/세트/횟수/무게를 채워 넣는다(기존 등록은 대체). 루틴이 무분할이거나
 *"오늘만 다른 부위"로 바뀌어도 항상 해당 부위 계획이 존재하도록 전 부위 등록.
 */
export async function registerRecommendedPlanAction(): Promise<SavePlanResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const [profile, gym] = await Promise.all([getUserProfile(), getCurrentGym()]);
  if (!profile) return { ok: false, error: "프로필이 필요합니다." };
  const gymSet = toGymEquipmentSet(gym?.equipmentIds ?? null);

  const gender = profile.gender;
  const opts = {
    gender,
    experience: profile.experience,
    bodyType: profile.bodyType ?? ("average" as const),
    weightKg: profile.weightKg ?? 65,
  };

  const rows = ALL_FOCUSES.flatMap((focus) =>
    exercisesForFocus(focus, gender).map((ex, index) => {
      const p = prescribe(ex.id, opts);
      return {
        user_id: user.id,
        focus,
        position: index,
        exercise_id: ex.id,
        equipment: pickEquipment(ex, gymSet),
        sets: p.sets,
        reps: p.reps,
        weight_kg: p.weightKg,
      };
    }),
  );

  const del = await supabase
    .from("routine_exercises")
    .delete()
    .eq("user_id", user.id);
  if (del.error) return { ok: false, error: del.error.message };

  if (rows.length > 0) {
    const ins = await supabase.from("routine_exercises").insert(rows);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  // 워밍업·마무리도 기본 추천으로 함께 채운다
  await registerRecommendedConditioningAction();

  revalidatePath("/");
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
 * 직접 등록: 특정 부위의 운동 목록을 통째로 교체한다.
 */
export async function saveManualPlanAction(
  focus: string,
  items: ManualPlanItem[],
): Promise<SavePlanResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

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
    .eq("focus", focus);
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
    .eq("focus", focus);
  if (del.error) return { ok: false, error: del.error.message };

  if (items.length > 0) {
    const rows = items.map((it, index) => ({
      user_id: user.id,
      focus,
      position: index,
      exercise_id: it.exerciseId,
      equipment: it.equipment,
      ...toRowFields(it),
      memo: memoByExercise.get(it.exerciseId) ?? null,
    }));
    const ins = await supabase.from("routine_exercises").insert(rows);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  revalidatePath("/");
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

  const [profile, gym] = await Promise.all([getUserProfile(), getCurrentGym()]);
  if (!profile) return { ok: false, error: "프로필이 필요합니다." };
  const gymSet = toGymEquipmentSet(gym?.equipmentIds ?? null);
  const opts = {
    gender: profile.gender,
    experience: profile.experience,
    bodyType: profile.bodyType ?? ("average" as const),
    weightKg: profile.weightKg ?? 65,
  };

  for (const [focus, exerciseIds] of byFocus) {
    // 기존 메모 보존 (운동 id 기준)
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

    const del = await supabase
      .from("routine_exercises")
      .delete()
      .eq("user_id", user.id)
      .eq("focus", focus);
    if (del.error) return { ok: false, error: del.error.message };

    const rows = exerciseIds.map((exerciseId, index) => {
      const ex = getCatalogExercise(exerciseId)!;
      const p = prescribe(exerciseId, opts);
      return {
        user_id: user.id,
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

  revalidatePath("/");
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
  focus: string,
  exerciseId: string,
  equipment: EquipmentId,
): Promise<SavePlanResult> {
  if (!ALL_FOCUSES.includes(focus as (typeof ALL_FOCUSES)[number])) {
    return { ok: false, error: "부위가 올바르지 않습니다." };
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

  // 같은 부위 daily_plan 오버라이드가 이미 있으면 거기에 append (오늘만)
  const { data: daily } = await supabase
    .from("daily_plan")
    .select("position")
    .eq("user_id", user.id)
    .eq("for_date", todayYmd)
    .eq("focus", focus)
    .order("position", { ascending: false })
    .limit(1);

  if (daily && daily.length > 0) {
    const nextPos = (daily[0].position as number) + 1;
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
    // 오버라이드 없음 → 기본 루틴에 append (오늘 이후에도 유지)
    const { data: tail } = await supabase
      .from("routine_exercises")
      .select("position")
      .eq("user_id", user.id)
      .eq("focus", focus)
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = ((tail?.[0]?.position as number | undefined) ?? -1) + 1;
    const ins = await supabase.from("routine_exercises").insert({
      user_id: user.id,
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
  revalidatePath("/");
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

  const [profile, gym] = await Promise.all([getUserProfile(), getCurrentGym()]);
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
    .eq("focus", target);
  if (rows.length > 0) {
    await supabase.from("routine_exercises").insert(rows);
  }

  revalidatePath("/");
}
