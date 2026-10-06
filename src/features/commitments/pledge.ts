/**
 * 행동 다짐(pledge, 2026-10-06 개편) — 순수 로직(스펙·검증·필수 묶음).
 *
 * 다짐은 **앱이 기록으로 판정할 수 있는 행동**만 담는다. 체중·근육량 같은 결과는
 * 다짐이 아니라 '예상'으로만 보여 준다(`prediction.ts`). 판정은 `evaluation.ts`.
 *
 * 필수 묶음 두 가지:
 *  - 소모 kcal 다짐 → 식단 kcal(상한 또는 하한) 다짐이 같이 있어야 한다(체중 예상의 입력).
 *  - 근력 다짐 → 단백질 다짐(체중 × 1.2g 이상)이 같이 있어야 한다(근육 예상의 입력).
 */

import type { BodyPart } from "@/features/routine/exercise-catalog-labels";

export const PLEDGE_PARTS: BodyPart[] = ["chest", "back", "shoulder", "arm", "lower", "core"];

export type StrengthPledge = {
  /** "any" = 부위 상관없이 근력운동. */
  part: BodyPart | "any";
  /** 주 몇 회(그 부위를 운동한 날 수). */
  perWeek: number;
};

export type PledgeSpec = {
  /** 다짐 기간(일). 시작일 포함. */
  days: number;
  /** 주 며칠 운동. `burnKcal` 이 있으면 그 kcal 을 넘긴 날만 센다. */
  workoutDays?: number;
  /** 운동한 날 하루 소모 목표(kcal). `workoutDays` 와 같이 쓴다. */
  burnKcal?: number;
  /** 하루 섭취 상한(kcal) — 7일 평균으로 판정. */
  intakeMax?: number;
  /** 하루 섭취 하한(kcal) — 7일 평균으로 판정(증량). */
  intakeMin?: number;
  /** 하루 몇 끼 기록할지. 식단 다짐이 하나라도 있으면 필수. */
  mealsPerDay?: 1 | 2 | 3;
  /** 하루 단백질(g) — 7일 평균으로 판정. */
  proteinG?: number;
  strength?: StrengthPledge[];
  /** 주 유산소 분. */
  cardioMinWeek?: number;
  /** 하루 걸음 수 + 주 며칠. */
  steps?: { steps: number; perWeek: number };
};

export const PLEDGE_DAYS_MIN = 7;
export const PLEDGE_DAYS_MAX = 180;
/** 단백질 다짐의 하한(체중 × g). 이보다 낮으면 근육 다짐의 의미가 없다. */
export const PROTEIN_MIN_PER_KG = 1.2;
export const PROTEIN_RECOMMEND_PER_KG = 1.6;
/** 이 밑으로 먹는 다짐은 경고한다(막지는 않는다). */
export const INTAKE_WARN_FLOOR = { male: 1500, female: 1200 } as const;

const int = (v: unknown, min: number, max: number): number | undefined => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return n;
};

/** 클라이언트에서 온 값을 정리한다. 범위를 벗어난 항목은 버린다(그 다음 검증이 잡는다). */
export function sanitizePledge(raw: unknown): PledgeSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const days = int(r.days, PLEDGE_DAYS_MIN, PLEDGE_DAYS_MAX);
  if (!days) return null;
  const out: PledgeSpec = { days };
  const wd = int(r.workoutDays, 1, 7);
  if (wd) out.workoutDays = wd;
  const burn = int(r.burnKcal, 50, 3000);
  if (burn) out.burnKcal = burn;
  const imax = int(r.intakeMax, 300, 6000);
  if (imax) out.intakeMax = imax;
  const imin = int(r.intakeMin, 300, 8000);
  if (imin) out.intakeMin = imin;
  const meals = int(r.mealsPerDay, 1, 3);
  if (meals) out.mealsPerDay = meals as 1 | 2 | 3;
  const prot = int(r.proteinG, 10, 400);
  if (prot) out.proteinG = prot;
  if (Array.isArray(r.strength)) {
    const seen = new Set<string>();
    const list: StrengthPledge[] = [];
    for (const s of r.strength) {
      if (!s || typeof s !== "object") continue;
      const part = (s as { part?: unknown }).part;
      const okPart = part === "any" || PLEDGE_PARTS.includes(part as BodyPart);
      const per = int((s as { perWeek?: unknown }).perWeek, 1, 7);
      if (!okPart || !per || seen.has(String(part))) continue;
      seen.add(String(part));
      list.push({ part: part as StrengthPledge["part"], perWeek: per });
    }
    if (list.length > 0) out.strength = list;
  }
  const cardio = int(r.cardioMinWeek, 10, 2000);
  if (cardio) out.cardioMinWeek = cardio;
  if (r.steps && typeof r.steps === "object") {
    const st = int((r.steps as { steps?: unknown }).steps, 1000, 50000);
    const per = int((r.steps as { perWeek?: unknown }).perWeek, 1, 7);
    if (st && per) out.steps = { steps: st, perWeek: per };
  }
  return out;
}

