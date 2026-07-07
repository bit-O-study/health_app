import Link from "next/link";
import { Flame, Plus, Wind, Zap } from "lucide-react";

import { seoulYmd } from "@/features/routine/data";
import {
  EQUIPMENT_LABELS,
  getCatalogExercise,
  type FocusKey,
} from "@/features/routine/exercise-catalog";
import { getPlanForDayTones } from "@/features/routine/plan";
import { getDailyPlanForDate } from "@/features/routine/daily-plan";
import { getConditioningForFocus } from "@/features/routine/conditioning";
import { getDailyConditioning } from "@/features/routine/daily-conditioning";
import {
  conditioningDefaults,
  getConditioningItem,
  PARAM_UNIT,
  type ConditioningItem,
  type ConditioningParam,
} from "@/features/routine/conditioning-catalog";
import type { ConditioningRow } from "@/features/routine/conditioning";
import {
  estimateConditioningKcal,
  estimateStrengthKcal,
} from "@/features/routine/calories";
import {
  getTodayCompletedItems,
  getLastExerciseValues,
} from "@/features/routine/exercise-completions";
import {
  assignCompletions,
  exerciseCompletionKey,
} from "@/features/routine/completion-match";
import { orderMainPlan } from "@/features/routine/plan-order";
import { getExerciseMediaMap } from "@/features/exercises/exercise-media";
import { summarizeSetDetails } from "@/features/routine/set-details";
import {
  conditioningCompletionKey,
  getTodayCompletedConditioning,
} from "@/features/routine/conditioning-completions";
import {
  TodayPlanList,
  type TodayPlanItem,
} from "@/features/routine/components/today-plan-list";
import {
  TodayConditioningList,
  type TodayConditioningItem,
} from "@/features/routine/components/today-conditioning-list";
import { MarkAllDoneButton } from "@/features/routine/components/mark-all-done-button";
import { TodayEditBar } from "@/features/routine/components/today-edit-scope";
import { TodayOrderScope } from "@/features/routine/components/today-order-scope";
import { WorkoutSessionTimer } from "@/features/workout-timer/workout-session-timer";
import { EquipmentScanButton } from "@/features/equipment/components/equipment-scan-button";
import { RestTimerProvider } from "@/features/workout-timer/rest-timer";
import type { GuidedItem } from "@/features/workout-timer/guided-workout";

/** DB row 의 값이 비어 있으면 카탈로그 기본값을 대신 사용(파라미터별, 시간/속도/경사/세트/횟수) */
function effectiveValues(
  row: ConditioningRow,
  _item: ConditioningItem | undefined,
) {
  const d = conditioningDefaults(row.itemId);
  return {
    duration: row.durationMin ?? d.durationMin,
    speed: row.speed ?? d.speed,
    incline: row.incline ?? d.incline,
    sets: row.sets ?? d.sets,
    reps: row.reps ?? d.reps,
  };
}

function formatDetail(
  row: ConditioningRow,
  item: ConditioningItem | undefined,
): string {
  const v = effectiveValues(row, item);
  const params = item?.params ?? [];
  const valOf = (p: ConditioningParam): number | null =>
    p === "duration"
      ? v.duration
      : p === "speed"
        ? v.speed
        : p === "incline"
          ? v.incline
          : p === "sets"
            ? v.sets
            : v.reps;
  const parts: string[] = [];
  for (const p of params) {
    const x = valOf(p);
    if (x !== null) parts.push(`${x}${PARAM_UNIT[p]}`);
  }
  return parts.join(" · ");
}

