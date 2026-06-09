import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { isAdminUser } from "@/features/admin/admin";
import {
  ALL_EXERCISES,
  BODY_PART_LABEL,
  primaryBodyPart,
} from "@/features/routine/exercise-catalog";
import { getAllExerciseMedia } from "@/features/exercises/exercise-media";
import { AdminMediaManager } from "@/features/exercises/components/admin-media-manager";

export const dynamic = "force-dynamic";

export default async function AdminExerciseMediaPage() {
  // 관리자만 접근 — 아니면 404 (페이지 존재를 노출하지 않음)
  if (!(await isAdminUser())) notFound();

  const media = await getAllExerciseMedia();

  const exercises = ALL_EXERCISES.map((e) => ({
    id: e.id,
    name: e.name,
    part: BODY_PART_LABEL[primaryBodyPart(e.id)],
  })).sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        href="/routine"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        홈
      </Link>
      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          운동 미디어 관리 (관리자)
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          운동별 시범 영상/움짤 URL 을 등록하면 모든 사용자의 운동 상세·운동
          시작(가이드) 화면에 표시됩니다. 유튜브/Vimeo 링크 또는 직접
          mp4/gif/이미지 URL 을 넣으세요.
        </p>
      </div>

      <AdminMediaManager exercises={exercises} initialMedia={media} />
    </main>
  );
}
