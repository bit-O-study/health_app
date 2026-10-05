/**
 * AI 다짐 제안 — 헬쑤쌤(`coach-actions.ts`)과 AI 트레이너 탭(`ai-trainer-actions.ts`)이 같이 쓰는 글.
 * 두 곳에 따로 두면 지표 목록이 한쪽만 바뀐다(다짐 지표는 `commitments/commitment.ts` 가 정한다).
 */
import type { SuggestedCommitment } from "@/features/coach/parse";

export type CommitmentSuggestResult =
  | { ok: true; suggestions: SuggestedCommitment[] }
  | { ok: false; error: string };

export const COMMITMENT_SYSTEM = `너는 코치 '헬쑤쌤'이다. 사용자 데이터를 보고 실천 가능한 '다짐'을 2~3개 제안한다.
metric 은 다음 중 하나: workout_days(운동한 날), workout_count(운동 횟수), burn_kcal(소비 kcal), diet_days(식단 기록한 날), intake_avg_max(하루 평균 섭취 이하).
target 은 숫자, days 는 다짐 기간(일수, 7~60 권장).
반드시 JSON 객체 하나만: {"suggestions":[{"title":"한국어 다짐 제목","metric":"...","target":숫자,"days":숫자}]}`;