export async function TodayExercises({
  tones,
  dayIndex,
  weightKg,
  hideVideos = false,
  showGuide = true,
  restSound = true,
  restHaptic = true,
  lockWeightReps = false,
  postureEnabled = false,
  equipmentScan = false,
  blankDefaults = false,
}: {
  /** 오늘의 부위 1개 이상 (멀티 부위 일자 지원). 첫 부위가 워밍업·마무리 기준 */
  tones: FocusKey[];
  /** 오늘의 주기 일차(0~6). 본운동을 이 일차에서 읽고, 오늘 운동 추가도 여기로. */
  dayIndex: number;
  weightKg: number | null;
  /** 개인설정 '운동영상 안 보기' — 운동 시작 시 영상 가이드 대신 타이머만. */
  hideVideos?: boolean;
  /** 개인설정: 상세 가이드 카드 표시. */
  showGuide?: boolean;
  /** 개인설정: 휴식 종료 소리 / 진동. */
  restSound?: boolean;
  restHaptic?: boolean;
  /** 개인설정: 무게·횟수 고정. false 면 메인에 무게/횟수 숨기고 운동모드에서 설정. */
  lockWeightReps?: boolean;
  /** 운동 모드 안 'AI 자세 분석' 노출(디버그 계정). */
  postureEnabled?: boolean;
  /** '운동 시작' 왼쪽 기구 스캔 아이콘 노출(디버그 계정). */
  equipmentScan?: boolean;
  /** '오늘만 변경'으로 하루 밀린 날 — 담지 않은 본운동/워밍업/마무리 기본값(러닝 등)을
   *  자동으로 채우지 않는다. 사용자가 직접 담은 것만 보인다. */
  blankDefaults?: boolean;
}) {
  const todayYmd = seoulYmd();
  const primaryTone = tones[0];
  const [
    defaultPlansPerTone,
    dailyPlan,
    defaults,
    daily,
    completedItems,
    completedCond,
    lastValues,
  ] = await Promise.all([
    // 일차별 독립 — 오늘 일차의 부위 운동만 읽는다. 다른 일차(부위 전체)로 폴백하면
    // 같은 부위가 여러 일차에 있을 때 행을 공유해, 한 일차에서 삭제하면 다른 일차에서도
    // 사라지는 누수가 생긴다. 그 일차에 운동이 없으면 빈 화면(등록 안내)을 보여준다.
    getPlanForDayTones(dayIndex, tones),
    getDailyPlanForDate(todayYmd),
    getConditioningForFocus(primaryTone),
    getDailyConditioning(todayYmd),
    getTodayCompletedItems(todayYmd),
    getTodayCompletedConditioning(todayYmd),
    getLastExerciseValues(),
  ]);

  // 본운동: 부위별로 daily_plan override 있으면 그것, 없으면 기본 plan
  // 멀티 부위 일자에서도 부위마다 독립적으로 판단하여 합친다.
  const dailyByFocus = new Map<string, typeof dailyPlan>();
  for (const row of dailyPlan) {
    const arr = dailyByFocus.get(row.focus) ?? [];
    arr.push(row);
    dailyByFocus.set(row.focus, arr);
  }
  // 부위별 plan 을 tones 순서로 이어 붙임(부위 그룹 순서).
  const groupedPlan = tones.flatMap((t, idx) => {
    const overrides = dailyByFocus.get(t);
    if (overrides && overrides.length > 0) {
      return overrides.map((d) => ({
        id: d.id,
        focus: d.focus,
        position: d.position,
        exerciseId: d.exerciseId,
        equipment: d.equipment,
        sets: d.sets,
        reps: d.reps,
        weightKg: d.weightKg,
        setDetails: d.setDetails,
        memo: d.memo,
      }));
    }
    // 밀린 날은 담지 않은 부위의 기본 본운동을 자동으로 채우지 않는다.
    return blankDefaults ? [] : defaultPlansPerTone[idx];
  });
  // 부위 경계를 넘어 드래그하면 전역 position 으로 재정렬돼 있으므로 그 순서를 따른다.
  // (기본 상태는 그룹 순서 유지 — orderMainPlan 참고)
  const orderedPlan = orderMainPlan(groupedPlan);
  // A: 비고정 모드면 운동별 '마지막 실제값'(가장 최근 완료 스냅샷)으로 미리 채운다 —
  // 루틴이 다시 돌아오거나 운동모드에 다시 들어가도 지난번 무게/횟수/세트로 시작한다.
  // (고정 모드는 사용자가 등록한 값을 그대로 유지.)
  const activePlan = lockWeightReps
    ? orderedPlan
    : orderedPlan.map((p) => {
        const last = lastValues.get(p.exerciseId);
        if (!last) return p;
        return {
          ...p,
          weightKg: last.weightKg ?? p.weightKg,
          reps: last.reps ?? p.reps,
          sets: last.sets ?? p.sets,
        };
      });

  // 완료 판정 + 완료 보존(고스트) — 완료 기록을 행에 1:1 배정해 과매칭을 막는다.
  // (같은 운동이 한 부위에 2개 있어도 완료 기록 수만큼만 done. 1개만 완료하면 1개만 done.)
  const mainRecords = completedItems.map((c) => ({
    id: c.exerciseRowId,
    key: exerciseCompletionKey(c.focus, c.exerciseId),
    status: c.status,
  }));
  const {
    statusById: mainStatusById,
    usedRecord,
    recordIndexById: mainRecordIndexById,
  } = assignCompletions(
    activePlan.map((p) => ({
      id: p.id,
      key: exerciseCompletionKey(p.focus, p.exerciseId),
    })),
    mainRecords,
  );

  /**
   * 칼로리용 '유효 세트수'. 완료된 본운동은 계획 기본 세트가 아니라 '실제로 한 세트수'
   * (완료 스냅샷)로 계산해, 운동모드·캘린더와 값이 일치하게 한다(비고정 모드에서 세트를
   * 바꿔 완료해도 바깥 칼로리가 운동모드와 같아진다). 완료 전엔 계획값(예상)을 쓴다.
   */
  const effMainSets = (rowId: string, planSets: number): number => {
    if (mainStatusById.get(rowId) !== "done") return planSets;
    const idx = mainRecordIndexById.get(rowId);
    const snap = idx != null ? completedItems[idx]?.sets : null;
    return typeof snap === "number" && snap > 0 ? snap : planSets;
  };
  // 활성 행에 배정되지 않은 완료 기록 → 고스트(부위를 '오늘만 바꾸기'로 바꿔 빠졌지만
  // 오늘 완료한 운동). 렌더 가능(exerciseId 있음)·키 중복 제거.
  const seenGhost = new Set<string>();
  const ghostPlan = completedItems
    .filter((c, i) => {
      if (usedRecord[i] || !c.exerciseId) return false;
      const key = exerciseCompletionKey(c.focus, c.exerciseId);
      if (seenGhost.has(key)) return false;
      seenGhost.add(key);
      return true;
    })
    .map((c, i) => {
      // 고스트 행 상태도 등록(자기 행 id = 완료 기록 row id).
      mainStatusById.set(c.exerciseRowId, c.status);
      return {
        id: c.exerciseRowId,
        focus: c.focus ?? primaryTone,
        position: 1_000_000 + i, // 항상 맨 뒤(완료 묶음)
        exerciseId: c.exerciseId as string,
        equipment: c.equipment,
        sets: c.sets,
        reps: c.reps,
        weightKg: c.weightKg,
        setDetails: c.setDetails,
        memo: null as string | null,
      };
    });
  // 활성 운동(위) + 완료로 남은 운동(아래) 순. 이후 계산은 이 합본을 기준으로 한다.
  const plan = [...activePlan, ...ghostPlan];
  const usingDailyPlan = tones.some((t) => dailyByFocus.has(t));

  // 본운동 시범 미디어(관리자 등록) — 가이드 큐에서 표출
  const mediaMap = await getExerciseMediaMap(plan.map((p) => p.exerciseId));

  const baseWarmupRows =
    daily.warmup.length > 0
      ? daily.warmup
      : blankDefaults
        ? []
        : defaults.warmup;
  const baseCooldownRows =
    daily.cooldown.length > 0
      ? daily.cooldown
      : blankDefaults
        ? []
        : defaults.cooldown;
  const isDailyWarmup = daily.warmup.length > 0;
  const isDailyCooldown = daily.cooldown.length > 0;

  // 워밍업/마무리 완료도 본운동과 똑같이 '행에 1:1 배정'한다(과매칭 방지). 같은 항목이
  // 여러 개(예: 경사·속도만 다른 쿨다운 러닝 3개)여도 완료 기록 수만큼만 done — 하나를
  // 완료해도 나머지 형제 행은 미완료로 남는다. (예전엔 (종류:항목) 키 폴백을 행마다
  // 독립으로 봐서, 러닝 1개만 완료해도 같은 러닝 전부 완료로 떴다.)
  const condRecords = completedCond.map((c) => ({
    id: c.sourceRowId,
    key: conditioningCompletionKey(c.kind, c.itemId),
    status: c.status,
  }));
  const activeCondRows = [...baseWarmupRows, ...baseCooldownRows];
  const {
    statusById: condStatusById,
    usedRecord: condUsed,
    recordIndexById: condRecordIndexById,
  } = assignCompletions(
    activeCondRows.map((r) => ({
      id: r.id,
      key: conditioningCompletionKey(r.kind, r.itemId),
    })),
    condRecords,
  );

  /** 완료된 컨디셔닝의 '실제 한 값'(스냅샷) — 운동모드에서 시간·속도를 바꿔 완료했으면
   *  그 값으로 칼로리를 계산해 운동모드·캘린더와 일치시킨다. 완료 전엔 행 기본값. */
  const condDoneSnap = (rowId: string) => {
    if (condStatusById.get(rowId) !== "done") return null;
    const idx = condRecordIndexById.get(rowId);
    return idx != null ? (completedCond[idx] ?? null) : null;
  };

  // 완료 보존(본운동과 동일): 활성 행에 배정되지 않은 완료 기록(루틴을 바꿔 오늘 목록에서
  // 빠졌지만 오늘 완료한 종목)을 완료 행으로 함께 보여준다. (종류:항목) 키 중복은 제외.
  const condGhostSeen = new Set<string>();
  function withCondGhosts(
    kind: "warmup" | "cooldown",
    baseRows: ConditioningRow[],
  ): ConditioningRow[] {
    const ghosts = completedCond
      .filter((c, i) => {
        if (c.kind !== kind || condUsed[i]) return false;
        const key = conditioningCompletionKey(c.kind, c.itemId);
        if (condGhostSeen.has(key)) return false;
        condGhostSeen.add(key);
        return true;
      })
      .map((c, i) => {
        // 고스트 자기 행 상태 등록(자기 행 id = 완료 기록 source_row_id).
        condStatusById.set(c.sourceRowId, c.status);
        return {
          id: c.sourceRowId,
          focus: primaryTone,
          kind: c.kind,
          position: 1_000_000 + i, // 항상 맨 뒤(완료 묶음)
          itemId: c.itemId,
          durationMin: c.durationMin,
          speed: c.speed,
          incline: c.incline,
          sets: c.sets,
          reps: c.reps,
          memo: null,
        };
      });
    return [...baseRows, ...ghosts];
  }
  const warmupRows = withCondGhosts("warmup", baseWarmupRows);
  const cooldownRows = withCondGhosts("cooldown", baseCooldownRows);

  const w = weightKg ?? 65;

  // Main 행 변환
  const items: TodayPlanItem[] = plan.map((item) => ({
    id: item.id,
    exerciseId: item.exerciseId,
    equipment: item.equipment,
    name: getCatalogExercise(item.exerciseId)?.name ?? item.exerciseId,
    equipmentLabel: EQUIPMENT_LABELS[item.equipment],
    // 완료된 운동은 실제 한 세트수로 표시(칼로리도 그 값으로 계산됨).
    sets: effMainSets(item.id, item.sets),
    reps: item.reps,
    weightKg: item.weightKg,
    setDetails: item.setDetails,
    focus: item.focus,
    memo: item.memo,
  }));
  // 완료 상태 — assignCompletions 로 행에 1:1 배정된 결과(과매칭 없음).
  const mainDoneIds = plan
    .filter((p) => mainStatusById.get(p.id) === "done")
    .map((p) => p.id);
  const mainSkippedIds = plan
    .filter((p) => mainStatusById.get(p.id) === "skipped")
    .map((p) => p.id);
  const mainSkipSet = new Set(mainSkippedIds);
  const mainDoneSet = new Set(mainDoneIds);

  // Conditioning 행 변환 (warmup/cooldown 공용 빌더) — rowId 기준
  function buildCondItems(rows: ConditioningRow[]) {
    const doneIds: string[] = [];
    const skippedIds: string[] = [];
    // 완료는 assignCompletions 로 행에 1:1 배정된 결과(condStatusById)로만 판정한다.
    // 행 id 로 직접 조회 — 키 폴백/배정은 위에서 이미 끝났다(과매칭 없음).
    const items: TodayConditioningItem[] = rows.map((r) => {
      const item = getConditioningItem(r.itemId);
      const name = item?.name ?? r.itemId;
      const detail = formatDetail(r, item) || "—";
      const eff = effectiveValues(r, item);
      const st = condStatusById.get(r.id);
      // 완료된 컨디셔닝은 운동모드에서 실제 한 시간·속도(스냅샷)로 칼로리 계산(값 일치).
      const snap = condDoneSnap(r.id);
      const kDur = snap?.durationMin ?? eff.duration;
      const kSpeed = snap?.speed ?? eff.speed;
      const kcal = Math.round(
        estimateConditioningKcal(w, r.itemId, kDur, kSpeed),
      );
      if (st === "done") doneIds.push(r.id);
      else if (st === "skipped") skippedIds.push(r.id);
      return {
        rowId: r.id,
        itemId: r.itemId,
        name,
        detail,
        kcal,
        durationMin: eff.duration,
        speed: eff.speed,
        incline: eff.incline,
        sets: eff.sets,
        reps: eff.reps,
        memo: r.memo,
      };
    });
    return { items, doneIds, skippedIds };
  }
  const warm = buildCondItems(warmupRows);
  const cool = buildCondItems(cooldownRows);
  const warmSkipSet = new Set(warm.skippedIds);
  const coolSkipSet = new Set(cool.skippedIds);
  const warmDoneSet = new Set(warm.doneIds);
  const coolDoneSet = new Set(cool.doneIds);

  // 칼로리 합산 — 스킵 제외
  const totalWarm = warm.items
    .filter((i) => !warmSkipSet.has(i.rowId))
    .reduce((s, i) => s + i.kcal, 0);
  const totalCool = cool.items
    .filter((i) => !coolSkipSet.has(i.rowId))
    .reduce((s, i) => s + i.kcal, 0);
  const totalMain = plan
    .filter((p) => !mainSkipSet.has(p.id))
    .reduce(
      (s, p) =>
        s + estimateStrengthKcal(w, p.exerciseId, effMainSets(p.id, p.sets)),
      0,
    );
  const totalKcal = Math.round(totalWarm + totalMain + totalCool);

  // 완료 칼로리 — done 만 합산
  const doneWarm = warm.items
    .filter((i) => warmDoneSet.has(i.rowId))
    .reduce((s, i) => s + i.kcal, 0);
  const doneCool = cool.items
    .filter((i) => coolDoneSet.has(i.rowId))
    .reduce((s, i) => s + i.kcal, 0);
  const doneMain = plan
    .filter((p) => mainDoneSet.has(p.id))
    .reduce(
      (s, p) =>
        s + estimateStrengthKcal(w, p.exerciseId, effMainSets(p.id, p.sets)),
      0,
    );
  const completedKcal = Math.round(doneWarm + doneMain + doneCool);

  // 가이드 운동 큐 — 워밍업 → 본운동 → 마무리 순서로 '모든' 항목을 담는다.
  // (완료/스킵 제외는 클라이언트 타이머가 서버 상태 + 로컬 오버라이드로 필터한다.
  //  서버에서 미리 빼면, 휴식 취소 후 바로 시작 시 그 운동이 큐에 없어서 안 뜬다.)
  const doneOrSkippedIds: string[] = [];
  const queueItems: GuidedItem[] = [];
  for (const wi of warm.items) {
    if (warmDoneSet.has(wi.rowId) || warmSkipSet.has(wi.rowId))
      doneOrSkippedIds.push(wi.rowId);
    const ci = getConditioningItem(wi.itemId);
    queueItems.push({
      kind: "warmup",
      rowId: wi.rowId,
      itemId: wi.itemId,
      name: wi.name,
      subtitle: wi.detail,
      method: ci?.method ?? [],
      durationMin: wi.durationMin,
      speed: wi.speed,
      incline: wi.incline,
      sets: wi.sets,
      reps: wi.reps,
      memo: wi.memo,
    });
  }
  for (const p of plan) {
    if (mainDoneSet.has(p.id) || mainSkipSet.has(p.id))
      doneOrSkippedIds.push(p.id);
    const ex = getCatalogExercise(p.exerciseId);
    const eq = ex?.equipments.find((e) => e.equipment === p.equipment);
    const subtitle =
      p.setDetails && p.setDetails.length > 0
        ? `${EQUIPMENT_LABELS[p.equipment]} · ${summarizeSetDetails(p.setDetails)}`
        : `${EQUIPMENT_LABELS[p.equipment]} · ${p.sets}세트 × ${p.reps}회${
            p.weightKg !== null ? ` · ${p.weightKg}kg` : " · 맨몸"
          }`;
    queueItems.push({
      kind: "main",
      rowId: p.id,
      exerciseId: p.exerciseId,
      equipment: p.equipment,
      focus: p.focus,
      name: ex?.name ?? p.exerciseId,
      subtitle,
      method: eq?.method ?? [],
      sets: p.sets,
      reps: p.reps,
      weightKg: p.weightKg,
      memo: p.memo,
      media: mediaMap.get(p.exerciseId)
        ? {
            url: mediaMap.get(p.exerciseId)!.url,
            kind: mediaMap.get(p.exerciseId)!.kind,
          }
        : null,
    });
  }
  for (const ci2 of cool.items) {
    if (coolDoneSet.has(ci2.rowId) || coolSkipSet.has(ci2.rowId))
      doneOrSkippedIds.push(ci2.rowId);
    const cat = getConditioningItem(ci2.itemId);
    queueItems.push({
      kind: "cooldown",
      rowId: ci2.rowId,
      itemId: ci2.itemId,
      name: ci2.name,
      subtitle: ci2.detail,
      method: cat?.method ?? [],
      durationMin: ci2.durationMin,
      speed: ci2.speed,
      incline: ci2.incline,
      sets: ci2.sets,
      reps: ci2.reps,
      memo: ci2.memo,
    });
  }

  return (
    // 편집모드(TodayEditScope)는 부모(page.tsx)가 7일 그리드까지 함께 감싼다 →
    // '편집하기' 하나로 본운동·컨디셔닝·하단 7일 순서변경을 모두 제어.
    <RestTimerProvider sound={restSound} haptic={restHaptic}>
      <TodayOrderScope>
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              오늘 할 운동
              {usingDailyPlan ? (
                <span className="ml-2 whitespace-nowrap rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-emerald-700 dark:text-emerald-400">
                  오늘만 변경됨
                </span>
              ) : null}
            </h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {equipmentScan ? <EquipmentScanButton /> : null}
              <WorkoutSessionTimer
                queueItems={queueItems}
                doneOrSkippedIds={doneOrSkippedIds}
                hideVideos={hideVideos}
                showGuide={showGuide}
                lockWeightReps={lockWeightReps}
                postureEnabled={postureEnabled}
              />
              <TodayEditBar />
            </div>
        </div>

        {/* 칼로리 카드 — 예상 + 완료 + 전부 완료 */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400">
              <Zap aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                칼로리
              </p>
              <p className="flex flex-wrap items-baseline gap-x-1 text-xl font-bold text-zinc-950 dark:text-zinc-100 sm:text-2xl">
                <span className="text-emerald-700 dark:text-emerald-400">
                  {completedKcal}
                </span>
                <span className="text-xs font-medium text-zinc-500 sm:text-sm">
                  kcal 완료
                </span>
                <span className="text-zinc-300 dark:text-zinc-600">/</span>
                <span>{totalKcal}</span>
                <span className="text-xs font-medium text-zinc-500 sm:text-sm">
                  kcal 예상
                </span>
              </p>
            </div>
            <MarkAllDoneButton
              planRows={plan
                .filter((p) => !mainSkipSet.has(p.id) && !mainDoneSet.has(p.id))
                .map((p) => ({
                  rowId: p.id,
                  snapshot: {
                    exerciseId: p.exerciseId,
                    equipment: p.equipment,
                    sets: p.sets,
                    reps: p.reps,
                    weightKg: p.weightKg,
                    setDetails: p.setDetails,
                    focus: p.focus,
                  },
                }))}
              warmup={warm.items
                .filter(
                  (i) => !warmSkipSet.has(i.rowId) && !warmDoneSet.has(i.rowId),
                )
                .map((i) => ({
                  rowId: i.rowId,
                  itemId: i.itemId,
                  snapshot: {
                    durationMin: i.durationMin,
                    speed: i.speed,
                    incline: i.incline,
                  },
                }))}
              cooldown={cool.items
                .filter(
                  (i) => !coolSkipSet.has(i.rowId) && !coolDoneSet.has(i.rowId),
                )
                .map((i) => ({
                  rowId: i.rowId,
                  itemId: i.itemId,
                  snapshot: {
                    durationMin: i.durationMin,
                    speed: i.speed,
                    incline: i.incline,
                  },
                }))}
            />
          </div>
        </div>

        {/* 워밍업 */}
        <ConditioningSection
          kind="warmup"
          rowsCount={warmupRows.length}
          isDailyOverride={isDailyWarmup}
          items={warm.items}
          doneIds={warm.doneIds}
          skippedIds={warm.skippedIds}
          focus={primaryTone}
          dateYmd={todayYmd}
          lockWeightReps={lockWeightReps}
        />

        {/* 본운동 */}
        {plan.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 p-6 text-center">
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              오늘 부위에 등록된 본운동이 없습니다.
            </p>
            <Link
              href="/plan"
              className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              <Plus aria-hidden="true" size={16} />
              운동 등록하기
            </Link>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-xs text-zinc-400 dark:text-zinc-500">
              → 오른쪽으로 끌면 완료 · ← 왼쪽으로 끌면 오늘 안 함(같은 방향으로
              다시 끌면 원상복구) · 순서 변경은 ‘편집하기’에서
            </p>
            <TodayPlanList
              key={`plan-${plan.map((p) => p.id).join("|")}-${mainDoneIds.join(",")}-${mainSkippedIds.join(",")}`}
              focus={primaryTone}
              tones={tones}
              dayIndex={dayIndex}
              items={items}
              weightKg={weightKg}
              doneIds={mainDoneIds}
              skippedIds={mainSkippedIds}
              lockWeightReps={lockWeightReps}
            />
          </div>
        )}

        {/* 마무리 */}
        <ConditioningSection
          kind="cooldown"
          rowsCount={cooldownRows.length}
          isDailyOverride={isDailyCooldown}
          items={cool.items}
          doneIds={cool.doneIds}
          skippedIds={cool.skippedIds}
          focus={primaryTone}
          dateYmd={todayYmd}
          lockWeightReps={lockWeightReps}
        />
        </section>
      </TodayOrderScope>
    </RestTimerProvider>
  );
}