export function hasDiet(p: PledgeSpec): boolean {
  return p.intakeMax !== undefined || p.intakeMin !== undefined || p.proteinG !== undefined;
}

export function hasStrength(p: PledgeSpec): boolean {
  return (p.strength?.length ?? 0) > 0;
}

/** 다짐 항목이 하나라도 있는가(기간만 있는 다짐은 다짐이 아니다). */
export function hasAnyItem(p: PledgeSpec): boolean {
  return (
    p.workoutDays !== undefined ||
    hasDiet(p) ||
    p.mealsPerDay !== undefined ||
    hasStrength(p) ||
    p.cardioMinWeek !== undefined ||
    p.steps !== undefined
  );
}

export type PledgeCheck = { errors: string[]; warnings: string[] };

/**
 * 저장 전 검증 — 필수 묶음과 수치 관계. errors 가 있으면 저장하지 않는다.
 * warnings 는 화면에 보여 주되 저장은 막지 않는다.
 */
export function validatePledge(
  p: PledgeSpec,
  body: { weightKg: number; gender: "male" | "female" },
): PledgeCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!hasAnyItem(p)) errors.push("다짐 항목을 하나 이상 골라 주세요.");
  if (p.burnKcal !== undefined && p.workoutDays === undefined) {
    errors.push("소모 칼로리는 '주 며칠'과 함께 정해 주세요.");
  }
  if (p.burnKcal !== undefined && p.intakeMax === undefined && p.intakeMin === undefined) {
    errors.push("칼로리 소모 다짐은 식단 칼로리 다짐과 같이 만들어야 해요.");
  }
  if (hasStrength(p)) {
    const need = Math.ceil(body.weightKg * PROTEIN_MIN_PER_KG);
    if (p.proteinG === undefined) {
      errors.push("근력 다짐은 단백질 다짐과 같이 만들어야 해요.");
    } else if (p.proteinG < need) {
      errors.push(`단백질은 하루 ${need}g(체중 × ${PROTEIN_MIN_PER_KG}g) 이상으로 정해 주세요.`);
    }
  }
  if ((hasDiet(p) || p.mealsPerDay !== undefined) && p.mealsPerDay === undefined) {
    errors.push("식단 다짐은 하루 몇 끼 기록할지 골라 주세요.");
  }
  if (p.intakeMax !== undefined && p.intakeMin !== undefined && p.intakeMin >= p.intakeMax) {
    errors.push("섭취 하한은 상한보다 낮아야 해요.");
  }
  if (p.intakeMax !== undefined && p.intakeMax < INTAKE_WARN_FLOOR[body.gender]) {
    warnings.push(
      `하루 ${INTAKE_WARN_FLOOR[body.gender].toLocaleString()}kcal 미만은 건강에 무리가 될 수 있어요.`,
    );
  }
  return { errors, warnings };
}

/** 사람이 읽는 항목 목록 — 카드·공유·현황이 같은 문구를 쓴다. */
export function pledgeLines(p: PledgeSpec, partLabel: (part: BodyPart) => string): string[] {
  const out: string[] = [];
  if (p.workoutDays !== undefined) {
    out.push(
      p.burnKcal !== undefined
        ? `주 ${p.workoutDays}일 · 하루 ${p.burnKcal.toLocaleString()}kcal 이상 소모`
        : `주 ${p.workoutDays}일 운동`,
    );
  }
  for (const s of p.strength ?? []) {
    out.push(
      s.part === "any"
        ? `근력운동 주 ${s.perWeek}회`
        : `${partLabel(s.part)} 운동 주 ${s.perWeek}회`,
    );
  }
  if (p.cardioMinWeek !== undefined) out.push(`유산소 주 ${p.cardioMinWeek}분`);
  if (p.steps) out.push(`하루 ${p.steps.steps.toLocaleString()}보 · 주 ${p.steps.perWeek}일`);
  if (p.mealsPerDay !== undefined) out.push(`하루 ${p.mealsPerDay}끼 식단 기록`);
  if (p.intakeMax !== undefined) out.push(`하루 ${p.intakeMax.toLocaleString()}kcal 이하 먹기`);
  if (p.intakeMin !== undefined) out.push(`하루 ${p.intakeMin.toLocaleString()}kcal 이상 먹기`);
  if (p.proteinG !== undefined) out.push(`단백질 하루 ${p.proteinG}g 이상`);
  return out;
}
