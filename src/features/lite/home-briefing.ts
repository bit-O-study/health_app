/**
 * 홈 '오늘 한 줄'(라이트, 2026-10-08) — 순수 로직, AI 없음.
 *
 * 홈을 열 때마다 내 기록에서 지금 제일 쓸모 있는 말 하나만 고른다(라이트 혜자 보고서).
 * 순서: 생리 중·직전(오늘 운동 강도를 바꿀 때) → 오늘 이미 운동함(정리 + 그 부위 다시 할 때)
 *   → 오래 쉰 부위(이유가 분명하고 오늘 바로 할 수 있다) → 정체·하락(다음 한 걸음)
 *   → 오늘 하기 좋은 부위(다 회복됐고 가장 오래 쉰 곳, 3일 이상) → 성장(칭찬).
 * 기록이 없던 부위('4달 넘게')는 매일 같은 잔소리가 되므로 고르지 않는다.
 */
import { BODY_PART_LABEL, type BodyPart } from "@/features/routine/exercise-catalog-labels";
import type { GrowthStory, Plateau, RestingPart } from "@/features/routine/fit-insights";
import type { CycleTip } from "@/features/cycle/cycle-training";

export type Briefing = { kind: "cycle" | "today" | "rest" | "plateau" | "ready" | "growth"; text: string; sub: string; href: string };

/** 오늘 이미 한 운동 — 가장 많이 한 부위 · 세트 · 그 부위가 다 풀리는 때(서울 'M/D 저녁'). */
export type TodayDone = { part: BodyPart | null; sets: number; readyText: string | null };
/** 다 회복된 부위 중 가장 오래 쉰 곳. */
export type ReadyPart = { part: BodyPart; days: number };

/** 을/를·이/가 없이 끝나게 문장을 만든다. */
export function homeBriefing(input: {
  resting: readonly RestingPart[];
  plateaus: readonly (Plateau & { name: string })[];
  stories: readonly (GrowthStory & { name: string })[];
  /** 주기 단계 팁(생리 기록이 있을 때만). 생리 중·직전에만 맨 앞에 온다. */
  cycle?: CycleTip | null;
  /** 오늘 이미 운동했으면 — 잔소리 대신 정리. */
  today?: TodayDone | null;
  /** 오늘 하기 좋은 부위(다 회복 · 3일 이상 쉼). */
  ready?: ReadyPart | null;
}): Briefing | null {
  if (input.cycle && (input.cycle.phase === "period" || input.cycle.phase === "premenstrual")) {
    return { kind: "cycle", text: input.cycle.title, sub: input.cycle.tip, href: "/cycle" };
  }
  if (input.today && input.today.sets > 0) {
    const t = input.today;
    const label = t.part ? BODY_PART_LABEL[t.part] : null;
    return {
      kind: "today",
      text: label ? `오늘 ${label} ${t.sets}세트 했어요` : `오늘 ${t.sets}세트 했어요`,
      sub: label && t.readyText ? `다음 ${label} 운동은 ${t.readyText}부터 · 리포트 보기` : "오늘 운동 리포트 보기",
      href: "/routine",
    };
  }
  const rest = input.resting.find((r) => r.days !== null);
  if (rest) {
    const label = BODY_PART_LABEL[rest.part as BodyPart];
    return { kind: "rest", text: `${label} 운동을 ${rest.days}일째 쉬고 있어요`, sub: `${label} 채우는 운동 보기`, href: `/fit?part=${rest.part}` };
  }
  const p = input.plateaus[0];
  if (p) {
    const text = p.kind === "decline" ? `${p.name} 기록이 떨어지고 있어요` : `${p.name} ${p.weeks}주째 그대로예요`;
    return { kind: "plateau", text, sub: p.advice, href: "/fit" };
  }
  if (input.ready && input.ready.days >= 3) {
    const label = BODY_PART_LABEL[input.ready.part];
    return { kind: "ready", text: `오늘은 ${label} 하기 좋아요`, sub: `다 회복됐고 ${input.ready.days}일 쉬었어요 · ${label} 채우는 운동 보기`, href: `/fit?part=${input.ready.part}` };
  }
  const g = input.stories[0];
  if (g) {
    const gain = Math.round((g.toKg - g.fromKg) * 10) / 10;
    return { kind: "growth", text: `${g.name} ${g.fromKg}kg → ${g.toKg}kg, ${gain}kg 늘었어요`, sub: "내 기록 더 보기", href: "/fit" };
  }
  return null;
}
