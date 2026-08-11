import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { getUserRoutine } from "@/features/routine/data-access";
import { DAY_BLOCKS, routineDaySlots, type DayBlockId } from "@/features/routine/data";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { getConditioningItem } from "@/features/routine/conditioning-catalog";
import type {
  ApplyTarget,
  RoutineShareItem,
  ShareConditioning,
  ShareExercise,
} from "@/features/routine-share/share";
import { previewLine } from "@/features/routine-share/share";

export type { ApplyTarget, RoutineShareItem };

/** 부위 키 → 한글 라벨("back" → "등"). 모르는 키면 그대로. */
export function focusLabel(focus: string): string {
  return DAY_BLOCKS[focus as DayBlockId]?.label ?? focus;
}

type Row = {
  id: string;
  user_id: string;
  author_name: string;
  title: string;
  caption: string | null;
  focus_blocks: unknown;
  exercises: unknown;
  conditioning: unknown;
  include_weight: boolean;
  save_count: number;
  created_at: string;
};

const asExercises = (v: unknown): ShareExercise[] =>
  Array.isArray(v) ? (v as ShareExercise[]) : [];
const asConditioning = (v: unknown): ShareConditioning[] =>
  Array.isArray(v) ? (v as ShareConditioning[]) : [];
const asFocuses = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const SELECT =
  "id, user_id, author_name, title, caption, focus_blocks, exercises, conditioning, include_weight, save_count, created_at";

/**
 * 커뮤니티 '루틴' 피드. 공개범위는 RLS 가 거른다 — 여기선 정렬·개수만.
 * 좋아요는 한 번에 모아 읽는다(카드마다 왕복 금지).
 */
export async function getRoutineShares(limit = 30): Promise<RoutineShareItem[]> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("routine_shares")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  const rows = data as Row[];
  if (rows.length === 0) return [];

  const { data: likes } = await supabase
    .from("routine_share_likes")
    .select("share_id, user_id")
    .in("share_id", rows.map((r) => r.id));
  const countOf = new Map<string, number>();
  const mineLiked = new Set<string>();
  for (const l of (likes ?? []) as { share_id: string; user_id: string }[]) {
    countOf.set(l.share_id, (countOf.get(l.share_id) ?? 0) + 1);
    if (user && l.user_id === user.id) mineLiked.add(l.share_id);
  }

  return rows.map((r) => {
    const ex = asExercises(r.exercises).sort((a, b) => a.position - b.position);
    const focusBlocks = asFocuses(r.focus_blocks);
    return {
      id: r.id,
      title: r.title,
      caption: r.caption,
      authorName: r.author_name,
      focusBlocks,
      focusNames: focusBlocks.map(focusLabel),
      exerciseCount: ex.length,
      preview: previewLine(
        ex.map((e) => getCatalogExercise(e.exercise_id)?.name ?? e.exercise_id),
      ),
      includeWeight: r.include_weight,
      saveCount: r.save_count,
      likeCount: countOf.get(r.id) ?? 0,
      likedByMe: mineLiked.has(r.id),
      mine: user != null && r.user_id === user.id,
      createdAt: r.created_at,
      exercises: ex.map((e) => ({
        ...e,
        name: getCatalogExercise(e.exercise_id)?.name ?? e.exercise_id,
      })),
      conditioning: asConditioning(r.conditioning)
        .sort((a, b) => a.position - b.position)
        .map((c) => ({
          ...c,
          name: getConditioningItem(c.item_id)?.name ?? c.item_id,
        })),
    };
  });
}

/**
 * '내 루틴에 담기' 시트에 뿌릴 일차 목록. 각 일차의 현재 운동 수를 함께 준다
 * (비어 있으면 눌렀을 때 바로 담고, 차 있으면 덮어쓰기 확인).
 */
export async function getApplyTargets(): Promise<ApplyTarget[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const routine = await getUserRoutine();
  if (!routine) return [];

  const slots = routineDaySlots(
    routine.splits,
    routine.variantId,
    routine.customWeek,
  );
  // 일차당 한 줄 — 같은 날 부위가 여러 개면 첫 부위를 대표로 쓰고 라벨엔 모두 적는다.
  const byDay = new Map<number, { focus: string; labels: string[] }>();
  for (const s of slots) {
    const name = s.label.split(" · ").pop() ?? s.label;
    const cur = byDay.get(s.dayIndex);
    if (cur) cur.labels.push(name);
    else byDay.set(s.dayIndex, { focus: s.focus, labels: [name] });
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("routine_exercises")
    .select("day_index")
    .eq("user_id", user.id);
  const countOf = new Map<number, number>();
  for (const r of (data ?? []) as { day_index: number | null }[]) {
    if (r.day_index == null) continue;
    countOf.set(r.day_index, (countOf.get(r.day_index) ?? 0) + 1);
  }

  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dayIndex, v]) => ({
      dayIndex,
      focus: v.focus,
      label: `${dayIndex + 1}일차 · ${v.labels.join(" · ")}`,
      exerciseCount: countOf.get(dayIndex) ?? 0,
    }));
}
