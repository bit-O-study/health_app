import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  BODY_PART_LABEL,
  BODY_PART_ORDER,
  EQUIPMENT_LABELS,
  groupedByBodyPart,
  type BodyPart,
  type CatalogExercise,
} from "@/features/routine/exercise-catalog";
import { ExerciseIcon } from "@/features/exercises/components/exercise-icon";

export const dynamic = "force-dynamic";

export default function ExercisesPage() {
  const grouped = groupedByBodyPart();

  const sections: { part: BodyPart; items: CatalogExercise[] }[] =
    BODY_PART_ORDER.map((part) => ({ part, items: grouped[part] }));

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950 sm:px-10">
      <section className="mx-auto w-full max-w-5xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Exercise library
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              운동 종목 리스트
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
              부위별로 정리한 운동 카탈로그. 운동을 누르면 사용 가능한 기구별
              운동법을 한 페이지에서 모두 확인할 수 있습니다.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100"
            href="/"
          >
            홈으로
          </Link>
        </div>

        {/* 부위 탭 */}
        <div className="sticky top-0 z-10 -mx-6 border-b border-zinc-200 bg-zinc-50/90 px-6 py-3 backdrop-blur sm:-mx-10 sm:px-10">
          <nav className="-mb-1 flex flex-wrap items-center gap-1.5">
            {sections.map(({ part, items }) => (
              <a
                key={part}
                href={`#${part}`}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              >
                {BODY_PART_LABEL[part]}
                <span className="text-[10px] font-bold text-zinc-400">
                  {items.length}
                </span>
              </a>
            ))}
          </nav>
        </div>

        {/* 부위별 섹션 */}
        <div className="space-y-10">
          {sections.map(({ part, items }) => (
            <section key={part} id={part} className="scroll-mt-24">
              <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-zinc-200 pb-2">
                <h2 className="text-xl font-bold text-zinc-950">
                  {BODY_PART_LABEL[part]}
                </h2>
                <span className="text-xs font-semibold text-zinc-500">
                  {items.length}개
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {items.map((ex) => (
                  <Link
                    key={ex.id}
                    href={`/exercises/${ex.id}`}
                    className="group rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                      <ExerciseIcon id={ex.id} size={28} />
                    </div>
                    <div className="mt-5 space-y-3">
                      <h3 className="text-base font-semibold text-zinc-950">
                        {ex.name}
                      </h3>
                      <p className="text-sm leading-6 text-zinc-600">
                        {ex.target}
                      </p>
                      <div className="flex flex-wrap items-center gap-1">
                        {ex.equipments.map((e) => (
                          <span
                            key={e.equipment}
                            className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600"
                          >
                            {EQUIPMENT_LABELS[e.equipment]}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
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
      </section>
    </main>
  );
}
