import Link from "next/link";
import { ArrowRight, Dumbbell } from "lucide-react";

import { getExercises } from "@/features/exercises/data";

export const dynamic = "force-dynamic";

const difficultyLabels = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
};

export default async function ExercisesPage() {
  const exercises = await getExercises();

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
              운동별 상세 페이지에서 자세 영상을 올리고 익명 피드백을 받을 수
              있습니다.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100"
            href="/"
          >
            홈으로
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {exercises.map((exercise) => (
            <Link
              className="group rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
              href={`/exercises/${exercise.slug}`}
              key={exercise.id}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                <Dumbbell aria-hidden="true" size={23} />
              </div>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-zinc-950">
                    {exercise.name}
                  </h2>
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                    {difficultyLabels[exercise.difficulty]}
                  </span>
                </div>
                <p className="text-sm leading-6 text-zinc-600">
                  {exercise.summary}
                </p>
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  상세 보기
                  <ArrowRight
                    aria-hidden="true"
                    className="transition group-hover:translate-x-1"
                    size={16}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
