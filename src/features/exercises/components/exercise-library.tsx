"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  BODY_PART_LABEL,
  BODY_PART_ORDER,
  EQUIPMENT_LABELS,
  type BodyPart,
  type CatalogExercise,
} from "@/features/routine/exercise-catalog";
import { ExerciseIcon } from "@/features/exercises/components/exercise-icon";

type Section = { part: BodyPart; items: CatalogExercise[] };

type FilterValue = BodyPart | "all";

export function ExerciseLibrary({ sections }: { sections: Section[] }) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const totalCount = useMemo(
    () => sections.reduce((sum, s) => sum + s.items.length, 0),
    [sections],
  );

  const visibleSections =
    filter === "all" ? sections : sections.filter((s) => s.part === filter);

  return (
    <>
      {/* 부위 필터 — 클릭한 부위 운동만 보임."전체" 로 해제 */}
      <div className="sticky top-[env(safe-area-inset-top)] z-10 -mx-6 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/90 dark:bg-zinc-900/90 px-6 py-3 backdrop-blur sm:-mx-10 sm:px-10">
        <nav className="-mb-1 flex flex-wrap items-center gap-1.5">
          <FilterChip
            label="전체"
            count={totalCount}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          {sections.map(({ part, items }) => (
            <FilterChip
              key={part}
              label={BODY_PART_LABEL[part]}
              count={items.length}
              active={filter === part}
              onClick={() => setFilter(part)}
            />
          ))}
        </nav>
      </div>

      {/* 부위별 섹션 */}
      <div className="space-y-10">
        {visibleSections.map(({ part, items }) => (
          <section key={part}>
            <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-zinc-200 dark:border-zinc-700 pb-2">
              <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-100">
                {BODY_PART_LABEL[part]}
              </h2>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {items.length}개
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {items.map((ex) => (
                <Link
                  key={ex.id}
                  href={`/exercises/${ex.id}`}
                  className="group rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                    <ExerciseIcon id={ex.id} size={28} />
                  </div>
                  <div className="mt-5 space-y-3">
                    <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
                      {ex.name}
                    </h3>
                    <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {ex.target}
                    </p>
                    <div className="flex flex-wrap items-center gap-1">
                      {ex.equipments.map((e) => (
                        <span
                          key={e.equipment}
                          className="rounded-full bg-zinc-100 dark:bg-zinc-700/50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300"
                        >
                          {EQUIPMENT_LABELS[e.equipment]}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      운동법 보기
                      <ArrowRight
                        aria-hidden="true"
                        className="transition group-hover:translate-x-1"
                        size={14}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition",
        active
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400",
      )}
    >
      {label}
      <span
        className={cn(
          "text-[10px] font-bold",
          active ? "text-emerald-100" : "text-zinc-400 dark:text-zinc-500",
        )}
      >
        {count}
      </span>
    </button>
  );
}
