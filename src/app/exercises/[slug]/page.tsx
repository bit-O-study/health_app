import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, PlayCircle, StickyNote, Target } from "lucide-react";

import { BackLink } from "@/components/back-link";
import { FeedbackSection } from "@/features/exercises/components/feedback-section";
import { VideoUploadForm } from "@/features/exercises/components/video-upload-form";
import { EquipmentMethod } from "@/features/exercises/components/equipment-method";
import { ExerciseIcon } from "@/features/exercises/components/exercise-icon";
import { MediaEmbed } from "@/features/exercises/components/media-embed";
import { ExercisePhotoDemo } from "@/features/workout-timer/exercise-photo-demo";
import { exercisePhotoFrames } from "@/features/workout-timer/exercise-photo-map";
import {
  getExerciseBySlug,
  getExerciseVideos,
} from "@/features/exercises/data";
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { getMemoForExercise } from "@/features/routine/plan";
import {
  BODY_PART_LABEL,
  BODY_PART_TONE,
  bodyPartsFor,
  getCatalogExercise,
  isEquipmentId,
} from "@/features/routine/exercise-catalog";
import { absoluteUrl } from "@/lib/seo";

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
  if (!exercise) {
    return {
      title: "운동 상세",
      robots: { index: false, follow: false },
    };
  }

  const description = `${exercise.name} 운동의 자극 부위, 기구별 자세 방법, 루틴 등록 전 확인할 핵심 포인트를 확인하세요.`;

  return {
    title: `${exercise.name} 자세와 운동법`,
    description,
    // 로그인 후에만 접근 가능(미들웨어 게이트) → 색인 제외.
    robots: { index: false, follow: false },
    alternates: {
      canonical: absoluteUrl(`/exercises/${exercise.id}`),
    },
    openGraph: {
      title: `${exercise.name} 자세와 운동법 | 헬쑤`,
      description,
      url: absoluteUrl(`/exercises/${exercise.id}`),
    },
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
  const photoFrames = exercisePhotoFrames(slug, initialEquipment);

  // 영상/피드백은 Supabase 에 해당 종목 행이 있을 때만 제공
  const supaExercise = await getExerciseBySlug(slug);
  const [videos, media, memo] = await Promise.all([
    supaExercise ? getExerciseVideos(supaExercise.id) : Promise.resolve([]),
    getExerciseMedia(slug),
    getMemoForExercise(slug),
  ]);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-6 py-10 text-zinc-950 dark:text-zinc-100 sm:px-10">
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <BackLink className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 transition hover:text-zinc-950 dark:hover:text-zinc-100">
            <ArrowLeft aria-hidden="true" size={16} />
            뒤로
          </BackLink>

          <header className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                <ExerciseIcon id={exercise.id} size={36} />
              </span>
              <div>
                <h1 className="text-3xl font-bold sm:text-4xl">
                  {exercise.name}
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {exercise.target}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {bodyPartsFor(exercise.id).map((p) => (
                    <span
                      key={p}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${BODY_PART_TONE[p]}`}
                    >
                      {BODY_PART_LABEL[p]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </header>

          {media ? (
            <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <PlayCircle
                  aria-hidden="true"
                  className="text-emerald-600 dark:text-emerald-400"
                  size={20}
                />
                <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">
                  시범 영상
                </h2>
              </div>
              <MediaEmbed url={media.url} kind={media.kind} />
            </section>
          ) : photoFrames ? (
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <div className="mb-3 flex items-center gap-2">
                <PlayCircle
                  aria-hidden="true"
                  className="text-emerald-600 dark:text-emerald-400"
                  size={20}
                />
                <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">
                  동작 시범
                </h2>
              </div>
              <ExercisePhotoDemo frames={photoFrames} cycleMs={2200} />
            </section>
          ) : (
            // 내부 시범 자료도 없을 때만 유튜브 검색으로 보완한다.
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise.name} 운동법`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm transition hover:border-emerald-300 dark:hover:border-emerald-700"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                <PlayCircle
                  aria-hidden="true"
                  className="text-red-600 dark:text-red-400"
                  size={20}
                />
                유튜브에서 ‘{exercise.name}’ 운동법 보기
              </span>
              <span className="shrink-0 text-xs font-semibold text-zinc-400">
                열기 ↗
              </span>
            </a>
          )}

          {memo ? (
            <section className="rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-5">
              <div className="mb-2 flex items-center gap-2">
                <StickyNote
                  aria-hidden="true"
                  className="text-amber-600 dark:text-amber-300"
                  size={18}
                />
                <h2 className="text-sm font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  내 메모
                </h2>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-amber-900 dark:text-amber-100">
                {memo}
              </p>
            </section>
          ) : null}

          <EquipmentMethod
            exercise={exercise}
            initialEquipment={initialEquipment}
          />

          {supaExercise ? (
            <FeedbackSection videos={videos} />
          ) : (
            <section className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 p-6 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              이 종목은 자세 영상·피드백이 아직 준비되지 않았습니다. 기구별
              운동법을 먼저 확인하세요.
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          {supaExercise ? (
            <VideoUploadForm exerciseId={supaExercise.id} />
          ) : null}

          <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Target
                aria-hidden="true"
                className="text-orange-700 dark:text-orange-400"
                size={20}
              />
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">
                자극 부위
              </h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {bodyPartsFor(exercise.id).map((p) => (
                <span
                  key={p}
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${BODY_PART_TONE[p]}`}
                >
                  {BODY_PART_LABEL[p]}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              {exercise.target}
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
