import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Target } from "lucide-react";

import { FeedbackSection } from "@/features/exercises/components/feedback-section";
import { VideoUploadForm } from "@/features/exercises/components/video-upload-form";
import { EquipmentMethod } from "@/features/exercises/components/equipment-method";
import { ExerciseIcon } from "@/features/exercises/components/exercise-icon";
import {
  getExerciseBySlug,
  getExerciseVideos,
} from "@/features/exercises/data";
import {
  getCatalogExercise,
  isEquipmentId,
} from "@/features/routine/exercise-catalog";

export const dynamic = "force-dynamic";

type ExerciseDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ eq?: string }>;
};

export async function generateMetadata({
  params,
}: ExerciseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const exercise = getCatalogExercise(slug);
  return {
    title: exercise ? `${exercise.name} | Health Platform MVP` : "운동 상세",
  };
}

export default async function ExerciseDetailPage({
  params,
  searchParams,
}: ExerciseDetailPageProps) {
  const { slug } = await params;
  const { eq } = await searchParams;

  const exercise = getCatalogExercise(slug);
  if (!exercise) {
    notFound();
  }

  const initialEquipment = isEquipmentId(eq) ? eq : undefined;

  // 영상/피드백은 Supabase 에 해당 종목 행이 있을 때만 제공
  const supaExercise = await getExerciseBySlug(slug);
  const videos = supaExercise
    ? await getExerciseVideos(supaExercise.id)
    : [];

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950 sm:px-10">
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950"
            href="/exercises"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            운동 종목 리스트
          </Link>

          <header className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <ExerciseIcon id={exercise.id} size={36} />
              </span>
              <div>
                <h1 className="text-3xl font-bold sm:text-4xl">
                  {exercise.name}
                </h1>
                <p className="mt-1 text-sm text-zinc-500">{exercise.target}</p>
              </div>
            </div>
          </header>

          <EquipmentMethod
            exercise={exercise}
            initialEquipment={initialEquipment}
          />

          {supaExercise ? (
            <FeedbackSection videos={videos} />
          ) : (
            <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-sm leading-6 text-zinc-500">
              이 종목은 자세 영상·피드백이 아직 준비되지 않았습니다. 기구별
              운동법을 먼저 확인하세요.
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          {supaExercise ? (
            <VideoUploadForm exerciseId={supaExercise.id} />
          ) : null}

          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Target aria-hidden="true" className="text-orange-700" size={20} />
              <h2 className="text-lg font-semibold text-zinc-950">
                자극 부위
              </h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-700">
              {exercise.target}
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}