function ConditioningSection({
  kind,
  rowsCount,
  isDailyOverride,
  items,
  doneIds,
  skippedIds,
  focus,
  dateYmd,
  lockWeightReps,
}: {
  kind: "warmup" | "cooldown";
  rowsCount: number;
  isDailyOverride: boolean;
  items: TodayConditioningItem[];
  doneIds: string[];
  skippedIds: string[];
  focus: string;
  dateYmd: string;
  lockWeightReps: boolean;
}) {
  const isWarm = kind === "warmup";
  const HeaderIcon = isWarm ? Flame : Wind;
  const label = isWarm ? "워밍업" : "마무리 운동";
  const headerBadge = isWarm
    ? "flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
    : "flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400";

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className={headerBadge}>
          <HeaderIcon aria-hidden="true" size={15} />
        </span>
        <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
          {label}
        </h3>
        {isDailyOverride ? (
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
            오늘만
          </span>
        ) : null}
      </div>

      {rowsCount === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 p-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          등록된 항목이 없습니다.{" "}
          <Link
            href="/plan"
            className="font-semibold text-emerald-700 dark:text-emerald-400"
          >
            /plan
          </Link>
          {" "}
          에서 추가하거나 “추천으로 채우기”를 사용하세요.
        </p>
      ) : (
        <TodayConditioningList
          key={`${kind}-${items.map((i) => i.rowId).join("|")}-${doneIds.join(",")}-${skippedIds.join(",")}`}
          kind={kind}
          items={items}
          doneIds={doneIds}
          skippedIds={skippedIds}
          iconTone={isWarm ? "amber" : "sky"}
          source={isDailyOverride ? "daily" : "default"}
          focus={focus}
          dateYmd={dateYmd}
          lockWeightReps={lockWeightReps}
        />
      )}
    </section>
  );
}
