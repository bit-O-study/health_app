import "server-only";

import { cache } from "react";

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

/**
 * 등록된 전역 미디어 **전부**를 맵으로 — 요청 단위 캐시(React cache).
 *
 * 오늘 화면처럼 "어떤 운동이 뜰지는 앞선 조회가 끝나야 정해지는" 곳에서 id 로 좁혀 받으면,
 * 목록이 확정된 뒤에야 조회가 시작돼 **왕복이 한 번 더** 붙는다(서울↔싱가포르 70~90ms).
 * 이 표는 운동당 1행(관리자 등록)이라 전량 조회가 id 필터보다 비싸지 않으므로,
 * 첫 왕복과 함께 미리 시작해 두고 나중에 맵에서 꺼내 쓴다.
 */
export const getExerciseMediaMapAll = cache(
  async function getExerciseMediaMapAll(): Promise<Map<string, ExerciseMedia>> {
    const map = new Map<string, ExerciseMedia>();
    for (const m of await getAllExerciseMedia()) map.set(m.exerciseId, m);
    // 내장 미디어가 DB 등록분을 덮는다(getExerciseMedia 와 동일한 우선순위).
    for (const [id, m] of Object.entries(BUILT_IN_MEDIA)) map.set(id, m);
    return map;
  },
);

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
