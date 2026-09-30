"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/supabase/server";
import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { callAI } from "@/features/coach/ai";
import { consumeAiQuota } from "@/features/coach/ai-usage";
import { hasAiConsent, setAiConsent } from "@/features/coach/ai-consent";
import { loadMyState } from "@/features/coach/my-state-data";
import { myStateLines } from "@/features/coach/my-state";
import {
  TRAINER_PARTS,
  TRAINER_SYSTEM,
  buildCandidates,
  buildTrainerUserText,
  parseTodayPlan,
  type Candidate,
  type TodayPlan,
} from "@/features/coach/ai-trainer";
import {
  EXERCISES,
  FOCUS_EXERCISES,
  allExercisesForFocus,
  getCatalogExercise,
} from "@/features/routine/exercise-catalog";
import { isEquipmentId, type EquipmentId } from "@/features/routine/exercise-catalog-labels";
import { getCurrentGym } from "@/features/gym/gym-data-access";
import {
  keepAvailableExercises,
  pickAvailableEquipment,
  toGymEquipmentSet,
} from "@/features/gym/gym-equipment-mapping";
import { addExercisesTodayOnlyAction } from "@/features/routine/daily-plan-actions";
import { todayExerciseIds } from "@/features/routine/today-exercise-ids";

export type GenerateTodayPlanResult =
  | { ok: true; plan: TodayPlan }
  | { ok: false; error: string; needsConsent?: true };

/** AI 트레이너는 아직 공개 전 — 자기 스위치(`ai-trainer`, 기본: 디버그 계정만)를 따른다. */
async function trainerEnabled(): Promise<boolean> {
  return isDebugFeatureEnabled("ai-trainer");
}

/** 후보 운동 — 부위별 대표 운동을 먼저, 그다음 나머지. 내 헬스장에서 할 수 있는 것만. */
async function loadCandidates(): Promise<Candidate[]> {
  const gym = await getCurrentGym().catch(() => null);
  const gymSet = toGymEquipmentSet(gym?.equipmentIds ?? null);
  const byPart: Parameters<typeof buildCandidates>[0] = {};
  for (const part of TRAINER_PARTS) {
    const common = (FOCUS_EXERCISES[part] ?? []).map((id) => EXERCISES[id]).filter(Boolean);
    const rest = allExercisesForFocus(part).filter((ex) => !common.some((c) => c.id === ex.id));
    const ordered = keepAvailableExercises([...common, ...rest], gymSet);
    byPart[part] = ordered.map((ex) => ({
      id: ex.id,
      name: ex.name,
      equipment: pickAvailableEquipment(ex, gymSet),
    }));
  }
  return buildCandidates(byPart);
}

/**
 * 오늘의 운동 만들기 — AI 트레이너 탭의 [오늘 운동 짜 줘].
 *
 * 순서가 중요하다: 동의 → 한도(= 한 번 쓴 것으로 센다) → AI. 동의가 없으면 한도를 먹지 않는다.
 * 결과는 여기서 저장하지 않는다 — 화면이 기기에 하루 보관하고, 적용할 때 서버가 다시 검사한다.
 */
export async function generateTodayPlanAction(): Promise<GenerateTodayPlanResult> {
  if (!(await getCurrentUser())) return { ok: false, error: "로그인이 필요해요." };
  if (!(await trainerEnabled())) return { ok: false, error: "AI 트레이너는 아직 사용할 수 없어요." };
  if (!(await hasAiConsent())) {
    return { ok: false, error: "AI 맞춤 추천 동의가 필요해요.", needsConsent: true };
  }
  const [state, candidates] = await Promise.all([loadMyState(), loadCandidates()]);
  if (!state || candidates.length === 0) {
    return { ok: false, error: "추천에 필요한 정보를 읽지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  const quota = await consumeAiQuota("trainer");
  if (!quota.ok) return { ok: false, error: quota.message };

  const lines = myStateLines(state, (id) => EXERCISES[id]?.name ?? id);
  const res = await callAI(TRAINER_SYSTEM, buildTrainerUserText(lines, candidates), { maxTokens: 700 });
  if (!res.ok) return { ok: false, error: res.error };
  const plan = parseTodayPlan(res.text, candidates);
  if (!plan) return { ok: false, error: "추천을 만들지 못했어요. 다시 시도해 주세요." };
  return { ok: true, plan };
}

export type ApplyTodayPlanResult =
  | { ok: true; added: number; skipped: number }
  | { ok: false; error: string };

/**
 * [적용] — 고른 운동을 **오늘만** 담는다(사용자 결정: AI 가 직접 바꾸지 않고 적용 버튼으로 넘긴다).
 *
 * 앱이 보낸 목록은 믿지 않고 카탈로그·기구를 다시 검사한다(`addExercisesTodayOnlyAction` 도 검사한다).
 * 오늘 이미 할 운동은 빼고 담는다. 세트·횟수·무게는 내 기록 기준 처방.
 */
export async function applyTodayPlanAction(
  items: { exerciseId: string; equipment: string }[],
): Promise<ApplyTodayPlanResult> {
  if (!(await getCurrentUser())) return { ok: false, error: "로그인이 필요해요." };
  if (!(await trainerEnabled())) return { ok: false, error: "AI 트레이너는 아직 사용할 수 없어요." };
  const clean: { exerciseId: string; equipment: EquipmentId }[] = [];
  const seen = new Set<string>();
  for (const it of (Array.isArray(items) ? items : []).slice(0, 10)) {
    const ex = typeof it?.exerciseId === "string" ? getCatalogExercise(it.exerciseId) : undefined;
    if (!ex || seen.has(ex.id) || !isEquipmentId(it.equipment)) continue;
    if (!ex.equipments.some((e) => e.equipment === it.equipment)) continue;
    seen.add(ex.id);
    clean.push({ exerciseId: ex.id, equipment: it.equipment });
  }
  if (clean.length === 0) return { ok: false, error: "담을 운동을 골라 주세요." };

  const already = await todayExerciseIds();
  const add = clean.filter((c) => !already.has(c.exerciseId));
  if (add.length === 0) return { ok: true, added: 0, skipped: clean.length };
  const r = await addExercisesTodayOnlyAction(add);
  if (!r.ok) return r;
  revalidatePath("/ai-trainer");
  return { ok: true, added: add.length, skipped: clean.length - add.length };
}

/** AI 맞춤 추천 동의·철회. */
export async function setAiConsentAction(agree: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!(await getCurrentUser())) return { ok: false, error: "로그인이 필요해요." };
  const ok = await setAiConsent(agree === true);
  if (!ok) return { ok: false, error: "동의 상태를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/ai-trainer");
  revalidatePath("/settings/ai");
  return { ok: true };
}
