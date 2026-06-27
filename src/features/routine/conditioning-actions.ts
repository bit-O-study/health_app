"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import {
  ALL_FOCUSES,
  type FocusKey,
} from "@/features/routine/exercise-catalog";
import {
  conditioningDefaults,
  defaultsFor,
  getConditioningItem,
  isConditioningKind,
  type ConditioningKind,
} from "@/features/routine/conditioning-catalog";

export type SaveConditioningResult =
  | { ok: true }
  | { ok: false; error: string };

export type ConditioningInput = {
  itemId: string;
  durationMin: number | null;
  speed: number | null;
  incline: number | null;
  sets: number | null;
  reps: number | null;
};

/**
 * 워밍업/마무리 1행의 메모만 저장 — 메인 화면 메모 버튼에서 사용.
 * rowId 는 routine_conditioning 또는 daily_conditioning 의 id. 빈 문자열이면 제거.
 */
export async function updateConditioningMemoAction(
  rowId: string,
  memo: string | null,
): Promise<SaveConditioningResult> {
  if (!rowId) return { ok: false, error: "행을 찾을 수 없습니다." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const value =
    typeof memo === "string" && memo.trim() !== ""
      ? memo.trim().slice(0, 1000)
      : null;

  const [rc, dc] = await Promise.all([
    supabase
      .from("routine_conditioning")
      .update({ memo: value })
      .eq("user_id", user.id)
      .eq("id", rowId),
    supabase
      .from("daily_conditioning")
      .update({ memo: value })
      .eq("user_id", user.id)
      .eq("id", rowId),
  ]);
  if (rc.error && dc.error) return { ok: false, error: rc.error.message };
  return { ok: true };
}

function isItemValidForKind(itemId: string, kind: ConditioningKind): boolean {
  const item = getConditioningItem(itemId);
  return !!item && item.kinds.includes(kind);
}

/** 특정 부위·종류의 컨디셔닝 항목 전체를 교체한다. */
export async function saveConditioningAction(
  focus: string,
  kind: string,
  items: ConditioningInput[],
): Promise<SaveConditioningResult> {
  if (!isConditioningKind(kind)) {
    return { ok: false, error: "워밍업/마무리 구분 값이 올바르지 않습니다." };
  }
  for (const it of items) {
    if (!isItemValidForKind(it.itemId, kind)) {
      return { ok: false, error: "선택한 항목이 이 종류와 맞지 않습니다." };
    }
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // 기존 메모를 item_id 기준으로 보존 (통째 교체 시 메모 유실 방지)
  const { data: prev } = await supabase
    .from("routine_conditioning")
    .select("item_id, memo")
    .eq("user_id", user.id)
    .eq("focus", focus)
    .eq("kind", kind);
  const memoByItem = new Map<string, string>();
  for (const r of (prev ?? []) as { item_id: string; memo?: unknown }[]) {
    if (typeof r.memo === "string" && r.memo.trim() !== "") {
      memoByItem.set(r.item_id, r.memo);
    }
  }

  const del = await supabase
    .from("routine_conditioning")
    .delete()
    .eq("user_id", user.id)
    .eq("focus", focus)
    .eq("kind", kind);
  if (del.error) return { ok: false, error: del.error.message };

  if (items.length > 0) {
    const rows = items.map((it, index) => ({
      user_id: user.id,
      focus,
      kind,
      position: index,
      item_id: it.itemId,
      duration_min: it.durationMin,
      speed: it.speed,
      incline: it.incline,
      sets: it.sets,
      reps: it.reps,
      memo: memoByItem.get(it.itemId) ?? null,
    }));
    const ins = await supabase.from("routine_conditioning").insert(rows);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  revalidatePath("/routine");
  revalidatePath("/plan");
  return { ok: true };
}

/**
 * 모든 부위 × 워밍업/마무리를 기본 추천으로 채운다(기존 컨디셔닝 대체).
 * registerRecommendedPlanAction 과 함께 호출돼 한 번에 전부 세팅.
 */
export async function registerRecommendedConditioningAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return;

  const kinds: ConditioningKind[] = ["warmup", "cooldown"];
  const rows = ALL_FOCUSES.flatMap((focus: FocusKey) =>
    kinds.flatMap((kind) =>
      defaultsFor(focus, kind).map((itemId, index) => {
        const d = conditioningDefaults(itemId);
        return {
          user_id: user.id,
          focus,
          kind,
          position: index,
          item_id: itemId,
          duration_min: d.durationMin,
          speed: d.speed,
          incline: d.incline,
          sets: d.sets,
          reps: d.reps,
        };
      }),
    ),
  );

  await supabase.from("routine_conditioning").delete().eq("user_id", user.id);

  if (rows.length > 0) {
    await supabase.from("routine_conditioning").insert(rows);
  }

  revalidatePath("/routine");
  revalidatePath("/plan");
}

/**
 * 메인"오늘의 운동" 편집 모드에서 워밍업/마무리 1개 항목을 즉시 추가한다.
 * - 해당 종류(warmup/cooldown) 의 daily_conditioning 오버라이드가 있으면 거기에 append (오늘만)
 * - 없으면 routine_conditioning (focus + kind) 에 append (영구)
 * 시간·속도·경사는 카탈로그 기본값으로 채운다.
 */
export async function addConditioningToTodayAction(
  focus: string,
  kind: string,
  itemId: string,
): Promise<SaveConditioningResult> {
  if (!isConditioningKind(kind)) {
    return { ok: false, error: "워밍업/마무리 구분이 올바르지 않습니다." };
  }
  if (!ALL_FOCUSES.includes(focus as FocusKey)) {
    return { ok: false, error: "부위가 올바르지 않습니다." };
  }
  const item = getConditioningItem(itemId);
  if (!item || !item.kinds.includes(kind)) {
    return { ok: false, error: "선택한 항목이 이 종류와 맞지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const todayYmd = seoulYmd();
  const { data: daily } = await supabase
    .from("daily_conditioning")
    .select("position")
    .eq("user_id", user.id)
    .eq("for_date", todayYmd)
    .eq("kind", kind)
    .order("position", { ascending: false })
    .limit(1);

  const d = conditioningDefaults(itemId);

  if (daily && daily.length > 0) {
    const nextPos = (daily[0].position as number) + 1;
    const ins = await supabase.from("daily_conditioning").insert({
      user_id: user.id,
      for_date: todayYmd,
      kind,
      position: nextPos,
      item_id: itemId,
      duration_min: d.durationMin,
      speed: d.speed,
      incline: d.incline,
      sets: d.sets,
      reps: d.reps,
    });
    if (ins.error) return { ok: false, error: ins.error.message };
  } else {
    const { data: tail } = await supabase
      .from("routine_conditioning")
      .select("position")
      .eq("user_id", user.id)
      .eq("focus", focus)
      .eq("kind", kind)
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = ((tail?.[0]?.position as number | undefined) ?? -1) + 1;
    const ins = await supabase.from("routine_conditioning").insert({
      user_id: user.id,
      focus,
      kind,
      position: nextPos,
      item_id: itemId,
      duration_min: d.durationMin,
      speed: d.speed,
      incline: d.incline,
      sets: d.sets,
      reps: d.reps,
    });
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  // 신규 행 추가 — 클라이언트가 router.refresh() 로 보여줌
  revalidatePath("/routine");
  return { ok: true };
}

/**
 * 워밍업/마무리 1행의 시간·속도·경사를 즉시 수정한다. rowId 는
 * routine_conditioning 또는 daily_conditioning 의 id 일 수 있다.
 * 완료/스킵 기록(conditioning_completions)은 건드리지 않는다.
 */
export async function updateConditioningRowAction(
  rowId: string,
  values: {
    durationMin: number | null;
    speed: number | null;
    incline: number | null;
    sets?: number | null;
    reps?: number | null;
  },
): Promise<SaveConditioningResult> {
  if (!rowId) return { ok: false, error: "행을 찾을 수 없습니다." };
  function inRange(v: number | null | undefined, max: number): boolean {
    if (v === null || v === undefined) return true;
    return Number.isFinite(v) && v >= 0 && v <= max;
  }
  if (
    !inRange(values.durationMin, 600) ||
    !inRange(values.speed, 200) ||
    !inRange(values.incline, 100) ||
    !inRange(values.sets, 20) ||
    !inRange(values.reps, 100)
  ) {
    return { ok: false, error: "값 범위가 올바르지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const update = {
    duration_min: values.durationMin,
    speed: values.speed,
    incline: values.incline,
    sets: values.sets ?? null,
    reps: values.reps ?? null,
  };
  await Promise.all([
    supabase
      .from("routine_conditioning")
      .update(update)
      .eq("user_id", user.id)
      .eq("id", rowId),
    supabase
      .from("daily_conditioning")
      .update(update)
      .eq("user_id", user.id)
      .eq("id", rowId),
    // 이미 기록된 완료 행의 snapshot 도 동기화 — 점수/기록 화면이 옛값으로 남지 않게.
    supabase
      .from("conditioning_completions")
      .update(update)
      .eq("user_id", user.id)
      .eq("source_row_id", rowId),
  ]);

  // 클라이언트 로컬 state 가 즉시 반영. revalidate 생략 — 인라인 저장 체감 지연 제거.
  return { ok: true };
}

/** 워밍업/마무리 순서 변경 — 보이는 소스(기본/오늘만)에 따라 해당 테이블의 position 갱신 */
export async function reorderConditioningAction(opts: {
  source: "daily" | "default";
  kind: string;
  focus?: string;
  dateYmd?: string;
  ids: string[];
}): Promise<void> {
  if (!isConditioningKind(opts.kind)) return;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return;

  if (opts.source === "daily") {
    if (!opts.dateYmd) return;
    await Promise.all(
      opts.ids.map((id, index) =>
        supabase
          .from("daily_conditioning")
          .update({ position: index })
          .eq("user_id", user.id)
          .eq("for_date", opts.dateYmd!)
          .eq("kind", opts.kind)
          .eq("id", id),
      ),
    );
  } else {
    if (!opts.focus) return;
    await Promise.all(
      opts.ids.map((id, index) =>
        supabase
          .from("routine_conditioning")
          .update({ position: index })
          .eq("user_id", user.id)
          .eq("focus", opts.focus!)
          .eq("kind", opts.kind)
          .eq("id", id),
      ),
    );
  }

  // 로컬 state 가 새 순서를 즉시 반영하므로 revalidate 생략 — 드래그 직후 RSC 재요청 막음
}
