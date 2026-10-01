"use server";

import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { callAI, type ImageInput } from "@/features/coach/ai";
import { consumeAiQuota } from "@/features/coach/ai-usage";
import type { AiFeatureId } from "@/features/coach/ai-quota";
import { saveAnalysis } from "@/features/coach/analysis-store";
import { buildWorkoutSummary, buildDietSummary } from "@/features/coach/summary";
import {
  parseCoachAnalysis,
  parseCommitmentSuggestions,
  type CoachAnalysis,
  type SuggestedCommitment,
} from "@/features/coach/parse";

export type CoachAnalysisResult =
  | { ok: true; analysis: CoachAnalysis }
  | { ok: false; error: string };

export type CommitmentSuggestResult =
  | { ok: true; suggestions: SuggestedCommitment[] }
  | { ok: false; error: string };

/**
 * 부를 자격이 있나 — 기능 게이트 + **이번 달 사용량 한도**(로드맵 7.1).
 *
 * 한도 확인이 곧 '한 번 썼다'로 센다. 호출 **직전에** 세야 한다 — 응답을 받고 세면
 * 도중에 끊긴 호출은 공짜가 되는데, 비용은 이미 나간 뒤다.
 */
async function ensureCoach(feature: AiFeatureId): Promise<string | null> {
  if (!(await isDebugFeatureEnabled("helssu-coach"))) {
    return "헬쑤쌤은 아직 사용할 수 없습니다.";
  }
  const quota = await consumeAiQuota(feature);
  return quota.ok ? null : quota.message;
}

const ANALYSIS_JSON =
  '반드시 JSON 객체 하나만 출력(설명·코드펜스 없이): {"summary":"2~3문장 총평(한국어)","points":[{"title":"짧은 제목","detail":"구체적 조언 1~2문장(한국어)"}]} points 는 3~5개.';

/** 운동 분석 — 최근 기록으로 부족한 부위·불균형·다음에 할 운동 조언. */
export async function analyzeWorkoutAction(): Promise<CoachAnalysisResult> {
  const gate = await ensureCoach("coach");
  if (gate) return { ok: false, error: gate };
  const summary = await buildWorkoutSummary();
  const res = await callAI(
    `너는 헬스 트레이너 '헬쑤쌤'이다. 사용자의 최근 운동 데이터를 보고 부족한 부위, 근육 불균형, 다음에 집중하면 좋은 운동을 코치한다. ${ANALYSIS_JSON}`,
    `사용자 운동 데이터: ${summary}`,
  );
  if (!res.ok) return { ok: false, error: res.error };
  const analysis = parseCoachAnalysis(res.text);
  if (!analysis) return { ok: false, error: "분석 결과를 이해하지 못했어요. 다시 시도해 주세요." };
  // 보관해 두면 다시 열어 볼 때 AI 를 또 부르지 않는다(한도를 안 먹는다).
  await saveAnalysis("workout", analysis);
  return { ok: true, analysis };
}

/** 식단 코칭 — 최근 식단으로 개선점·관리 방법 조언. */
export async function analyzeDietAction(): Promise<CoachAnalysisResult> {
  const gate = await ensureCoach("coach");
  if (gate) return { ok: false, error: gate };
  const summary = await buildDietSummary();
  const res = await callAI(
    `너는 영양 코치 '헬쑤쌤'이다. 사용자의 최근 식단 데이터를 보고 칼로리·영양 균형·끼니 습관의 개선점을 코치한다. ${ANALYSIS_JSON}`,
    `사용자 식단 데이터: ${summary}`,
  );
  if (!res.ok) return { ok: false, error: res.error };
  const analysis = parseCoachAnalysis(res.text);
  if (!analysis) return { ok: false, error: "분석 결과를 이해하지 못했어요. 다시 시도해 주세요." };
  await saveAnalysis("diet", analysis);
  return { ok: true, analysis };
}

/** AI 다짐 제안 — 운동·식단 데이터 기반 실천 가능한 다짐 2~3개. */
export async function suggestCommitmentsAction(): Promise<CommitmentSuggestResult> {
  const gate = await ensureCoach("coach");
  if (gate) return { ok: false, error: gate };
  const [w, d] = await Promise.all([buildWorkoutSummary(), buildDietSummary()]);
  const res = await callAI(
    `너는 코치 '헬쑤쌤'이다. 사용자 데이터를 보고 실천 가능한 '다짐'을 2~3개 제안한다.
metric 은 다음 중 하나: workout_days(운동한 날), workout_count(운동 횟수), burn_kcal(소비 kcal), diet_days(식단 기록한 날), intake_avg_max(하루 평균 섭취 이하).
target 은 숫자, days 는 다짐 기간(일수, 7~60 권장).
반드시 JSON 객체 하나만: {"suggestions":[{"title":"한국어 다짐 제목","metric":"...","target":숫자,"days":숫자}]}`,
    `운동: ${w}\n식단: ${d}`,
  );
  if (!res.ok) return { ok: false, error: res.error };
  const suggestions = parseCommitmentSuggestions(res.text);
  if (suggestions.length === 0) {
    return { ok: false, error: "다짐 제안을 만들지 못했어요. 다시 시도해 주세요." };
  }
  return { ok: true, suggestions };
}

/** 자세 분석 — 운동 영상에서 뽑은 프레임(이미지)로 자세 교정점 코치. */
export async function analyzePostureAction(input: {
  frames: ImageInput[];
  exerciseName?: string;
}): Promise<CoachAnalysisResult> {
  const gate = await ensureCoach("posture");
  if (gate) return { ok: false, error: gate };
  const frames = (input.frames ?? []).slice(0, 6); // 과금·용량 방지 최대 6프레임
  if (frames.length === 0) return { ok: false, error: "영상 프레임이 없습니다." };

  const name = (input.exerciseName ?? "").trim();
  const res = await callAI(
    `너는 운동 자세 코치 '헬쑤쌤'이다. 아래 이미지는 한 운동 동작을 시간순으로 캡처한 프레임들을 격자(2×2)로 이어붙인 것이다. 각 칸 왼쪽 위 번호(1→4)가 동작 진행 순서(시작→끝)다. 관절 정렬·가동범위·흔한 실수 관점에서 자세를 평가하고 교정점을 알려준다. ${ANALYSIS_JSON}`,
    `운동: ${name || "미상"}. 격자의 1→4 순서로 동작을 보고 자세를 분석해줘.`,
    { images: frames.slice(0, 1), maxTokens: 1000 },
  );
  if (!res.ok) return { ok: false, error: res.error };
  const analysis = parseCoachAnalysis(res.text);
  if (!analysis) return { ok: false, error: "분석 결과를 이해하지 못했어요. 다시 시도해 주세요." };
  // 어떤 운동을 분석한 것인지 같이 남긴다 — 나중에 보면 종목을 모른다.
  await saveAnalysis("posture", analysis, name || undefined);
  return { ok: true, analysis };
}
