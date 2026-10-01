import { shiftYmd, type ProgressRecord } from "@/features/routine/progress";
import { buildAdviceMap, type OverloadAdvice, type AdviceTarget } from "@/features/routine/overload-advice";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { primaryBodyPart } from "@/features/routine/exercise-body-parts";
import { BODY_PART_LABEL } from "@/features/routine/exercise-catalog-labels";
import type { ExperienceLevel } from "@/features/profile/data";

export type CoachReview = {
  from: string; to: string; workoutDays: number; previousDays: number;
  observation: string; check: string; nextStep: string;
  exercises: (OverloadAdvice & { name: string; lastDate: string })[];
};

/** Read-only: uses existing overload rules; no plan or completion is mutated. */
export function buildCoachReview(records: ProgressRecord[], today: string, experience: ExperienceLevel | null, weightSteps?: Record<string, number>, plans: AdviceTarget[] = []): CoachReview {
  const from = shiftYmd(today, -6);
  const previousFrom = shiftYmd(today, -13);
  const history = records.filter(r => r.status === "done" && r.forDate >= shiftYmd(today, -27) && r.forDate <= today).sort((a, b) => b.forDate.localeCompare(a.forDate));
  const current = history.filter(r => r.forDate >= from);
  const workoutDays = new Set(current.map(r => r.forDate)).size;
  const previousDays = new Set(history.filter(r => r.forDate >= previousFrom && r.forDate < from).map(r => r.forDate)).size;
  const recent = new Map<string, ProgressRecord>();
  for (const row of history) if (row.forDate >= previousFrom && row.exerciseId && getCatalogExercise(row.exerciseId) && !recent.has(row.exerciseId)) recent.set(row.exerciseId, row);
  const advice: Record<string, OverloadAdvice> = {};
  const lastDates = new Map<string, string>();
  if (experience) for (const target of plans) {
    if (!recent.has(target.exerciseId) || !target.equipment || !target.targetReps) continue;
    const comparable = history.filter(row => row.exerciseId === target.exerciseId && row.equipment === target.equipment);
    if (!comparable[0] || comparable[0].forDate < previousFrom) continue;
    lastDates.set(target.exerciseId, comparable[0].forDate);
    Object.assign(advice, buildAdviceMap(comparable, [target], experience, weightSteps));
  }
  const exercises = Object.values(advice).map(a => ({ ...a, name: getCatalogExercise(a.exerciseId)!.name, lastDate: lastDates.get(a.exerciseId)! })).sort((a, b) => Number(b.attention) - Number(a.attention) || b.lastDate.localeCompare(a.lastDate)).slice(0, 6);
  const parts = new Set(current.flatMap(r => r.exerciseId && getCatalogExercise(r.exerciseId) ? [primaryBodyPart(r.exerciseId)] : []));
  const observation = workoutDays ? `최근 7일에 ${workoutDays}일 운동을 기록했어요. 직전 7일은 ${previousDays}일이에요.` : "최근 7일에 완료한 운동 기록이 없어요.";
  const flagged = exercises.find(a => a.attention);
  const check = flagged ? `${flagged.name}: ${flagged.reason}` : parts.size === 1 && workoutDays >= 2 ? `최근 기록은 ${BODY_PART_LABEL[[...parts][0]]} 부위에 모여 있어요. 계획한 다른 부위가 빠졌는지 확인해 보세요.` : "기록되지 않은 운동은 분석에 포함되지 않아요. 오늘 계획과 실제 기록을 함께 확인하세요.";
  const nextStep = flagged ? "다음 운동 전에 아래 정체·휴식 제안을 먼저 확인하고, 조정이 고민되면 코칭 상담을 남겨 주세요." : workoutDays ? "아래 제안에서 다음에 할 종목을 확인하세요. 오늘 가능한 시간과 기구가 달라졌다면 맞춤 추천을 요청하세요." : "최근 운동 기록을 남기면 다음 운동의 중량·횟수 제안을 확인할 수 있어요.";
  return { from, to: today, workoutDays, previousDays, observation, check, nextStep, exercises };
}
export type ReviewPlanRow = { exercise_id: string; equipment: string; reps: number; set_details?: unknown };
/** Today overrides take precedence. Ambiguous day/rep/equipment prescriptions are not guessed. */
export function resolveReviewTargets(routine: ReviewPlanRow[], today: ReviewPlanRow[]): AdviceTarget[] {
  const todayIds = new Set(today.map(row => row.exercise_id));
  const candidates = [...routine.filter(row => !todayIds.has(row.exercise_id)), ...today];
  const byId = new Map<string, ReviewPlanRow[]>();
  for (const row of candidates) byId.set(row.exercise_id, [...(byId.get(row.exercise_id) ?? []), row]);
  return [...byId].flatMap(([exerciseId, rows]) => {
    const first = rows[0];
    if (!first.equipment || !Number.isInteger(first.reps) || first.reps < 1 || first.reps > 100) return [];
    if (rows.some(row => row.equipment !== first.equipment || row.reps !== first.reps || (Array.isArray(row.set_details) && row.set_details.length > 0))) return [];
    return [{ exerciseId, equipment: first.equipment, targetReps: first.reps }];
  });
}