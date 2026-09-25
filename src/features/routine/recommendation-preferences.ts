import type { Gender, ExperienceLevel } from "@/features/profile/data";
import { GOAL_LABEL, type Goal } from "@/features/profile/goal";
import type { DayBlockId } from "./data";
import type { ProgressRecord } from "./progress";

export type RecommendationPreferences = {
  days: number;
  minutes: 30 | 45 | 60 | 75;
  priority: "balanced" | "upper" | "lower";
  equipment: "mixed" | "machine" | "freeweight";
  variety: "familiar" | "balanced";
};
export type RecommendationContext = {
  gender: Gender;
  experience: ExperienceLevel;
  goal: Goal | null;
  preferences: RecommendationPreferences;
  explicitPreferences: boolean;
  records: ProgressRecord[];
  today: string;
};

export function parseRecommendationPreferences(value: unknown): RecommendationPreferences | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  if (!Number.isInteger(p.days) || Number(p.days) < 2 || Number(p.days) > 6 ||
    ![30,45,60,75].includes(Number(p.minutes)) || typeof p.minutes !== "number" ||
    !["balanced","upper","lower"].includes(String(p.priority)) ||
    !["mixed","machine","freeweight"].includes(String(p.equipment)) ||
    !["familiar","balanced"].includes(String(p.variety))) return null;
  return {days:Number(p.days), minutes:p.minutes as RecommendationPreferences["minutes"], priority:p.priority as RecommendationPreferences["priority"], equipment:p.equipment as RecommendationPreferences["equipment"], variety:p.variety as RecommendationPreferences["variety"]};
}

export function recentRecommendationRecords(records: ProgressRecord[], today: string): ProgressRecord[] {
  const since = new Date(`${today}T00:00:00Z`); since.setUTCDate(since.getUTCDate()-27);
  return records.filter(row => row.status === "done" && !!row.exerciseId && row.forDate >= since.toISOString().slice(0,10) && row.forDate <= today);
}

export function defaultRecommendationPreferences(gender: Gender, experience: ExperienceLevel, records: ProgressRecord[], today: string): RecommendationPreferences {
  const days = new Set(recentRecommendationRecords(records,today).map(row => row.forDate)).size;
  return {days: days >= 8 ? Math.max(2, Math.min(5, Math.round(days/4))) : experience === "advanced" ? 4 : 3,
    minutes:45, priority:gender === "female" ? "lower" : "balanced", equipment:"mixed", variety:"balanced"};
}

export type PersonalizedRoutine = {
  week: DayBlockId[][];
  headline: string;
  reasons: string[];
  recordedDays: number;
};

/** Product scheduling heuristic, not a diagnosis of recovery or weak muscles. */
export function personalizedRoutine(context: RecommendationContext): PersonalizedRoutine {
  const {preferences:p, experience, goal} = context;
  const priority = p.priority;
  const focused: DayBlockId = priority === "lower" ? "lower" : "upper";
  const other: DayBlockId = focused === "lower" ? "upper" : "lower";
  let sessions: DayBlockId[][];
  if (p.days === 2) sessions = [["fullbody"],["fullbody"]];
  else if (p.days === 3) sessions = experience === "beginner" && priority === "balanced" ? [["fullbody"],["fullbody"],["fullbody"]] : priority === "balanced" ? [["push"],["pull"],["lower"]] : [[focused],[other],["fullbody"]];
  else if (p.days === 4) sessions = [[focused],[other],[focused],[other]];
  else if (p.days === 5) sessions = [["upper"],["lower"],["push"],["pull"],[priority === "upper" ? "upper" : "lower"]];
  else sessions = [["push"],["pull"],["lower"],["push"],["pull"],["lower"]];
  const positions: Record<number, number[]> = {2:[0,3],3:[0,2,4],4:[0,1,3,5],5:[0,1,3,4,5],6:[0,1,2,4,5,6]};
  const week: DayBlockId[][] = Array.from({length:7},()=>["rest"]);
  positions[p.days].forEach((day,index) => {week[day]=sessions[index];});
  const recordedDays = new Set(context.records.map(row=>row.forDate)).size;
  const reasons = [
    `주 ${p.days}회 · 회당 ${p.minutes}분 선호에 맞춰 운동일과 휴식일을 나눴어요. 시간은 계획 기준이며 실제 소요 시간과 다를 수 있어요.`,
    priority === "balanced" ? "상·하체를 고르게 배치했어요." : `${priority === "lower" ? "하체" : "상체"} 선호를 반영하면서 다른 부위도 포함했어요.`,
    recordedDays ? `최근 28일 중 ${recordedDays}일의 종목별 완료 기록을 운동 선정에 참고해요.` : "최근 28일의 종목별 완료 기록이 없어 경력과 기본 큐레이션으로 시작해요.",
    context.explicitPreferences ? "직접 저장한 선호를 성별 기본값보다 우선해요." : "성별별 기본 큐레이션을 출발점으로 사용해요. 아래 선호를 바꾸면 성별과 관계없이 반영돼요.",
  ];
  if(goal) reasons.push(`${GOAL_LABEL[goal]} 목표와 운동 경력을 종목 수에 반영해요. 체성분 수치만으로 특정 부위의 약점을 판단하지 않아요.`);
  return {week,headline:`주 ${p.days}회 · ${priority === "balanced" ? "균형" : priority === "lower" ? "하체 중심" : "상체 중심"} 루틴`,reasons,recordedDays};
}