import Link from "next/link";
import { Flame, Plus, Wind } from "lucide-react";

import type { FocusTone } from "@/features/routine/data";
import {
  EQUIPMENT_LABELS,
  getCatalogExercise,
} from "@/features/routine/exercise-catalog";
import { getPlanForFocus } from "@/features/routine/plan";
import {
  cooldownsFor,
  warmupsFor,
  type StretchItem,
} from "@/features/routine/stretches";
import {
  TodayPlanList,
  type TodayPlanItem,
} from "@/features/routine/components/today-plan-list";

/** 메인 "오늘의 운동" — 워밍업 + 본운동(등록 계획) + 마무리 */
export async function TodayExercises({ tone }: { tone: FocusTone }) {
  const [plan, warmups, cooldowns] = [
    await getPlanForFocus(tone),
    warmupsFor(tone),
    cooldownsFor(tone),
  ];

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

      {warmups.length > 0 ? (
        <StretchBlock
          label="워밍업 스트레칭"
          hint="약 5분"
          icon="warmup"
          items={warmups}
        />
      ) : null}

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

      {cooldowns.length > 0 ? (
        <StretchBlock
          label="마무리 운동"
          hint="약 3~5분"
          icon="cooldown"
          items={cooldowns}
        />
      ) : null}
    </section>
  );
}

function StretchBlock({
  label,
  hint,
  icon,
  items,
}: {
  label: string;
  hint: string;
  icon: "warmup" | "cooldown";
  items: StretchItem[];
}) {
  const isWarm = icon === "warmup";
  const Icon = isWarm ? Flame : Wind;
  return (
    <div
      className={
        isWarm
          ? "rounded-xl border border-amber-200 bg-amber-50/60 p-4"
          : "rounded-xl border border-sky-200 bg-sky-50/60 p-4"
      }
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={
            isWarm
              ? "flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700"
              : "flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-700"
          }
        >
          <Icon aria-hidden="true" size={15} />
        </span>
        <h3 className="text-sm font-bold text-zinc-950">{label}</h3>
        <span className="text-xs text-zinc-500">{hint}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((s) => (
          <li
            key={s.name}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span className="font-medium text-zinc-800">· {s.name}</span>
            <span className="text-xs text-zinc-500">{s.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
