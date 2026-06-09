import Link from "next/link";
import { Flame, Plus, Wind, Zap } from "lucide-react";

import { seoulYmd } from "@/features/routine/data";
import {
  EQUIPMENT_LABELS,
  getCatalogExercise,
  type FocusKey,
} from "@/features/routine/exercise-catalog";
import { getPlanForDay, getPlanForFocus } from "@/features/routine/plan";
import { getDailyPlanForDate } from "@/features/routine/daily-plan";
import { getConditioningForFocus } from "@/features/routine/conditioning";
import { getDailyConditioning } from "@/features/routine/daily-conditioning";
import {
  getConditioningItem,
  PARAM_UNIT,
  type ConditioningItem,
} from "@/features/routine/conditioning-catalog";
import type { ConditioningRow } from "@/features/routine/conditioning";
import {
  estimateConditioningKcal,
  estimateStrengthKcal,
} from "@/features/routine/calories";
import {
  exerciseCompletionKey,
  getStatusMapToday,
} from "@/features/routine/exercise-completions";
import { orderMainPlan } from "@/features/routine/plan-order";
import { getExerciseMediaMap } from "@/features/exercises/exercise-media";
import { summarizeSetDetails } from "@/features/routine/set-details";
import { getConditioningStatusMapToday } from "@/features/routine/conditioning-completions";
import {
  TodayPlanList,
  type TodayPlanItem,
} from "@/features/routine/components/today-plan-list";
import {
  TodayConditioningList,
  type TodayConditioningItem,
} from "@/features/routine/components/today-conditioning-list";
import { MarkAllDoneButton } from "@/features/routine/components/mark-all-done-button";
import {
  TodayEditBar,
  TodayEditScope,
} from "@/features/routine/components/today-edit-scope";
import { TodayOrderScope } from "@/features/routine/components/today-order-scope";
import { WorkoutSessionTimer } from "@/features/workout-timer/workout-session-timer";
import { RestTimerProvider } from "@/features/workout-timer/rest-timer";
import type { GuidedItem } from "@/features/workout-timer/guided-workout";

/** DB row 의 값이 비어 있으면 카탈로그 기본값(defaultMin/Speed/Incline)을 대신 사용 */
function effectiveValues(
  row: ConditioningRow,
  item: ConditioningItem | undefined,
) {
  return {
    duration: row.durationMin ?? item?.defaultMin ?? null,
    speed: row.speed ?? item?.defaultSpeed ?? null,
    incline: row.incline ?? item?.defaultIncline ?? null,
  };
}

function formatDetail(
  row: ConditioningRow,
  item: ConditioningItem | undefined,
): string {
  const v = effectiveValues(row, item);
  const params = item?.params ?? [];
  const parts: string[] = [];
  if (v.duration !== null && params.includes("duration"))
    parts.push(`${v.duration}${PARAM_UNIT.duration}`);
  if (v.speed !== null && params.includes("speed"))
    parts.push(`${v.speed}${PARAM_UNIT.speed}`);
  if (v.incline !== null && params.includes("incline"))
    parts.push(`${v.incline}${PARAM_UNIT.incline}`);
  return parts.join(" ·");
}

