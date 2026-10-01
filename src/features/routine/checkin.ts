/**
 * 오늘 컨디션 체크인 · 아픈 부위 — 무료 기능(2026-09-30, `docs/ai-trainer-plans-2026-09-30.html` 추가 제안).
 *
 * 순수 모듈. 3번 탭(수면·근육통·에너지)으로 오늘 강도를 권하고, 아픈 부위를 오늘 운동과 맞춰 본다.
 * 🔴 권하기만 한다 — 세트를 줄이는 건 사용자가 [오늘만 세트 줄이기]를 눌렀을 때, 오늘 계획에서만(원칙 2).
 */
import { BODY_PART_LABEL, type BodyPart } from "@/features/routine/exercise-catalog-labels";
import { primaryBodyPart } from "@/features/routine/exercise-body-parts";
import type { SetDetail } from "@/features/routine/set-details";

/** 1=나쁨 2=보통 3=좋음 (근육통은 1=심함 2=조금 3=없음 — 높을수록 좋은 쪽으로 맞춘다). */
export type Level = 1 | 2 | 3;
export type Checkin = { sleep: Level; soreness: Level; energy: Level };

export const CHECKIN_QUESTIONS: { key: keyof Checkin; label: string; options: [string, string, string] }[] = [
  { key: "sleep", label: "잠은 잘 잤나요?", options: ["못 잤어요", "보통", "잘 잤어요"] },
  { key: "soreness", label: "근육통은요?", options: ["심해요", "조금", "없어요"] },
  { key: "energy", label: "기운은요?", options: ["없어요", "보통", "좋아요"] },
];

export function isLevel(v: unknown): v is Level {
  return v === 1 || v === 2 || v === 3;
}

export function isCheckin(v: unknown): v is Checkin {
  const c = v as Partial<Checkin> | null;
  return !!c && isLevel(c.sleep) && isLevel(c.soreness) && isLevel(c.energy);
}

export type Advice = { kind: "light" | "normal" | "good"; text: string };

/**
 * 권하는 강도. 하나라도 '나쁨'이거나 합이 5 이하면 가볍게 — 한 항목만 나빠도(예: 잠 못 잠)
 * 무거운 세트에서 다치기 쉽다. 모두 좋으면 평소대로.
 */
export function adviceFor(c: Checkin): Advice {
  const sum = c.sleep + c.soreness + c.energy;
  if (c.sleep === 1 || c.soreness === 1 || c.energy === 1 || sum <= 5) {
    return { kind: "light", text: "오늘은 가볍게 가요. 세트를 하나씩 줄이고, 아프면 바로 멈추세요." };
  }
  if (sum >= 8) return { kind: "good", text: "컨디션 좋아요! 평소대로, 할 수 있으면 조금 더 도전해 보세요." };
  return { kind: "normal", text: "평소대로 하되, 마지막 세트에서 무리하지 마세요." };
}

/** AI 트레이너가 보는 한 줄. */
export function checkinLine(c: Checkin): string {
  const pick = (k: keyof Checkin) => CHECKIN_QUESTIONS.find((q) => q.key === k)!.options[c[k] - 1];
  return `오늘 컨디션: 잠 ${pick("sleep")}, 근육통 ${pick("soreness")}, 기운 ${pick("energy")}`;
}

/* ─── 세트 줄이기(오늘만) ─────────────────────────────────────────────── */

export type PlanRowSets = { sets: number; setDetails: SetDetail[] | null };

/** 한 줄의 세트를 하나 줄인다(최소 1). 세트별 기록이면 마지막 세트를 뺀다. */
export function lightenRow(row: PlanRowSets): PlanRowSets {
  if (row.setDetails && row.setDetails.length > 0) {
    const d = row.setDetails.length > 1 ? row.setDetails.slice(0, -1) : row.setDetails;
    return { sets: d.length, setDetails: d };
  }
  return { sets: Math.max(1, row.sets - 1), setDetails: null };
}

/* ─── 아픈 부위 ───────────────────────────────────────────────────────── */

export const PAIN_AREAS: readonly BodyPart[] = ["chest", "back", "shoulder", "arm", "lower", "core"];

/** 사람이 떠올리는 말로 — '하체'보다 '무릎·다리'가 아픈 곳에 가깝다. */
export const PAIN_LABEL: Record<BodyPart, string> = {
  chest: "가슴",
  back: "등·허리",
  shoulder: "어깨",
  arm: "팔·팔꿈치·손목",
  lower: "다리·무릎",
  core: "복부·코어",
};

export function isPainArea(v: unknown): v is BodyPart {
  return typeof v === "string" && (PAIN_AREAS as readonly string[]).includes(v);
}

export function cleanPainAreas(v: unknown): BodyPart[] {
  return Array.isArray(v) ? [...new Set(v.filter(isPainArea))] : [];
}

/** 오늘 운동 중 아픈 부위에 해당하는 것 — 부위별 운동 수. 없으면 빈 배열. */
export function painConflicts(
  exerciseIds: readonly string[],
  painAreas: readonly BodyPart[],
): { part: BodyPart; count: number }[] {
  if (!painAreas.length) return [];
  const counts = new Map<BodyPart, number>();
  for (const id of exerciseIds) {
    const p = primaryBodyPart(id);
    if (painAreas.includes(p)) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return PAIN_AREAS.filter((p) => counts.has(p)).map((part) => ({ part, count: counts.get(part)! }));
}

export function painLine(painAreas: readonly BodyPart[]): string {
  return `아픈 부위(추천에서 뺌): ${painAreas.map((p) => PAIN_LABEL[p]).join(", ")}`;
}

export { BODY_PART_LABEL };

/**
 * AI 트레이너가 보는 내 상태 줄 + 오늘 컨디션 + 아픈 부위. 화면의 '내 상태' 카드와 AI 입력이
 * **같은 줄**을 쓰게 한 곳에서 만든다(보여 준 것과 보낸 것이 달라지지 않게).
 */
export function trainerStateLines(
  base: readonly string[],
  checkin: Checkin | null,
  painAreas: readonly BodyPart[],
): string[] {
  const out = [...base];
  if (checkin) out.push(checkinLine(checkin));
  if (painAreas.length) out.push(painLine(painAreas));
  return out;
}
