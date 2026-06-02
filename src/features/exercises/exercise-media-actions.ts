"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { isAdminUser } from "@/features/admin/admin";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import type { MediaKind } from "@/features/exercises/exercise-media";

export type MediaActionResult = { ok: true } | { ok: false; error: string };

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** 관리자: 운동에 미디어(영상/움짤) URL 을 등록/수정. */
export async function setExerciseMediaAction(
  exerciseId: string,
  url: string,
  kind: MediaKind,
): Promise<MediaActionResult> {
  const user = await getCurrentUser();
  if (!(await isAdminUser())) {
    return { ok: false, error: "관리자만 등록할 수 있습니다." };
  }
  if (!getCatalogExercise(exerciseId)) {
    return { ok: false, error: "운동을 찾을 수 없습니다." };
  }
  const trimmed = url.trim();
  if (!isHttpUrl(trimmed)) {
    return { ok: false, error: "http(s) URL 을 입력하세요." };
  }
  if (!["video", "gif", "image"].includes(kind)) {
    return { ok: false, error: "미디어 종류가 올바르지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("exercise_media").upsert(
    {
      exercise_id: exerciseId,
      url: trimmed,
      kind,
      updated_by: user!.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "exercise_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/exercise-media");
  revalidatePath(`/exercises/${exerciseId}`);
  revalidatePath("/");
  return { ok: true };
}

/** 관리자: 운동 미디어 삭제. */
export async function deleteExerciseMediaAction(
  exerciseId: string,
): Promise<MediaActionResult> {
  if (!(await isAdminUser())) {
    return { ok: false, error: "관리자만 삭제할 수 있습니다." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("exercise_media")
    .delete()
    .eq("exercise_id", exerciseId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/exercise-media");
  revalidatePath(`/exercises/${exerciseId}`);
  revalidatePath("/");
  return { ok: true };
}
