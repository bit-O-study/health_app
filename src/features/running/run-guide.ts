/**
 * 런닝 목표·음성 안내 — 순수 로직(2026-09-29 런닝 모드 고도화 3단계).
 * 화면(outdoor-run)은 이 함수들이 만든 문장·비율만 쓴다 — 말할 내용과 시점은 여기서 테스트한다.
 */

export type RunGoal =
  | { kind: "free" }
  | { kind: "distance"; meters: number }
  | { kind: "time"; sec: number };

export const FREE_GOAL: RunGoal = { kind: "free" };

/** 시작 화면에 보여 줄 목표들 — 자주 쓰는 것만. */
export const GOAL_OPTIONS: RunGoal[] = [
  FREE_GOAL,
  { kind: "distance", meters: 3_000 },
  { kind: "distance", meters: 5_000 },
  { kind: "distance", meters: 10_000 },
  { kind: "time", sec: 20 * 60 },
  { kind: "time", sec: 30 * 60 },
  { kind: "time", sec: 45 * 60 },
];

export function goalLabel(goal: RunGoal): string {
  if (goal.kind === "distance") return `${goal.meters / 1000}km`;
  if (goal.kind === "time") return `${Math.round(goal.sec / 60)}분`;
  return "자유 달리기";
}

export function sameGoal(a: RunGoal, b: RunGoal): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 기기에 기억한 목표 — 모르는 값이면 자유 달리기. */
export function parseGoal(raw: string | null): RunGoal {
  if (!raw) return FREE_GOAL;
  try {
    const v = JSON.parse(raw) as RunGoal;
    return GOAL_OPTIONS.find((g) => sameGoal(g, v)) ?? FREE_GOAL;
  } catch {
    return FREE_GOAL;
  }
}

export type GoalProgress = { ratio: number; reached: boolean; remaining: string };

/** 목표 진행(0–1) · 달성 여부 · 남은 양 문구. 자유 달리기면 null. */
export function goalProgress(goal: RunGoal, meters: number, sec: number): GoalProgress | null {
  if (goal.kind === "distance") {
    const left = Math.max(0, goal.meters - meters);
    return {
      ratio: Math.min(1, meters / goal.meters),
      reached: left === 0,
      remaining: left === 0 ? "목표 달성" : `목표까지 ${(left / 1000).toFixed(2)}km`,
    };
  }
  if (goal.kind === "time") {
    const left = Math.max(0, goal.sec - sec);
    return {
      ratio: Math.min(1, sec / goal.sec),
      reached: left === 0,
      remaining: left === 0 ? "목표 달성" : `목표까지 ${Math.ceil(left / 60)}분`,
    };
  }
  return null;
}

/** 이번 위치로 새로 넘은 km 들(예: 0.95km → 2.01km 면 [1, 2]). */
export function crossedKms(prevMeters: number, meters: number): number[] {
  const out: number[] = [];
  for (let km = Math.floor(prevMeters / 1000) + 1; km <= Math.floor(meters / 1000); km++) out.push(km);
  return out;
}

/** 말하기용 시간 — 341초 → "5분 41초", 60초 → "1분". */
export function spokenDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}초`;
  return r === 0 ? `${m}분` : `${m}분 ${r}초`;
}

/**
 * 1km 안내 문장 — 짧게: 몇 km, 이번 1km 걸린 시간, 평균 페이스, (목표가 있으면) 남은 양.
 * 예) "3킬로미터. 구간 5분 41초. 평균 5분 49초. 목표까지 2킬로미터."
 */
export function kmAnnouncement(input: {
  km: number;
  splitSec: number;
  avgPaceSec: number | null;
  goal: RunGoal;
  meters: number;
  sec: number;
}): string {
  const parts = [`${input.km}킬로미터.`, `구간 ${spokenDuration(input.splitSec)}.`];
  if (input.avgPaceSec && Number.isFinite(input.avgPaceSec)) parts.push(`평균 ${spokenDuration(input.avgPaceSec)}.`);
  if (input.goal.kind === "distance") {
    const left = input.goal.meters - input.meters;
    if (left > 0) {
      const km = Math.round(left / 100) / 10;
      parts.push(`목표까지 ${Number.isInteger(km) ? km : km.toFixed(1)}킬로미터.`);
    }
  } else if (input.goal.kind === "time") {
    const left = input.goal.sec - input.sec;
    if (left > 0) parts.push(`목표까지 ${Math.ceil(left / 60)}분.`);
  }
  return parts.join(" ");
}

export function goalReachedAnnouncement(goal: RunGoal): string {
  if (goal.kind === "distance") return `목표 ${goal.meters / 1000}킬로미터 달성! 잘했어요.`;
  if (goal.kind === "time") return `목표 ${Math.round(goal.sec / 60)}분 달성! 잘했어요.`;
  return "";
}

/** 개인 최고 기록 종류(서버가 판정). */
export type RunRecordKind = "longest" | "fastest";

export function recordLabel(kind: RunRecordKind): string {
  return kind === "longest" ? "가장 긴 거리" : "가장 빠른 평균 페이스(1km 이상)";
}

/**
 * 이번 런닝이 개인 최고인가 — 지난 기록과 비교. 지난 기록이 없으면(첫 런닝) 배지 없음.
 * 가장 빠른 페이스는 1km 이상 달린 런닝끼리만 비교(짧은 질주가 최고가 되지 않게).
 */
export function personalRecords(
  current: { distanceM: number; paceSecPerKm: number | null },
  previous: { distanceM: number; paceSecPerKm: number | null }[],
): RunRecordKind[] {
  if (previous.length === 0) return [];
  const out: RunRecordKind[] = [];
  const maxDistance = Math.max(...previous.map((r) => r.distanceM));
  if (current.distanceM > maxDistance) out.push("longest");
  const eligible = previous.filter((r) => r.distanceM >= 1000 && r.paceSecPerKm && r.paceSecPerKm > 0);
  if (
    current.distanceM >= 1000 &&
    current.paceSecPerKm &&
    eligible.length > 0 &&
    current.paceSecPerKm < Math.min(...eligible.map((r) => r.paceSecPerKm as number))
  ) {
    out.push("fastest");
  }
  return out;
}
