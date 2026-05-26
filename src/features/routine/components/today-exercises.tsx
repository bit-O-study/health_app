import Link from "next/link";
import { Flame, Plus, Wind, Zap } from "lucide-react";

import { seoulYmd } from "@/features/routine/data";
import {
  EQUIPMENT_LABELS,
  getCatalogExercise,
  type FocusKey,
} from "@/features/routine/exercise-catalog";
import { getPlanForFocus } from "@/features/routine/plan";
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
import { getStatusMapToday } from "@/features/routine/exercise-completions";
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
import { WorkoutSessionTimer } from "@/features/workout-timer/workout-session-timer";
import { RestTimerProvider } from "@/features/workout-timer/rest-timer";

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
  weightKg,
}: {
  /** 오늘의 부위 1개 이상 (멀티 부위 일자 지원). 첫 부위가 워밍업·마무리 기준 */
  tones: FocusKey[];
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
    Promise.all(tones.map((t) => getPlanForFocus(t))),
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
  const plan = tones.flatMap((t, idx) => {
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
      }));
    }
    return defaultPlansPerTone[idx];
  });
  const usingDailyPlan = tones.some((t) => dailyByFocus.has(t));

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
    focus: item.focus,
  }));
  const mainDoneIds = plan
    .filter((p) => mainStatus.get(p.id) === "done")
    .map((p) => p.id);
  const mainSkippedIds = plan
    .filter((p) => mainStatus.get(p.id) === "skipped")
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

  return (
    <TodayEditScope>
      <RestTimerProvider>
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
              <WorkoutSessionTimer />
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
