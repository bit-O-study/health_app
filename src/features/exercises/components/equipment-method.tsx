"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
// ⚠ 라벨 계층만 import 한다 — exercise-catalog 를 쓰면 확장 카탈로그 315 KiB 가 딸려온다.
import {
  EQUIPMENT_LABELS,
  type CatalogExercise,
  type EquipmentId,
} from "@/features/routine/exercise-catalog-labels";
import { exerciseSummary } from "@/features/workout-timer/exercise-guides";

export function EquipmentMethod({
  exercise,
  initialEquipment,
}: {
  exercise: CatalogExercise;
  initialEquipment?: EquipmentId;
}) {
  const first =
    exercise.equipments.find((e) => e.equipment === initialEquipment)
      ?.equipment ?? exercise.equipments[0].equipment;
  const selected = first;

  const current =
    exercise.equipments.find((e) => e.equipment === selected) ??
    exercise.equipments[0];

  // 장황한 단계 나열 대신 한 줄 요약 + 핵심 포인트로 딱딱 간결하게.
  const summary = current.method?.length
    ? { oneLiner: current.method[0], cues: current.method.slice(1) }
    : exerciseSummary(exercise.id);

  // 섹션 라벨은 카드 밖, 기구는 한 줄 세그먼트 알약(2026-09-16 8단계 촘촘하게).
  return (
    <section>
      <h2 className="app-section-label">운동법 핵심</h2>
      <div className="app-card p-3">
        {/* 가능한 기구 (선택해 두면 루틴 등록 시 기본 기구로) */}
        <div className="flex flex-wrap gap-1.5">
          {exercise.equipments.map((e) => {
            const active = e.equipment === current.equipment;
            return (
              <Link
                key={e.equipment}
                href={`/exercises/${exercise.id}?eq=${e.equipment}`}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3 text-sm font-semibold transition",
                  active
                    ? "bg-brand text-white dark:text-zinc-950"
                    : "bg-zinc-100 text-zinc-700 active:bg-zinc-200 dark:bg-white/[0.08] dark:text-zinc-300",
                )}
              >
                {EQUIPMENT_LABELS[e.equipment]}
              </Link>
            );
          })}
        </div>

        {/* 한 줄 요약 — 핵심 자세/그립 → 타겟 */}
        <p className="mt-3 rounded-[10px] bg-brand-soft px-3 py-2 text-base font-semibold leading-6 text-brand">
          {summary.oneLiner}
        </p>

        {/* 핵심 포인트 */}
        {summary.cues.length > 0 ? (
          <ul className="mt-2.5 space-y-1.5">
            {summary.cues.map((c, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300"
              >
                <span aria-hidden="true" className="shrink-0 text-brand">
                  •
                </span>
                {c}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
