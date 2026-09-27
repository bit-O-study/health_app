import { notFound } from "next/navigation";

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
    // 관리자 화면은 왼쪽 사이드바(admin/layout.tsx)로 오간다 — 다른 관리자 화면과
    // 같은 머리글 한 가지로 맞춘다(2026-09-18 8단계 마무리). 옛 `‹ 홈`(→/routine) 줄은 뺐다.
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
      <h1 className="mb-1 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
        운동 미디어
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        운동별 시범 영상/움짤 URL 을 등록하면 모든 사용자의 운동 상세·운동 시작(가이드)
        화면에 표시됩니다. 유튜브/Vimeo 링크 또는 직접 mp4/gif/이미지 URL 을 넣으세요.
      </p>

      <AdminMediaManager exercises={exercises} initialMedia={media} />
    </main>
  );
}