export async function TodayExercises({
  tones,
  dayIndex,
  weightKg,
}: {
  /** 오늘의 부위 1개 이상 (멀티 부위 일자 지원). 첫 부위가 워밍업·마무리 기준 */
  tones: FocusKey[];
  /** 오늘의 주기 일차(0~6). 본운동을 이 일차에서 읽고, 오늘 운동 추가도 여기로. */
  dayIndex: number;
  weightKg: number | null;
}) {
  const todayYmd = seoulYmd();
  const primaryTone = tones[0];
  const [
    defaultPlansPerTone,
    dailyPlan,
    defaults,
    daily,
    mainStatus,
    condStatus,
  ] = await Promise.all([
    // 일차별 독립 — 오늘 일차의 부위 운동을 읽는다. 그 일차에 없으면(오버라이드
    // 데이 등) 부위 전체(union)로 폴백해 빈 화면을 막는다.
    Promise.all(
      tones.map(async (t) => {
        const byDay = await getPlanForDay(dayIndex, t);
        return byDay.length > 0 ? byDay : getPlanForFocus(t);
      }),
    ),
    getDailyPlanForDate(todayYmd),
    getConditioningForFocus(primaryTone),
    getDailyConditioning(todayYmd),
    getStatusMapToday(todayYmd),
    getConditioningStatusMapToday(todayYmd),
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
    return defaultPlansPerTone[idx];
  });
  // 부위 경계를 넘어 드래그하면 전역 position 으로 재정렬돼 있으므로 그 순서를 따른다.
  // (기본 상태는 그룹 순서 유지 — orderMainPlan 참고)
  const plan = orderMainPlan(groupedPlan);
  const usingDailyPlan = tones.some((t) => dailyByFocus.has(t));

  // 본운동 시범 미디어(관리자 등록) — 가이드 큐에서 표출
  const mediaMap = await getExerciseMediaMap(plan.map((p) => p.exerciseId));

  const warmupRows = daily.warmup.length > 0 ? daily.warmup : defaults.warmup;
  const cooldownRows =
    daily.cooldown.length > 0 ? daily.cooldown : defaults.cooldown;
  const isDailyWarmup = daily.warmup.length > 0;
  const isDailyCooldown = daily.cooldown.length > 0;

  const w = weightKg ?? 65;

  // Main 행 변환
  const items: TodayPlanItem[] = plan.map((item) => ({
    id: item.id,
    exerciseId: item.exerciseId,
    equipment: item.equipment,
    name: getCatalogExercise(item.exerciseId)?.name ?? item.exerciseId,
    equipmentLabel: EQUIPMENT_LABELS[item.equipment],
    sets: item.sets,
    reps: item.reps,
    weightKg: item.weightKg,
    setDetails: item.setDetails,
    focus: item.focus,
    memo: item.memo,
  }));
  // 완료 상태는 row_id 로 먼저, 없으면 (부위:운동) 키로 — 루틴을 바꿔 행 UUID 가
  // 새로 생겨도 오늘 완료한 운동이면 체크가 유지된다.
  const statusOf = (p: { id: string; focus: string; exerciseId: string }) =>
    mainStatus.get(p.id) ??
    mainStatus.get(exerciseCompletionKey(p.focus, p.exerciseId));
  const mainDoneIds = plan
    .filter((p) => statusOf(p) === "done")
    .map((p) => p.id);
  const mainSkippedIds = plan
    .filter((p) => statusOf(p) === "skipped")
    .map((p) => p.id);
  const mainSkipSet = new Set(mainSkippedIds);
  const mainDoneSet = new Set(mainDoneIds);

  // Conditioning 행 변환 (warmup/cooldown 공용 빌더) — rowId 기준
  function buildCondItems(rows: ConditioningRow[]) {
    const doneIds: string[] = [];
    const skippedIds: string[] = [];
    const items: TodayConditioningItem[] = rows.map((r) => {
      const item = getConditioningItem(r.itemId);
      const name = item?.name ?? r.itemId;
      const detail = formatDetail(r, item) || "—";
      const eff = effectiveValues(r, item);
      const kcal = Math.round(
        estimateConditioningKcal(w, r.itemId, eff.duration, eff.speed),
      );
      const st = condStatus.get(r.id);
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
    .reduce((s, p) => s + estimateStrengthKcal(w, p.exerciseId, p.sets), 0);
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
    .reduce((s, p) => s + estimateStrengthKcal(w, p.exerciseId, p.sets), 0);
  const completedKcal = Math.round(doneWarm + doneMain + doneCool);

  const skipCount = mainSkipSet.size + warmSkipSet.size + coolSkipSet.size;

  // 가이드 운동 큐 — 아직 완료/스킵 안 한 항목만, 워밍업 → 본운동 → 마무리 순서.
  const queueItems: GuidedItem[] = [];
  for (const wi of warm.items) {
    if (warmDoneSet.has(wi.rowId) || warmSkipSet.has(wi.rowId)) continue;
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
      memo: wi.memo,
    });
  }
  for (const p of plan) {
    if (mainDoneSet.has(p.id) || mainSkipSet.has(p.id)) continue;
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
    if (coolDoneSet.has(ci2.rowId) || coolSkipSet.has(ci2.rowId)) continue;
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
      memo: ci2.memo,
    });
  }

  return (
    <TodayEditScope>
      <RestTimerProvider>
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
            <div className="flex items-center gap-2">
              <WorkoutSessionTimer queueItems={queueItems} />
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
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                예상 — 워밍업 {Math.round(totalWarm)} · 본운동{" "}
                {Math.round(totalMain)} · 마무리 {Math.round(totalCool)}
                {skipCount > 0 ? ` · 스킵 ${skipCount}개 제외` : ""}
                {weightKg === null ? " · 체중 미입력(65kg 가정)" : ""}
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
              다시 끌면 원상복구) · 핸들 잡고 위·아래로 순서 변경
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
        />
        </section>
        </TodayOrderScope>
      </RestTimerProvider>
    </TodayEditScope>
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
}: {
  kind: "warmup" | "cooldown";
  rowsCount: number;
  isDailyOverride: boolean;
  items: TodayConditioningItem[];
  doneIds: string[];
  skippedIds: string[];
  focus: string;
  dateYmd: string;
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
        />
      )}
    </section>
  );
}
