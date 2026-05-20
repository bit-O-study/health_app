import Link from "next/link";
import { ChevronRight, Dumbbell, Flame, Plus, Wind, Zap } from "lucide-react";

import { seoulYmd, type FocusTone } from "@/features/routine/data";
import {
  EQUIPMENT_LABELS,
  getCatalogExercise,
} from "@/features/routine/exercise-catalog";
import { getPlanForFocus } from "@/features/routine/plan";
import { getConditioningForFocus } from "@/features/routine/conditioning";
import { getDailyConditioning } from "@/features/routine/daily-conditioning";
import {
  getConditioningItem,
  PARAM_UNIT,
} from "@/features/routine/conditioning-catalog";
import type { ConditioningRow } from "@/features/routine/conditioning";
import {
  estimateConditioningKcal,
  estimateTodayKcal,
} from "@/features/routine/calories";
import { getStatusMapToday } from "@/features/routine/exercise-completions";
import {
  TodayPlanList,
  type TodayPlanItem,
} from "@/features/routine/components/today-plan-list";

function formatDetail(row: ConditioningRow): string {
  const parts: string[] = [];
  if (row.durationMin !== null) parts.push(`${row.durationMin}${PARAM_UNIT.duration}`);
  if (row.speed !== null) parts.push(`${row.speed}${PARAM_UNIT.speed}`);
  if (row.incline !== null) parts.push(`${row.incline}${PARAM_UNIT.incline}`);
  return parts.join(" · ");
}

/** 메인 "오늘의 운동" — 워밍업 + 본운동 + 마무리 + 칼로리 (행별 완료/스킵) */
export async function TodayExercises({
  tone,
  weightKg,
}: {
  tone: FocusTone;
  weightKg: number | null;
}) {
  const todayYmd = seoulYmd();
  const [plan, defaults, daily, statusMap] = await Promise.all([
    getPlanForFocus(tone),
    getConditioningForFocus(tone),
    getDailyConditioning(todayYmd),
    getStatusMapToday(todayYmd),
  ]);

  const warmupRows = daily.warmup.length > 0 ? daily.warmup : defaults.warmup;
  const cooldownRows =
    daily.cooldown.length > 0 ? daily.cooldown : defaults.cooldown;
  const isDailyWarmup = daily.warmup.length > 0;
  const isDailyCooldown = daily.cooldown.length > 0;

  const items: TodayPlanItem[] = plan.map((item) => ({
    id: item.id,
    exerciseId: item.exerciseId,
    equipment: item.equipment,
    name: getCatalogExercise(item.exerciseId)?.name ?? item.exerciseId,
    equipmentLabel: EQUIPMENT_LABELS[item.equipment],
    sets: item.sets,
    reps: item.reps,
    weightKg: item.weightKg,
  }));

  const doneIds = plan
    .filter((p) => statusMap.get(p.id) === "done")
    .map((p) => p.id);
  const skippedIds = plan
    .filter((p) => statusMap.get(p.id) === "skipped")
    .map((p) => p.id);
  const skippedSet = new Set(skippedIds);

  // 스킵된 본운동은 예상 칼로리 합산에서 제외
  const planForKcal = plan
    .filter((p) => !skippedSet.has(p.id))
    .map((p) => ({ exerciseId: p.exerciseId, sets: p.sets }));

  const kcal = estimateTodayKcal({
    weightKg,
    plan: planForKcal,
    warmup: warmupRows.map((r) => ({
      itemId: r.itemId,
      durationMin: r.durationMin,
      speed: r.speed,
    })),
    cooldown: cooldownRows.map((r) => ({
      itemId: r.itemId,
      durationMin: r.durationMin,
      speed: r.speed,
    })),
  });

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          오늘 할 운동
        </h2>
        <Link
          href="/plan"
          className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-600"
        >
          편집
        </Link>
      </div>

      {/* 예상 소모 칼로리 (스킵 제외 반영) */}
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
          <Zap aria-hidden="true" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            오늘 예상 소모 칼로리
          </p>
          <p className="text-2xl font-bold text-zinc-950">
            {kcal.total}
            <span className="ml-1 text-sm font-medium text-zinc-500">kcal</span>
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            워밍업 {kcal.warmup} · 본운동 {kcal.main} · 마무리 {kcal.cooldown}
            {skippedSet.size > 0 ? ` · 스킵 ${skippedSet.size}개 제외` : ""}
            {weightKg === null ? " · 체중 미입력(65kg 가정)" : ""}
          </p>
        </div>
      </div>

      <ConditioningBlock
        kind="warmup"
        rows={warmupRows}
        isDailyOverride={isDailyWarmup}
        weightKg={weightKg}
      />

      {plan.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center">
          <p className="text-sm leading-6 text-zinc-600">
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
          <p className="mb-2 text-xs text-zinc-400">
            드래그해서 순서 변경 · ✓ 완료 · ✕ 오늘 안 함(다시 누르면 되살림)
          </p>
          <TodayPlanList
            focus={tone}
            items={items}
            weightKg={weightKg}
            doneIds={doneIds}
            skippedIds={skippedIds}
          />
        </div>
      )}

      <ConditioningBlock
        kind="cooldown"
        rows={cooldownRows}
        isDailyOverride={isDailyCooldown}
        weightKg={weightKg}
      />
    </section>
  );
}

function ConditioningBlock({
  kind,
  rows,
  isDailyOverride,
  weightKg,
}: {
  kind: "warmup" | "cooldown";
  rows: ConditioningRow[];
  isDailyOverride: boolean;
  weightKg: number | null;
}) {
  const isWarm = kind === "warmup";
  const HeaderIcon = isWarm ? Flame : Wind;
  const label = isWarm ? "워밍업" : "마무리 운동";
  const headerBadge = isWarm
    ? "flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700"
    : "flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-700";
  const w = weightKg ?? 65;

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className={headerBadge}>
          <HeaderIcon aria-hidden="true" size={15} />
        </span>
        <h3 className="text-sm font-bold text-zinc-950">{label}</h3>
        {isDailyOverride ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            오늘만
          </span>
        ) : null}
        <Link
          href="/plan/today"
          className="ml-auto text-[11px] font-semibold text-emerald-700 hover:text-emerald-600"
        >
          오늘만 바꾸기
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-center text-xs text-zinc-500">
          등록된 항목이 없습니다.{" "}
          <Link href="/plan" className="font-semibold text-emerald-700">
            /plan
          </Link>{" "}
          에서 추가하거나 “추천으로 채우기”를 사용하세요.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const item = getConditioningItem(r.itemId);
            const name = item?.name ?? r.itemId;
            const detail = formatDetail(r);
            const kcal = Math.round(
              estimateConditioningKcal(w, r.itemId, r.durationMin, r.speed),
            );
            const iconWrap = isWarm
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700";
            return (
              <Link
                key={`${r.id}-${i}`}
                href={`/conditioning/${r.itemId}`}
                className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <span className={iconWrap}>
                  <Dumbbell aria-hidden="true" size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold text-zinc-950">{name}</h4>
                  <p className="mt-0.5 text-sm text-zinc-600">
                    {detail || "—"}
                    <span className="ml-2 text-xs text-orange-700">
                      · 약 {kcal}kcal
                    </span>
                  </p>
                </div>
                <ChevronRight
                  aria-hidden="true"
                  className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
                  size={18}
                />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
