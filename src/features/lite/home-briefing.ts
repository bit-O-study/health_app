/**
 * 홈 '오늘 한 줄'(라이트, 2026-10-08) — 순수 로직, AI 없음.
 *
 * 홈을 열 때마다 내 기록에서 지금 제일 쓸모 있는 말 하나만 고른다(라이트 혜자 보고서).
 * 순서: 생리 중·직전(오늘 운동 강도를 바꿀 때) → 오래 쉰 부위(이유가 분명하고 오늘 바로 할 수 있다)
 *   → 정체(다음 한 걸음) → 성장(칭찬).
 * 기록이 없던 부위('4달 넘게')는 매일 같은 잔소리가 되므로 고르지 않는다.
 */
import { BODY_PART_LABEL, type BodyPart } from "@/features/routine/exercise-catalog-labels";
import type { GrowthStory, Plateau, RestingPart } from "@/features/routine/fit-insights";
import type { CycleTip } from "@/features/cycle/cycle-training";

export type Briefing = { kind: "cycle" | "rest" | "plateau" | "growth"; text: string; sub: string; href: string };

/** 을/를·이/가 없이 끝나게 문장을 만든다. */
export function homeBriefing(input: {
  resting: readonly RestingPart[];
  plateaus: readonly (Plateau & { name: string })[];
  stories: readonly (GrowthStory & { name: string })[];
  /** 주기 단계 팁(생리 기록이 있을 때만). 생리 중·직전에만 맨 앞에 온다. */
  cycle?: CycleTip | null;
}): Briefing | null {
  if (input.cycle && (input.cycle.phase === "period" || input.cycle.phase === "premenstrual")) {
    return { kind: "cycle", text: input.cycle.title, sub: input.cycle.tip, href: "/cycle" };
  }
  const rest = input.resting.find((r) => r.days !== null);
  if (rest) {
    const label = BODY_PART_LABEL[rest.part as BodyPart];
    return { kind: "rest", text: `${label} 운동을 ${rest.days}일째 쉬고 있어요`, sub: `${label} 채우는 운동 보기`, href: `/fit?part=${rest.part}` };
  }
  const p = input.plateaus[0];
  if (p) return { kind: "plateau", text: `${p.name} ${p.weeks}주째 그대로예요`, sub: p.advice, href: "/fit" };
  const g = input.stories[0];
  if (g) {
    const gain = Math.round((g.toKg - g.fromKg) * 10) / 10;
    return { kind: "growth", text: `${g.name} ${g.fromKg}kg → ${g.toKg}kg, ${gain}kg 늘었어요`, sub: "내 기록 더 보기", href: "/fit" };
  }
  return null;
}
