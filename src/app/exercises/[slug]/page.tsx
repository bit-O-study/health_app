import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayCircle, StickyNote } from "lucide-react";

import { PageHeader } from "@/components/page-header";
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

  const initialEquipment = (isEquipmentId(eq) ? exercise.equipments.find((item) => item.equipment === eq)?.equipment : undefined) ?? exercise.equipments[0].equipment;
  const photoFrames = exercisePhotoFrames(slug, initialEquipment);

  // 영상/피드백은 Supabase 에 해당 종목 행이 있을 때만 제공
  const supaExercise = await getExerciseBySlug(slug);
  const [videos, media, memo] = await Promise.all([
    supaExercise ? getExerciseVideos(supaExercise.id) : Promise.resolve([]),
    getExerciseMedia(slug, initialEquipment),
    getMemoForExercise(slug),
  ]);

  // 공통 머리글(운동 이름 = 큰 제목) + 섹션 라벨 + 카드를 한 줄로 내려 읽는다(2026-09-16 8단계).
  // 넓은 화면 2단 배치·오른쪽 '자극 부위' 카드·빈 안내 카드는 뺐다.
  return (
    <div className="app-page">
      <PageHeader title={exercise.name} back />
      <main className="app-container space-y-4">
        {/* 부위 배지 + 자극 부위 한 줄 — 옛 머리 카드와 '자극 부위' 카드를 하나로. */}
        <div className="flex items-center gap-3 px-1">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <ExerciseIcon id={exercise.id} size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1">
              {bodyPartsFor(exercise.id).map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
                >
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand" />
                  {BODY_PART_LABEL[p]}
                </span>
              ))}
            </div>
            <p className="mt-0.5 text-sm leading-5 text-zinc-500 dark:text-zinc-400">
              {exercise.target}
            </p>
          </div>
        </div>

        {media ? (
          <section>
            <h2 className="app-section-label">시범 영상</h2>
            <MediaEmbed url={media.url} kind={media.kind} />
          </section>
        ) : photoFrames ? (
          <section>
            <h2 className="app-section-label">동작 시범</h2>
            <div className="app-card p-3">
              <ExercisePhotoDemo frames={photoFrames} cycleMs={2200} />
            </div>
          </section>
        ) : (
          // 내부 시범 자료도 없을 때만 유튜브 검색으로 보완한다.
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise.name} 운동법`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="app-list app-row app-press"
          >
            <PlayCircle aria-hidden="true" className="shrink-0 text-danger" size={20} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              유튜브에서 ‘{exercise.name}’ 운동법 보기
            </span>
            <span aria-hidden="true" className="shrink-0 text-xs text-zinc-400">↗</span>
          </a>
        )}

        {memo ? (
          <section>
            <h2 className="app-section-label flex items-center gap-1">
              <StickyNote aria-hidden="true" size={13} />
              내 메모
            </h2>
            <p className="app-card whitespace-pre-wrap p-3 text-sm leading-6 text-zinc-800 dark:text-zinc-200">
              {memo}
            </p>
          </section>
        ) : null}

        <EquipmentMethod
          exercise={exercise}
          initialEquipment={initialEquipment}
        />

        {/* 자세 영상·피드백은 종목 행이 있을 때만 — 없으면 "준비되지 않았습니다" 카드 없이 생략. */}
        {supaExercise ? (
          <>
            <FeedbackSection videos={videos} />
            <VideoUploadForm exerciseId={supaExercise.id} />
          </>
        ) : null}
      </main>
    </div>
  );
}
