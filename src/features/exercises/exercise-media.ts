import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MediaKind = "video" | "gif" | "image";

export type ExerciseMedia = {
  exerciseId: string;
  url: string;
  kind: MediaKind;
};

function toKind(v: unknown): MediaKind {
  return v === "gif" || v === "image" ? v : "video";
}

/** 단일 운동의 전역 미디어(관리자 등록). 없으면 null. */
export async function getExerciseMedia(
  exerciseId: string,
): Promise<ExerciseMedia | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exercise_media")
    .select("exercise_id, url, kind")
    .eq("exercise_id", exerciseId)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  const r = data[0] as { exercise_id: string; url: string; kind: unknown };
  return { exerciseId: r.exercise_id, url: r.url, kind: toKind(r.kind) };
}

/** 여러 운동의 미디어를 한 번에 — 가이드 큐/목록용. exerciseId → media 맵. */
export async function getExerciseMediaMap(
  exerciseIds: string[],
): Promise<Map<string, ExerciseMedia>> {
  const map = new Map<string, ExerciseMedia>();
  const ids = Array.from(new Set(exerciseIds)).filter(Boolean);
  if (ids.length === 0) return map;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exercise_media")
    .select("exercise_id, url, kind")
    .in("exercise_id", ids);
  if (error || !data) return map;
  for (const r of data as { exercise_id: string; url: string; kind: unknown }[]) {
    map.set(r.exercise_id, {
      exerciseId: r.exercise_id,
      url: r.url,
      kind: toKind(r.kind),
    });
  }
  return map;
}

/** 관리자 페이지용 — 등록된 모든 미디어. */
export async function getAllExerciseMedia(): Promise<ExerciseMedia[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exercise_media")
    .select("exercise_id, url, kind");
  if (error || !data) return [];
  return (data as { exercise_id: string; url: string; kind: unknown }[]).map(
    (r) => ({ exerciseId: r.exercise_id, url: r.url, kind: toKind(r.kind) }),
  );
}
