"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/supabase/server";
import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { callAI } from "@/features/coach/ai";
import { consumeAiQuota, refundAiQuota } from "@/features/coach/ai-usage";
import { hasAiConsent, setAiConsent } from "@/features/coach/ai-consent";
import { loadMyState } from "@/features/coach/my-state-data";
import { myStateLines } from "@/features/coach/my-state";
import {
  TRAINER_PARTS,
  TRAINER_SYSTEM,
  buildCandidates,
  buildTrainerUserText,
  isTimeBudget,
  maxItemsFor,
  parseTodayPlan,
  type Candidate,
  type TimeBudget,
  type TodayPlan,
} from "@/features/coach/ai-trainer";
import {
  DIET_SYSTEM,
  buildDietUserText,
  parseDietFeedback,
  type DietFeedback,
} from "@/features/coach/diet-coach";
import { loadDietContext } from "@/features/coach/diet-coach-data";
import { parseCommitmentSuggestions } from "@/features/coach/parse";
import { COMMITMENT_SYSTEM, type CommitmentSuggestResult } from "@/features/coach/commitment-prompt";
import {
  EXERCISES,
  FOCUS_EXERCISES,
  allExercisesForFocus,
} from "@/features/routine/exercise-catalog";
import { getCurrentGym } from "@/features/gym/gym-data-access";
import {
  keepAvailableExercises,
  pickAvailableEquipment,
  toGymEquipmentSet,
} from "@/features/gym/gym-equipment-mapping";
import { applyItemsTodayOnly, type ApplyMode } from "@/features/routine/today-apply";
import { getPainAreas, getTodayCheckin } from "@/features/routine/checkin-data";
import { trainerStateLines } from "@/features/routine/checkin";
import type { BodyPart } from "@/features/routine/exercise-catalog-labels";

export type GenerateTodayPlanResult =
  | { ok: true; plan: TodayPlan }
  | { ok: false; error: string; needsConsent?: true };

/** AI 트레이너는 아직 공개 전 — 자기 스위치(`ai-trainer`, 기본: 디버그 계정만)를 따른다. */
async function trainerEnabled(): Promise<boolean> {
  return isDebugFeatureEnabled("ai-trainer");
}

/** 후보 운동 — 부위별 대표 운동을 먼저, 그다음 나머지. 내 헬스장에서 할 수 있는 것만. */
async function loadCandidates(painAreas: readonly BodyPart[] = []): Promise<Candidate[]> {
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
  // 아픈 부위(설정)는 후보에서 통째로 뺀다 — AI 가 아예 고를 수 없게.
  return buildCandidates(byPart, painAreas);
}

/**
 * 오늘의 운동 만들기 — AI 트레이너 탭의 [오늘 운동 짜 줘].
 *
 * 순서가 중요하다: 동의 → 한도(= 한 번 쓴 것으로 센다) → AI. 동의가 없으면 한도를 먹지 않는다.
 * 결과는 여기서 저장하지 않는다 — 화면이 기기에 하루 보관하고, 적용할 때 서버가 다시 검사한다.
 */
