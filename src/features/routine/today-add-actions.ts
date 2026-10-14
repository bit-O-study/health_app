"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGym } from "@/features/gym/gym-data-access";
import { pickAvailableEquipment, toGymEquipmentSet } from "@/features/gym/gym-equipment-mapping";
import { EQUIPMENT_LABELS, getCatalogExercise } from "@/features/routine/exercise-catalog";
import { searchExercises } from "@/features/routine/exercise-search";
import { applyItemsTodayOnly, type ApplyTodayResult } from "@/features/routine/today-apply";
import { getCurrentUser } from "@/lib/supabase/server";

/** '오늘만 바꾸기 → 운동 더하기'에서 고르는 운동 한 줄. 기구는 내 헬스장에서 쓸 수 있는 것으로 미리 고른다. */
export type AddCandidate = { exerciseId: string; name: string; target: string; equipment: string; equipmentLabel: string };

/** 한 번에 보여 주는 검색 결과 수 · 한 번에 담는 최대 수. */
const MAX_RESULTS = 8;
const MAX_ADD = 10;

/**
 * 운동 더하기 — 이름·부위·묘사로 찾는다("가동성", "굽은 어깨"처럼 묶어서도 나온다).
 * 검색은 서버에서 돈다(운동 목록을 화면에 싣지 않으려고 — `exercise-search-actions.ts` 와 같은 이유).
 */
export async function findExercisesToAddAction(query: string): Promise<AddCandidate[]> {
  if (!(await getCurrentUser())) return [];
  const q = typeof query === "string" ? query.slice(0, 200).trim() : "";
  if (!q) return [];
  const gymSet = toGymEquipmentSet((await getCurrentGym().catch(() => null))?.equipmentIds ?? null);
  const out: AddCandidate[] = [];
  for (const hit of searchExercises(q, MAX_RESULTS)) {
    const ex = getCatalogExercise(hit.id);
    if (!ex || ex.equipments.length === 0) continue;
    const equipment = pickAvailableEquipment(ex, gymSet);
    out.push({ exerciseId: ex.id, name: ex.name, target: ex.target, equipment, equipmentLabel: EQUIPMENT_LABELS[equipment] ?? "" });
  }
  return out;
}

/**
 * 고른 운동을 **오늘만** 더한다 — 지금 오늘 운동은 그대로, 루틴도 그대로(원칙 2).
 * 세트·무게는 내 기록 기준 처방(`applyItemsTodayOnly`), 오늘 이미 있는 운동은 건너뛴다.
 */
export async function addExercisesTodayAction(items: unknown): Promise<ApplyTodayResult> {
  if (!(await getCurrentUser())) return { ok: false, error: "로그인이 필요해요." };
  const r = await applyItemsTodayOnly(items, "add", MAX_ADD);
  if (r.ok) revalidatePath("/routine");
  return r;
}
