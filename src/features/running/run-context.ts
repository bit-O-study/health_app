/**
 * 런닝 이어하기(2026-10-28) — 루틴에서 런닝 모드로 들어갈 때의 맥락(어느 루틴 일차·목표·오늘 운동 대체 여부).
 * 같은 루틴 일차가 돌아오면 런닝 모드가 지난번 설정(실내/실외·목표·대체 여부)으로 바로 열린다.
 * 설계: https://claude.ai/artifact/Q6xK7mJ8RFjjPStSsDmpE3
 *
 * 순수 모듈(브라우저 저장은 아래 read/save 가 try/catch 로만 만진다).
 */
import { FREE_GOAL, GOAL_OPTIONS, goalLabel, sameGoal, type RunGoal } from "@/features/running/run-guide";
import type { RunningMode } from "@/features/running/run-session";

export type RunContext = { routineDay: number; goal: RunGoal; replaced: boolean };

/** 시작 화면 목표만 받는다(GOAL_OPTIONS 밖의 값은 자유 달리기). */
export function normalizeGoal(v: unknown): RunGoal {
  if (!v || typeof v !== "object") return FREE_GOAL;
  return GOAL_OPTIONS.find((g) => sameGoal(g, v as RunGoal)) ?? FREE_GOAL;
}

/** URL 한 칸용: free · d5000 · t1800. */
export function goalToParam(goal: RunGoal): string {
  if (goal.kind === "distance") return `d${goal.meters}`;
  if (goal.kind === "time") return `t${goal.sec}`;
  return "free";
}

export function goalFromParam(raw: string | null | undefined): RunGoal {
  if (!raw) return FREE_GOAL;
  const m = /^([dt])(\d{1,6})$/.exec(raw);
  if (!m) return FREE_GOAL;
  return normalizeGoal(m[1] === "d" ? { kind: "distance", meters: Number(m[2]) } : { kind: "time", sec: Number(m[2]) });
}

/** 서버로 넘어온 값 검사 — 틀리면 null(맥락 없이 저장). */
export function parseRunContext(v: unknown): RunContext | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!Number.isInteger(o.routineDay) || (o.routineDay as number) < 0 || (o.routineDay as number) > 6) return null;
  if (typeof o.replaced !== "boolean") return null;
  return { routineDay: o.routineDay as number, goal: normalizeGoal(o.goal), replaced: o.replaced };
}

/** URL(?day=3&goal=d5000&replaced=0) → 맥락. day 가 없으면 루틴 밖에서 연 런닝. */
export function runContextFromParams(p: { day?: string; goal?: string; replaced?: string }): RunContext | null {
  if (p.day === undefined || !/^[0-6]$/.test(p.day)) return null;
  return { routineDay: Number(p.day), goal: goalFromParam(p.goal), replaced: p.replaced === "1" };
}

export function runHref(mode: RunningMode, ctx: RunContext | null): string {
  if (!ctx) return `/running?mode=${mode}`;
  return `/running?mode=${mode}&day=${ctx.routineDay}&goal=${goalToParam(ctx.goal)}&replaced=${ctx.replaced ? 1 : 0}`;
}

export type LastRunRow = { mode: string; goal: unknown; replaced_routine: boolean | null; routine_day: number | null; for_date: string };
export type LastRunSetting = { mode: RunningMode; goal: RunGoal; replaced: boolean; forDate: string; sameRoutine: boolean };

/**
 * 최근 순 기록 → ① 같은 루틴(부위 묶음이 같은 날, sameDates)에서 뛴 마지막 → ② 같은 루틴 일차 →
 * ③ 루틴에서 시작한 마지막 런닝. 루틴 밖 런닝은 쓰지 않는다.
 */
export function pickLastRun(rows: LastRunRow[], routineDay: number, sameDates: ReadonlySet<string> = new Set()): LastRunSetting | null {
  const fromRoutine = rows.filter((r) => r.routine_day !== null && (r.mode === "indoor" || r.mode === "outdoor"));
  const same = fromRoutine.find((r) => sameDates.has(r.for_date)) ?? fromRoutine.find((r) => r.routine_day === routineDay);
  const pick = same ?? fromRoutine[0];
  if (!pick) return null;
  return {
    mode: pick.mode as RunningMode,
    goal: normalizeGoal(pick.goal),
    replaced: pick.replaced_routine === true,
    forDate: pick.for_date,
    sameRoutine: !!same,
  };
}

/** 메뉴 버튼 한 줄: "실내 · 5km · 마무리로". */
export function lastRunLabel(s: Pick<LastRunSetting, "mode" | "goal" | "replaced">): string {
  return `${s.mode === "indoor" ? "실내" : "야외"} · ${goalLabel(s.goal)} · ${s.replaced ? "오늘 운동 대체" : "마무리로"}`;
}

const KEY = "heltch.running.context";
const MAX_AGE_MS = 12 * 3600_000;

/** 루틴에서 연 런닝의 맥락을 이 탭에 기억 — 끝나고 저장할 때 붙인다. 루틴 밖에서 열면 지운다. */
export function saveRunContext(ctx: RunContext | null): void {
  try {
    if (ctx) sessionStorage.setItem(KEY, JSON.stringify({ ...ctx, at: Date.now() }));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* 저장소가 막힌 기기 — 맥락 없이 저장된다. */
  }
}

export function readRunContext(now = Date.now()): RunContext | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { at?: number };
    if (typeof v.at !== "number" || now - v.at > MAX_AGE_MS) return null;
    return parseRunContext(v);
  } catch {
    return null;
  }
}
