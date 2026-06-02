import type { Metadata } from "next";
import Link from "next/link";

import {
  BODY_PART_ORDER,
  groupedByBodyPart,
  type BodyPart,
  type CatalogExercise,
} from "@/features/routine/exercise-catalog";
import { ExerciseLibrary } from "@/features/exercises/components/exercise-library";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "운동 종목 리스트",
  description:
    "가슴, 등, 어깨, 팔, 하체, 코어 운동을 부위별로 확인하고 기구별 운동법을 찾아보세요.",
  alternates: {
    canonical: absoluteUrl("/exercises"),
  },
  openGraph: {
    title: "운동 종목 리스트 | HELTCH",
    description:
      "부위별 헬스 운동 카탈로그와 기구별 운동 방법을 확인하세요.",
    url: absoluteUrl("/exercises"),
  },
};

export default function ExercisesPage() {
  const grouped = groupedByBodyPart();
  const sections: { part: BodyPart; items: CatalogExercise[] }[] =
    BODY_PART_ORDER.map((part) => ({ part, items: grouped[part] }));

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-6 py-10 text-zinc-950 dark:text-zinc-100 sm:px-10">
      <section className="mx-auto w-full max-w-5xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Exercise library
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              운동 종목 리스트
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400 sm:text-base">
              부위별로 정리한 운동 카탈로그. 상단 부위 칩으로 필터링하고, 운동을
              누르면 기구별 운동법을 확인할 수 있습니다.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 text-sm font-semibold text-zinc-800 dark:text-zinc-200 transition hover:border-zinc-400 dark:hover:border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            href="/"
          >
            홈으로
          </Link>
        </div>

        <ExerciseLibrary sections={sections} />
      </section>
    </main>
  );
}
