import Link from "next/link";
import { Flame, Plus, Wind } from "lucide-react";

import type { FocusTone } from "@/features/routine/data";
import {
  EQUIPMENT_LABELS,
  getCatalogExercise,
} from "@/features/routine/exercise-catalog";
import { getPlanForFocus } from "@/features/routine/plan";
import { getConditioningForFocus } from "@/features/routine/conditioning";
import {
  getConditioningItem,
  PARAM_UNIT,
} from "@/features/routine/conditioning-catalog";
import type { ConditioningRow } from "@/features/routine/conditioning";
import {
  TodayPlanList,
  type TodayPlanItem,
} from "@/features/routine/components/today-plan-list";

/** ConditioningRow → "5분 · 8km/h · 1%" 같은 디테일 문자열 */
function formatDetail(row: ConditioningRow): string {
  const parts: string[] = [];
  if (row.durationMin !== null) parts.push(`${row.durationMin}${PARAM_UNIT.duration}`);
  if (row.speed !== null) parts.push(`${row.speed}${PARAM_UNIT.speed}`);
  if (row.incline !== null) parts.push(`${row.incline}${PARAM_UNIT.incline}`);
  return parts.join(" · ");
}

/** 메인 "오늘의 운동" — 워밍업 + 본운동(등록 계획) + 마무리 */
export async function TodayExercises({ tone }: { tone: FocusTone }) {
  const [plan, conditioning] = await Promise.all([
    getPlanForFocus(tone),
    getConditioningForFocus(tone),
  ]);

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

      <ConditioningBlock kind="warmup" rows={conditioning.warmup} />

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
            드래그해서 순서를 바꿀 수 있어요
          </p>
          <TodayPlanList focus={tone} items={items} />
        </div>
      )}

      <ConditioningBlock kind="cooldown" rows={conditioning.cooldown} />
    </section>
  );
}

function ConditioningBlock({
  kind,
  rows,
}: {
  kind: "warmup" | "cooldown";
  rows: ConditioningRow[];
}) {
  const isWarm = kind === "warmup";
  const Icon = isWarm ? Flame : Wind;
  const label = isWarm ? "워밍업" : "마무리 운동";
  const hint = isWarm ? "약 5분" : "약 3~5분";
  const containerCls = isWarm
    ? "rounded-xl border border-amber-200 bg-amber-50/60 p-4"
    : "rounded-xl border border-sky-200 bg-sky-50/60 p-4";
  const badgeCls = isWarm
    ? "flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700"
    : "flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-700";

  return (
    <div className={containerCls}>
      <div className="mb-2 flex items-center gap-2">
        <span className={badgeCls}>
          <Icon aria-hidden="true" size={15} />
        </span>
        <h3 className="text-sm font-bold text-zinc-950">{label}</h3>
        <span className="text-xs text-zinc-500">{hint}</span>
        <Link
          href="/plan"
          className="ml-auto text-[11px] font-semibold text-emerald-700 hover:text-emerald-600"
        >
          편집
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-zinc-500">
          등록된 항목이 없습니다. /plan 에서 추가하거나 추천 등록으로 채워주세요.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => {
            const item = getConditioningItem(r.itemId);
            const name = item?.name ?? r.itemId;
            const detail = formatDetail(r);
            return (
              <li
                key={r.id}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="font-medium text-zinc-800">· {name}</span>
                {detail ? (
                  <span className="text-xs text-zinc-500">{detail}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
