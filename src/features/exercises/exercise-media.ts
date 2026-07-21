import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MediaKind = "video" | "gif" | "image";

export type ExerciseMedia = {
  exerciseId: string;
  url: string;
  kind: MediaKind;
};

const BUILT_IN_MEDIA: Record<string, ExerciseMedia> = {
  "bench-press": {
    exerciseId: "bench-press",
    url: "/exercise-guides/bench-press-multishot",
    kind: "video",
  },
  "lat-pulldown": {
    exerciseId: "lat-pulldown",
    url: "/exercise-guides/lat-pulldown.mp4",
    kind: "video",
  },
  "pull-up": {
    exerciseId: "pull-up",
    url: "/exercise-guides/pull-up.mp4",
    kind: "video",
  },
  "smith-squat": {
    exerciseId: "smith-squat",
    url: "/exercise-guides/squat.mp4",
    kind: "video",
  },
  "dumbbell-shoulder-press": {
    exerciseId: "dumbbell-shoulder-press",
    url: "/exercise-guides/dumbbell-shoulder-press.mp4",
    kind: "video",
  },
};

function toKind(v: unknown): MediaKind {
  return v === "gif" || v === "image" ? v : "video";
}

/** 단일 운동의 전역 미디어(관리자 등록). 없으면 null. */
export async function getExerciseMedia(
  exerciseId: string,
): Promise<ExerciseMedia | null> {
  const builtIn = BUILT_IN_MEDIA[exerciseId];
  if (builtIn) return builtIn;
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
  for (const id of ids) {
    const builtIn = BUILT_IN_MEDIA[id];
    if (builtIn) map.set(id, builtIn);
  }
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
  for (const id of ids) {
    const builtIn = BUILT_IN_MEDIA[id];
    if (builtIn) map.set(id, builtIn);
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
