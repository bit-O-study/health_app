"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
// ⚠ 라벨 계층만 import 한다 — exercise-catalog 를 쓰면 확장 카탈로그 315 KiB 가 딸려온다.
// (운동 목록 데이터는 서버 페이지에서 props 로 받는다.)
import {
  BODY_PART_LABEL,
  BODY_PART_ORDER,
  EQUIPMENT_LABELS,
  type BodyPart,
  type CatalogExercise,
} from "@/features/routine/exercise-catalog-labels";
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

  // 부위 칩(가로 스크롤) + 부위별 그룹 목록 한 줄씩(2026-09-16 8단계 촘촘하게).
  // 옛 3열 큰 카드(아이콘·자극 부위 문장·'운동법 보기')는 한 줄 행(아이콘 · 이름/기구 · ›)으로.
  return (
    <>
      {/* 부위 필터 — 클릭한 부위 운동만 보임."전체" 로 해제 */}
      <div className="sticky top-[env(safe-area-inset-top)] z-10 -mx-4 bg-background/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <nav className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
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
      <div className="space-y-4">
        {visibleSections.map(({ part, items }) => (
          <section key={part}>
            <div className="flex items-baseline justify-between">
              <h2 className="app-section-label">{BODY_PART_LABEL[part]}</h2>
              <span className="mb-1.5 px-1 text-xs text-zinc-400">{items.length}개</span>
            </div>

            <ul className="app-list">
              {items.map((ex) => (
                <li key={ex.id}>
                  <Link
                    href={`/exercises/${ex.id}`}
                    className="app-row transition active:bg-zinc-100 dark:active:bg-white/[0.06]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <ExerciseIcon id={ex.id} size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base leading-5 text-zinc-900 dark:text-zinc-100">
                        {ex.name}
                      </span>
                      <span className="block truncate text-xs leading-4 text-zinc-500 dark:text-zinc-400">
                        {ex.equipments.map((e) => EQUIPMENT_LABELS[e.equipment]).join(" · ")}
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-zinc-400" />
                  </Link>
                </li>
              ))}
            </ul>
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
        "inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition",
        active
          ? "bg-brand text-white dark:text-zinc-950"
          : "bg-zinc-100 text-zinc-700 active:bg-zinc-200 dark:bg-white/[0.08] dark:text-zinc-300",
      )}
    >
      {label}
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          active ? "text-white/80 dark:text-zinc-950/70" : "text-zinc-400 dark:text-zinc-500",
        )}
      >
        {count}
      </span>
    </button>
  );
}
