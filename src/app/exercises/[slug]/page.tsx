import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Target } from "lucide-react";

import { FeedbackSection } from "@/features/exercises/components/feedback-section";
import { VideoUploadForm } from "@/features/exercises/components/video-upload-form";
import {
  getExerciseBySlug,
  getExerciseVideos,
} from "@/features/exercises/data";

export const dynamic = "force-dynamic";

type ExerciseDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const difficultyLabels = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
};

export async function generateMetadata({
  params,
}: ExerciseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const exercise = await getExerciseBySlug(slug);

  return {
    title: exercise ? `${exercise.name} | Health Platform MVP` : "운동 상세",
  };
}

export default async function ExerciseDetailPage({
  params,
}: ExerciseDetailPageProps) {
  const { slug } = await params;
  const exercise = await getExerciseBySlug(slug);

  if (!exercise) {
    notFound();
  }

  const videos = await getExerciseVideos(exercise.id);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950 sm:px-10">
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950"
            href="/exercises"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            운동 리스트
          </Link>

          <header className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {difficultyLabels[exercise.difficulty]}
              </span>
              <span className="text-sm text-zinc-500">{exercise.equipment}</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
              {exercise.name}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-600">
              {exercise.summary}
            </p>
          </header>

          <FeedbackSection videos={videos} />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <VideoUploadForm exerciseId={exercise.id} />

          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Target aria-hidden="true" className="text-orange-700" size={20} />
              <h2 className="text-lg font-semibold text-zinc-950">
                주요 자극 부위
              </h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {exercise.targetMuscles.map((muscle) => (
                <span
                  className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700"
                  key={muscle}
                >
                  {muscle}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2
                aria-hidden="true"
                className="text-emerald-700"
                size={20}
              />
              <h2 className="text-lg font-semibold text-zinc-950">
                자세 체크 포인트
              </h2>
            </div>
            <ul className="mt-4 space-y-3">
              {exercise.cues.map((cue) => (
                <li className="flex gap-2 text-sm leading-6 text-zinc-700" key={cue}>
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-emerald-600"
                    size={16}
                  />
                  {cue}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
}
