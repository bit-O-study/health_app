"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyEnabled, notifyUser } from "@/features/notifications/push-fanout";
import { loadPreferences } from "@/features/notifications/preferences-data";
import {
  DEFAULT_PREFERENCES,
  decideSend,
  seoulHour,
} from "@/features/notifications/preferences";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { resolveMemberName } from "@/features/groups/member-name";
import { resolveVisibility, type Visibility } from "@/features/community/feed";
import { getUserRoutine } from "@/features/routine/data-access";
import { routineDaySlots } from "@/features/routine/data";
import {
  applyWeightPolicy,
  toConditioningRows,
  toRoutineRows,
  validateShareText,
  type ShareConditioning,
  type ShareExercise,
} from "@/features/routine-share/share";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/**
 * 내 루틴의 '한 일차'를 소개글로 올린다.
 *
 * ⚠ 참조가 아니라 **복사(스냅샷)** — 올린 뒤 내가 루틴을 고쳐도 이미 올린 글은 안 바뀐다.
 *   (남이 담아 간 루틴이 내 편집 때문에 소급해서 달라지면 안 되기 때문.)
 */
export async function shareRoutineDayAction(input: {
  dayIndex: number;
  title: string;
  caption: string;
  includeWeight: boolean;
  visibility?: Visibility;
  groupId?: string | null;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const bad = validateShareText(input.title, input.caption);
  if (bad) return { ok: false, error: bad };

  const vis = resolveVisibility(input.visibility, input.groupId ?? null);
  if (!vis.ok) return vis;

  const routine = await getUserRoutine();
  if (!routine) return { ok: false, error: "루틴이 없습니다." };
  const slots = routineDaySlots(
    routine.splits,
    routine.variantId,
    routine.customWeek,
  );
  const daySlots = slots.filter((s) => s.dayIndex === input.dayIndex);
  if (daySlots.length === 0)
    return { ok: false, error: "그 일차는 쉬는 날이에요." };
  const focuses = [...new Set(daySlots.map((s) => s.focus as string))];

  const supabase = await createSupabaseServerClient();
  const [{ data: prof }, { data: exRows }, { data: condRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("name, nickname")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("routine_exercises")
        .select("focus, position, exercise_id, equipment, sets, reps, weight_kg, memo")
        .eq("user_id", user.id)
        .eq("day_index", input.dayIndex)
        .order("position", { ascending: true }),
      // 워밍업/마무리는 부위 단위 — 이 일차의 부위 것만.
      supabase
        .from("routine_conditioning")
        .select("focus, kind, position, item_id, duration_min, speed, incline, sets, reps, memo")
        .eq("user_id", user.id)
        .in("focus", focuses)
        .order("position", { ascending: true }),
    ]);

  const exercises = applyWeightPolicy(
    (exRows ?? []) as ShareExercise[],
    input.includeWeight,
  );
  if (exercises.length === 0)
    return { ok: false, error: "그 일차에 등록된 운동이 없어요." };

  const authorName = resolveMemberName(
    (prof as { nickname?: string | null } | null)?.nickname,
    (prof as { name?: string | null } | null)?.name,
    null,
  );
  const caption = input.caption.trim();

  const { data, error } = await supabase
    .from("routine_shares")
    .insert({
      user_id: user.id,
      author_name: authorName,
      group_id: vis.groupId,
      visibility: vis.visibility,
      title: input.title.trim(),
      caption: caption.length > 0 ? caption : null,
      focus_blocks: focuses,
      exercises,
      conditioning: (condRows ?? []) as ShareConditioning[],
      include_weight: input.includeWeight,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  revalidatePath("/plan");
  return { ok: true, id: (data as { id: string }).id };
}

/**
 * 남의 소개 루틴을 **내 루틴의 한 일차로** 담는다.
 *
 * ⚠ 이건 '오늘만'이 아니라 **영구 루틴**을 바꾼다(docs/원칙.md 2번의 반대 방향) —
 *   호출하는 UI 가 "루틴이 바뀝니다" 를 먼저 확인받는다.
 * 대상 일차의 기존 본운동은 지우고 스냅샷으로 교체한다. 워밍업/마무리는 부위 단위라
 * 대상 일차의 부위로 갈아끼워 넣는다.
 */
export async function applyRoutineShareAction(
  shareId: string,
  dayIndex: number,
): Promise<ActionResult> {
  if (!shareId) return { ok: false, error: "소개글을 찾을 수 없습니다." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const routine = await getUserRoutine();
  if (!routine) return { ok: false, error: "루틴이 없습니다." };
  const slots = routineDaySlots(
    routine.splits,
    routine.variantId,
    routine.customWeek,
  );
  const target = slots.find((s) => s.dayIndex === dayIndex);
  if (!target) return { ok: false, error: "그 일차는 쉬는 날이에요." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("routine_shares")
    .select("exercises, conditioning, user_id, title")
    .eq("id", shareId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "소개글을 찾을 수 없습니다." };

  const snap = data as {
    exercises: unknown;
    conditioning: unknown;
    user_id: string;
    title: string;
  };
  const exSnap = Array.isArray(snap.exercises)
    ? (snap.exercises as ShareExercise[])
    : [];
  const condSnap = Array.isArray(snap.conditioning)
    ? (snap.conditioning as ShareConditioning[])
    : [];
  if (exSnap.length === 0)
    return { ok: false, error: "담을 운동이 없는 소개글이에요." };

  // 담는 쪽 부위로 통일 — 원본 부위를 그대로 쓰면 내 루틴에 없는 부위 운동이 생겨
  // 어느 화면에도 안 뜬다.
  const focus = target.focus as string;
  const rows = toRoutineRows(
    exSnap.map((e) => ({ ...e, focus })),
    user.id,
    dayIndex,
  );

  const del = await supabase
    .from("routine_exercises")
    .delete()
    .eq("user_id", user.id)
    .eq("day_index", dayIndex);
  if (del.error) return { ok: false, error: del.error.message };

  const ins = await supabase.from("routine_exercises").insert(rows);
  if (ins.error) return { ok: false, error: ins.error.message };

  if (condSnap.length > 0) {
    const delCond = await supabase
      .from("routine_conditioning")
      .delete()
      .eq("user_id", user.id)
      .eq("focus", focus);
    if (delCond.error) return { ok: false, error: delCond.error.message };
    const insCond = await supabase
      .from("routine_conditioning")
      .insert(toConditioningRows(condSnap, user.id, focus));
    if (insCond.error) return { ok: false, error: insCond.error.message };
  }

  // 담긴 수 +1 — 남의 글이라 update 권한이 없어 security definer rpc 로.
  await supabase.rpc("bump_routine_share_saves", { p_share_id: shareId });

  // 🔴 작성자에게 알린다. 설정 화면에는 '내 루틴 담김' 스위치가 **처음부터 있었는데
  //    보내는 코드가 없었다**(2026-09-09 발견) — 사용자는 있는 줄 아는 알림이 안 온 것이다.
  await notifyRoutineSaved(snap.user_id, user.id, snap.title);

  revalidatePath("/routine");
  revalidatePath("/plan");
  revalidatePath("/community");
  return { ok: true };
}

/** 좋아요 토글. 반환값은 토글 후 상태. */
export async function toggleRoutineShareLikeAction(
  shareId: string,
): Promise<{ ok: boolean; liked?: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("routine_share_likes")
    .select("share_id")
    .eq("share_id", shareId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (data) {
    const { error } = await supabase
      .from("routine_share_likes")
      .delete()
      .eq("share_id", shareId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, liked: false };
  }
  const { error } = await supabase
    .from("routine_share_likes")
    .insert({ share_id: shareId, user_id: user.id });
  if (error) return { ok: false, error: error.message };
  return { ok: true, liked: true };
}

/** 소개글 삭제 — 본인 또는 게시물 관리자. 권한은 RLS가 강제. */
export async function deleteRoutineShareAction(
  shareId: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("routine_shares")
    .delete()
    .eq("id", shareId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true };
}

/**
 * 소개 루틴 작성자에게 "누가 담았어요" 알림.
 *
 * 실패는 삼킨다 — 담기는 이미 끝났고, 알림 때문에 되돌릴 일이 아니다.
 * 자기 글을 자기가 담으면 안 보낸다(자기 행동을 자기에게 알릴 이유가 없다).
 */
async function notifyRoutineSaved(
  authorId: string,
  saverId: string,
  title: string,
): Promise<void> {
  try {
    if (authorId === saverId) return;
    if (!notifyEnabled()) return;
    const admin = createSupabaseAdminClient();
    if (!admin) return;
    const prefs =
      (await loadPreferences(admin, [authorId])).get(authorId) ?? DEFAULT_PREFERENCES;
    if (!decideSend(prefs, "routine-saved", seoulHour()).allowed) return;

    await notifyUser(admin, authorId, {
      type: "routine-saved",
      title: "내 루틴을 담았어요",
      // 🔴 담은 사람이 누구인지는 말하지 않는다 — 커뮤니티 글은 익명 열람이 기본이고,
      //    "누가 봤다"를 알리면 올리기가 부담스러워진다. 무엇이 담겼는지만 말한다.
      body: `"${title}" 을(를) 누군가 자기 루틴에 담았어요`,
      url: "/community",
    });
  } catch {
    /* 알림 실패는 무시 */
  }
}