export async function generateTodayPlanAction(minutesInput?: unknown): Promise<GenerateTodayPlanResult> {
  // 시간 맞춤 — 모르는 값은 '제한 없음'.
  const minutes: TimeBudget = isTimeBudget(minutesInput) ? minutesInput : null;
  if (!(await getCurrentUser())) return { ok: false, error: "로그인이 필요해요." };
  if (!(await trainerEnabled())) return { ok: false, error: "AI 트레이너는 아직 사용할 수 없어요." };
  if (!(await hasAiConsent())) {
    return { ok: false, error: "AI 맞춤 추천 동의가 필요해요.", needsConsent: true };
  }
  const [state, painAreas, checkin] = await Promise.all([loadMyState(), getPainAreas(), getTodayCheckin()]);
  const candidates = await loadCandidates(painAreas);
  if (!state || candidates.length === 0) {
    return { ok: false, error: "추천에 필요한 정보를 읽지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  const quota = await consumeAiQuota("trainer");
  if (!quota.ok) return { ok: false, error: quota.message };

  const lines = trainerStateLines(myStateLines(state, (id) => EXERCISES[id]?.name ?? id), checkin, painAreas);
  const res = await callAI(TRAINER_SYSTEM, buildTrainerUserText(lines, candidates, minutes), { maxTokens: 700 });
  if (!res.ok) {
    // 서버 쪽 실패는 횟수를 돌려준다(무료 맛보기를 과부하에 잃지 않게).
    await refundAiQuota("trainer");
    return { ok: false, error: res.error };
  }
  const plan = parseTodayPlan(res.text, candidates, maxItemsFor(minutes));
  if (!plan) return { ok: false, error: "추천을 만들지 못했어요. 다시 시도해 주세요." };
  return { ok: true, plan };
}

export type ApplyTodayPlanResult =
  | { ok: true; added: number; skipped: number }
  | { ok: false; error: string };

export type { ApplyMode } from "@/features/routine/today-apply";

/**
 * [적용] — 고른 운동을 **오늘만** 담는다(사용자 결정: AI 가 직접 바꾸지 않고 적용 버튼으로 넘긴다).
 *
 * - `add`: 오늘 운동에 더한다(오늘 이미 할 운동은 빼고).
 * - `replace`: 오늘 운동을 이걸로 바꾼다 — 기존 '운동 직접 담기'와 같은 방식: 오늘 원래 운동은
 *   **내일로 미루고**(사라지지 않는다) 오늘 계획을 비운 뒤 담는다. 원래 쉬는 날이면 미룰 게 없어 그냥 담는다.
 *
 * 앱이 보낸 목록은 믿지 않고 카탈로그·기구를 다시 검사한다(`addExercisesTodayOnlyAction` 도 검사한다).
 * 세트·횟수·무게는 내 기록 기준 처방. 영구 루틴은 건드리지 않는다(원칙 2).
 */
export async function applyTodayPlanAction(
  items: { exerciseId: string; equipment: string }[],
  mode: ApplyMode = "add",
): Promise<ApplyTodayPlanResult> {
  if (!(await getCurrentUser())) return { ok: false, error: "로그인이 필요해요." };
  if (!(await trainerEnabled())) return { ok: false, error: "AI 트레이너는 아직 사용할 수 없어요." };
  const r = await applyItemsTodayOnly(items, mode);
  if (r.ok) revalidatePath("/ai-trainer");
  return r;
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

export type DietReviewResult =
  | { ok: true; feedback: DietFeedback }
  | { ok: false; error: string; needsConsent?: true };

/**
 * [오늘 식단 봐 줘] — 오늘 먹은 것을 목표(규칙)와 비교해 잘한 점·고칠 점·내일 메뉴를 받는다.
 * 동의 → 기록 확인 → 한도(diet-coach) → AI. 기록이 없으면 한도를 먹지 않는다.
 */
export async function reviewTodayDietAction(): Promise<DietReviewResult> {
  if (!(await getCurrentUser())) return { ok: false, error: "로그인이 필요해요." };
  if (!(await trainerEnabled())) return { ok: false, error: "AI 트레이너는 아직 사용할 수 없어요." };
  if (!(await hasAiConsent())) {
    return { ok: false, error: "AI 맞춤 추천 동의가 필요해요.", needsConsent: true };
  }
  const ctx = await loadDietContext();
  if (!ctx) return { ok: false, error: "식단 기록을 읽지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  if (ctx.today.meals.length === 0) {
    return { ok: false, error: "오늘 먹은 걸 한 끼 이상 기록하면 봐 드릴게요." };
  }
  const quota = await consumeAiQuota("diet-coach");
  if (!quota.ok) return { ok: false, error: quota.message };

  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hour12: false }).format(new Date()),
  );
  const res = await callAI(DIET_SYSTEM, buildDietUserText(ctx.goal, ctx.targets, ctx.today, hour % 24), {
    maxTokens: 600,
  });
  if (!res.ok) {
    // 서버 쪽 실패는 횟수를 돌려준다(무료 맛보기를 과부하에 잃지 않게).
    await refundAiQuota("diet-coach");
    return { ok: false, error: res.error };
  }
  const feedback = parseDietFeedback(res.text);
  if (!feedback) return { ok: false, error: "피드백을 만들지 못했어요. 다시 시도해 주세요." };
  return { ok: true, feedback };
}

/**
 * AI 다짐 추천 — 내 상태 숫자로 실천할 다짐 2~3개(기존 다짐 지표 안에서만).
 * 짐꾼쌤의 다짐 제안과 같은 형식이라 화면·추가(addCommitmentAction)를 그대로 쓴다. 한도는 코치 칸.
 */
export async function suggestTrainerCommitmentsAction(): Promise<CommitmentSuggestResult> {
  if (!(await getCurrentUser())) return { ok: false, error: "로그인이 필요해요." };
  if (!(await trainerEnabled())) return { ok: false, error: "AI 트레이너는 아직 사용할 수 없어요." };
  if (!(await hasAiConsent())) return { ok: false, error: "AI 맞춤 추천 동의가 필요해요." };
  const state = await loadMyState();
  if (!state) return { ok: false, error: "추천에 필요한 정보를 읽지 못했어요." };
  const quota = await consumeAiQuota("coach");
  if (!quota.ok) return { ok: false, error: quota.message };
  const lines = myStateLines(state, (id) => EXERCISES[id]?.name ?? id);
  const res = await callAI(COMMITMENT_SYSTEM, `회원 상태:\n${lines.join("\n") || "기록이 거의 없음"}`);
  if (!res.ok) {
    // 서버 쪽 실패는 횟수를 돌려준다(무료 맛보기를 과부하에 잃지 않게).
    await refundAiQuota("coach");
    return { ok: false, error: res.error };
  }
  const suggestions = parseCommitmentSuggestions(res.text);
  if (suggestions.length === 0) return { ok: false, error: "다짐 제안을 만들지 못했어요. 다시 시도해 주세요." };
  return { ok: true, suggestions };
}
