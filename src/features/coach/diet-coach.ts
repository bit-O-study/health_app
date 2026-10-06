/**
 * AI 식단 관리 — AI 트레이너 2단계(2026-09-30, `docs/ai-trainer-plans-2026-09-30.html`).
 *
 * 순수 모듈. 하루 목표(규칙) · 오늘 먹은 양 정리 · AI 에 보낼 글 · AI 답 읽기.
 * 🔴 목표 숫자는 규칙으로 계산하고 AI 는 피드백 문장과 메뉴 제안만 만든다 — 목표 kcal 을 AI 가
 *    정하면 날마다 달라진다.
 */
import type { MacroTarget } from "@/features/diet/calorie-target";
import type { Goal } from "@/features/profile/goal";
import { GOAL_LABEL } from "@/features/profile/goal";

/** 목표별 하루 칼로리 조정(kcal). 감량은 한 주 약 0.4kg 속도, 증량은 지방이 덜 붙는 선. */
export const GOAL_KCAL_ADJUST: Record<Goal, number> = {
  weight_loss: -400,
  fat_loss: -300,
  muscle_gain: 250,
  maintain: 0,
};

/** 아무리 감량이라도 이 밑으로는 권하지 않는다(기초대사 아래로 굶기지 않는다). */
export const MIN_KCAL = { male: 1500, female: 1200 } as const;

/** 기본 목표(`dailyTarget`)에 운동 목표를 반영한 하루 kcal. */
export function goalKcal(base: MacroTarget, goal: Goal | null, gender: "male" | "female"): number {
  const adj = goal ? GOAL_KCAL_ADJUST[goal] : 0;
  return Math.max(MIN_KCAL[gender], Math.round((base.kcal + adj) / 10) * 10);
}

export type FoodLogLite = { name: string; meal: string; kcal: number; proteinG: number };

export type TodayIntake = {
  kcal: number;
  proteinG: number;
  waterMl: number;
  /** 끼니별 음식 이름(중복 제거, 끼니당 최대 6개). */
  meals: { meal: string; names: string[] }[];
};

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;
export const MEAL_LABEL: Record<string, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

export function summarizeToday(logs: readonly FoodLogLite[], waterMl: number): TodayIntake {
  const by = new Map<string, Set<string>>();
  let kcal = 0;
  let protein = 0;
  for (const l of logs) {
    kcal += Number.isFinite(l.kcal) ? Math.max(0, l.kcal) : 0;
    protein += Number.isFinite(l.proteinG) ? Math.max(0, l.proteinG) : 0;
    const set = by.get(l.meal) ?? new Set<string>();
    if (l.name && set.size < 6) set.add(l.name);
    by.set(l.meal, set);
  }
  const meals = MEAL_ORDER.filter((m) => by.has(m)).map((m) => ({ meal: m, names: [...by.get(m)!] }));
  return { kcal: Math.round(kcal), proteinG: Math.round(protein), waterMl: Math.max(0, Math.round(waterMl)), meals };
}

export type DietTargets = { kcal: number; proteinG: number; waterMl: number };

/** 목표 대비 %(0~) — 막대 그래프·AI 입력 공용. 목표가 0이면 0. */
export function pctOf(value: number, target: number): number {
  return target > 0 ? Math.round((value / target) * 100) : 0;
}

export const DIET_SYSTEM = [
  "너는 영양 코치 '헬쑤쌤'이다. 회원의 오늘 식단을 목표와 비교해 짧게 피드백한다.",
  "- 목표 숫자는 이미 정해져 있다. 새 목표를 만들지 말고 주어진 숫자로 말한다.",
  "- good(잘한 점) 1~2개, fix(고칠 점) 1~2개, tomorrow(내일 먹으면 좋은 구체적 메뉴) 2~3개. 각 40자 안팎, 한국어 존댓말.",
  "- 아직 저녁 전이면 '남은 끼니에서 채울 것'으로 말한다. 의학적 진단·치료·약 권유는 하지 않는다.",
  '반드시 JSON 객체 하나만(설명·코드펜스 없이): {"summary":"1~2문장","good":["..."],"fix":["..."],"tomorrow":["..."]}',
].join("\n");

export function buildDietUserText(
  goal: Goal | null,
  targets: DietTargets,
  today: TodayIntake,
  hourKst: number,
): string {
  const meals = today.meals.length
    ? today.meals.map((m) => `${MEAL_LABEL[m.meal] ?? m.meal}: ${m.names.join(", ")}`).join("\n")
    : "아직 기록 없음";
  return [
    `목표: ${goal ? GOAL_LABEL[goal] : "정하지 않음"}`,
    `하루 목표: ${targets.kcal}kcal · 단백질 ${targets.proteinG}g · 수분 ${targets.waterMl}ml`,
    `오늘 지금까지(${hourKst}시): ${today.kcal}kcal(${pctOf(today.kcal, targets.kcal)}%) · 단백질 ${today.proteinG}g(${pctOf(today.proteinG, targets.proteinG)}%) · 수분 ${today.waterMl}ml(${pctOf(today.waterMl, targets.waterMl)}%)`,
    `먹은 것:\n${meals}`,
  ].join("\n");
}

export type DietFeedback = { summary: string; good: string[]; fix: string[]; tomorrow: string[] };

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const list = (v: unknown, n: number) =>
  (Array.isArray(v) ? v : []).map((x) => clip(x, 80)).filter(Boolean).slice(0, n);

/** AI 답 → 피드백. 고칠 점·내일 제안이 둘 다 비면 믿지 않는다(null). */
export function parseDietFeedback(text: string): DietFeedback | null {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text.slice(s, e + 1));
  } catch {
    return null;
  }
  const fb: DietFeedback = {
    summary: clip(raw.summary, 200),
    good: list(raw.good, 2),
    fix: list(raw.fix, 2),
    tomorrow: list(raw.tomorrow, 3),
  };
  if (fb.fix.length === 0 && fb.tomorrow.length === 0) return null;
  return fb;
}

export function dietStorageKey(userId: string, ymd: string): string {
  return `jimkkun.ai-diet.${userId}.${ymd}`;
}

export function readStoredDiet(raw: string | null): DietFeedback | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as DietFeedback;
    if (!v || typeof v.summary !== "string") return null;
    return { summary: v.summary, good: list(v.good, 2), fix: list(v.fix, 2), tomorrow: list(v.tomorrow, 3) };
  } catch {
    return null;
  }
}
