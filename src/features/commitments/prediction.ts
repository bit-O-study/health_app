/**
 * 다짐 예상 결과 — rule-v3(2026-10-06). 순수 로직.
 *
 * 하루 단위 시뮬레이션. 매일 아래를 다시 계산한다.
 *
 * 소비 = BMR(그날 체중) + 일상활동(BMR₀×0.1×체중비) + 식이열(TEF, 섭취×0.1)
 *       + 운동(소모 다짐 순소모 + 유산소 + 걸음, ×체중비) + 적응성 열발생(AT)
 *  - AT: 목표값 0.14 × (섭취 − 시작 유지칼로리) 로 14일 시정수로 다가간다(Hall 2011).
 *  - 글리코겐: 섭취가 유지의 85% 미만이면 하루 최대 50g, 총 0.3kg(여 0.25kg)까지 먼저
 *    쓴다(4,200kcal/kg). 글리코겐 1g 은 물 2.7g 과 같이 빠진다 — 첫 주 '급감'의 정체.
 *  - 몸 분배: 지방 9,400kcal/kg · 제지방 1,800kcal/kg(Hall).
 *     근력+단백질 다짐 ○ → 제지방 = 근육 식(아래, 매일 그날 칼로리로 E 를 다시 낸다).
 *                         적자가 너무 커서 E<0 이면 Forbes 손실의 40% 만(근력이 지킨다).
 *     근력+단백질 다짐 ✕ → Forbes 분배 p = 10.4 / (10.4 + 체지방kg).
 *
 * 근육(제지방, 30일당) = 체중 × r(경력) × S(주 횟수) × P(단백질 g/kg) × E(칼로리)
 *                      × A(나이) × X(성별) × Q(부위 비중) × K(FFMI 상한까지 남은 여지)
 *  - 12개월이 지나면 경력이 한 단계 오른다(입문→중급→숙련) — 초보 효과가 끝난다.
 *  - K = (FFMI상한 − FFMI) / (FFMI상한 − 기준), 남 25/18 · 여 21/15, 0.1~1.
 *
 * 범위: 유지칼로리 추정 오차 ±8%를 기간 동안 누적 + 수분 ±0.5kg. 근육은 ±35%.
 * 개인 보정: 지난 다짐의 '실측 ÷ 예측' 비율(0.5~1.5)이 있으면 변화량에 곱한다.
 *
 * 예상은 **필요한 다짐이 다 있을 때만** — 체중은 식단 kcal, 근육은 근력 + 단백질.
 * 결과 데이터가 쌓이면 AI 모델로 바꾼다(`FORMULA_VERSION` 으로 구분해 저장).
 */

import type { BodyPart } from "@/features/routine/exercise-catalog-labels";
import {
  INTAKE_WARN_FLOOR,
  PROTEIN_RECOMMEND_PER_KG,
  hasStrength,
  type PledgeSpec,
} from "@/features/commitments/pledge";

export const FORMULA_VERSION = "rule-v3";

export type Experience = "beginner" | "intermediate" | "advanced";

export type BodyInput = {
  gender: "male" | "female";
  /** 나이(나이대 대표값). 모르면 30. */
  age: number;
  /** 프로필에 등록한 키. */
  heightCm: number | null;
  /** 현재 체중 — 최근 체중 기록 > InBody > 프로필 순. */
  weightKg: number;
  /** **측정한** 체지방률(체중 기록·프로필). 없으면 추정한다. InBody 가 있으면 그쪽이 우선. */
  bodyFatPct: number | null;
  experience: Experience;
  /** 최근 InBody(또는 직접 입력한 체성분) — 제지방·골격근·부위 근육을 실측값으로 쓴다. */
  inbody?: InbodyInput | null;
  /** 실제 기록(식단 + 체중 변화)으로 구한 개인 대사 보정(0.8~1.2). 없으면 1. */
  metabolicFactor?: number | null;
};

export type InbodyInput = {
  measuredAt: string;
  weightKg: number | null;
  bodyFatKg: number | null;
  bodyFatPct: number | null;
  skeletalMuscleKg: number | null;
  /** 부위 근육량(좌우 합). 직접 입력이면 없을 수 있다. */
  armsKg: number | null;
  trunkKg: number | null;
  legsKg: number | null;
};

export type Segment = "arms" | "trunk" | "legs";
export const SEGMENT_LABEL: Record<Segment, string> = { arms: "팔", trunk: "몸통", legs: "다리" };
/** 근력 부위 → InBody 부위. */
export const PART_SEGMENT: Record<BodyPart, Segment> = {
  arm: "arms",
  lower: "legs",
  chest: "trunk",
  back: "trunk",
  shoulder: "trunk",
  core: "trunk",
};

/** 지난 다짐의 실측 ÷ 예측 — 있으면 변화량에 곱한다. */
export type Calibration = { weight: number | null; muscle: number | null; samples: number };

export const KCAL_PER_KG_FAT = 9400;
export const KCAL_PER_KG_LEAN = 1800;
export const KCAL_PER_KG_GLYCOGEN = 4200;
/** 글리코겐 1g 당 같이 빠지는 물(g). */
export const GLYCOGEN_WATER = 2.7;
/** 운동을 뺀 일상 활동 — BMR 의 10%(앉아서 지내는 수준). TEF 는 따로 섭취×10%. */
export const NEAT_SHARE = 0.1;
export const TEF_SHARE = 0.1;
/** 운동 소모 중 안정 대사를 뺀 순 소모 비율. */
export const NET_EXERCISE = 0.85;
/** 적응성 열발생 계수(Hall 2011 β_AT) · 시정수(일). */
export const AT_BETA = 0.14;
export const AT_TAU_DAYS = 14;
/** 제지방 증가 중 골격근(InBody) 비율. */
export const SMM_SHARE = 0.55;
/** 유산소 MET(앱 `kcalToMinutes` 와 같은 값). */
export const CARDIO_MET = 6;
/** 걸음 kcal = 걸음 × 체중 × 이 값(앱 `steps-calories.ts`). 일상 기본 5,000보 초과분만. */
export const STEP_KCAL_PER_KG = 0.00057;
export const BASE_STEPS = 5000;

const R_EXP: Record<Experience, number> = {
  beginner: 0.0125,
  intermediate: 0.0075,
  advanced: 0.00375,
};
const NEXT_EXP: Record<Experience, Experience> = {
  beginner: "intermediate",
  intermediate: "advanced",
  advanced: "advanced",
};
const FFMI = { male: { max: 25, ref: 18 }, female: { max: 21, ref: 15 } } as const;
const GLYCOGEN_POOL = { male: 0.3, female: 0.25 } as const;
/** 체중 감량 목표의 체지방률 하한 — 근육을 지키며 갈 수 있는 끝. */
const BODY_FAT_FLOOR = { male: 10, female: 18 } as const;

/** 부위만 고른 근력 다짐의 비중(합 1). */
export const PART_SHARE: Record<BodyPart, number> = {
  lower: 0.35,
  back: 0.2,
  chest: 0.15,
  arm: 0.12,
  shoulder: 0.1,
  core: 0.08,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** 체지방률 — 측정값, 없으면 Deurenberg(BMI·나이·성별), 키도 없으면 성별 평균. */
export function estimateBodyFatPct(b: BodyInput): number {
  const ffm = inbodyFfm(b);
  if (ffm !== null) return clamp(((b.weightKg - ffm) / b.weightKg) * 100, 3, 70);
  if (b.bodyFatPct !== null && b.bodyFatPct > 2 && b.bodyFatPct < 70) return b.bodyFatPct;
  if (!b.heightCm || b.heightCm < 100) return b.gender === "male" ? 20 : 28;
  const bmi = b.weightKg / (b.heightCm / 100) ** 2;
  const sex = b.gender === "male" ? 1 : 0;
  return clamp(1.2 * bmi + 0.23 * b.age - 10.8 * sex - 5.4, 5, 60);
}

/**
 * InBody 제지방량(kg). 측정 뒤 체중이 바뀌었으면 **제지방은 그대로, 차이는 지방**으로 본다
 * (몇 주 사이 체중 변화는 대부분 지방·수분이다). 측정이 없거나 값이 이상하면 null.
 */
export function inbodyFfm(b: BodyInput): number | null {
  const ib = b.inbody;
  if (!ib) return null;
  const w = ib.weightKg ?? b.weightKg;
  const fat = ib.bodyFatKg ?? (ib.bodyFatPct !== null ? (w * ib.bodyFatPct) / 100 : null);
  if (fat === null || !(w > 0)) return null;
  const ffm = w - fat;
  if (ffm <= 0 || ffm >= b.weightKg) return null;
  return ffm;
}

/** 체지방을 실측했는가(InBody·직접 입력 체성분 또는 체지방률 기록). */
export function bodyFatMeasured(b: BodyInput): boolean {
  return inbodyFfm(b) !== null || b.bodyFatPct !== null;
}

/**
 * 골격근 ÷ 제지방 — InBody 가 있으면 내 값(0.45~0.62), 없으면 0.55.
 * 늘어난 제지방 중 골격근이 얼마인지 환산할 때 쓴다.
 */
export function smmShareOf(b: BodyInput): number {
  const ffm = inbodyFfm(b);
  const smm = b.inbody?.skeletalMuscleKg ?? null;
  if (ffm === null || smm === null) return SMM_SHARE;
  return clamp(smm / ffm, 0.45, 0.62);
}

/** 기초대사 — 체지방 실측이 있으면 Katch-McArdle, 없으면 Mifflin-St Jeor. 개인 대사 보정을 곱한다. */
export function bmrOf(b: BodyInput, weightKg: number, ffmKg: number): number {
  const k = clamp(b.metabolicFactor ?? 1, 0.8, 1.2);
  if (bodyFatMeasured(b)) return (370 + 21.6 * ffmKg) * k;
  if (!b.heightCm) return (b.gender === "male" ? 1700 : 1400) * (weightKg / b.weightKg) * k;
  return (10 * weightKg + 6.25 * b.heightCm - 5 * b.age + (b.gender === "male" ? 5 : -161)) * k;
}

/**
 * 개인 대사 보정 — 실제로 먹은 양과 체중 변화로 구한 유지칼로리 ÷ 공식 유지칼로리.
 * 식단 기록 14일 이상, 체중 두 점이 14일 이상 떨어져 있을 때만(아니면 null).
 * 기록 누락이 섞이면 섭취가 낮게 잡히므로 0.8~1.2 로 묶는다.
 */
export function observedMetabolicFactor(input: {
  body: BodyInput;
  avgIntakeKcal: number;
  loggedDays: number;
  weightChangeKg: number;
  spanDays: number;
  /** 그 기간 하루 평균 운동 소모(기록). */
  avgExerciseKcal: number;
}): number | null {
  if (input.loggedDays < 14 || input.spanDays < 14) return null;
  const observed = input.avgIntakeKcal - (input.weightChangeKg * 7700) / input.spanDays;
  const b = { ...input.body, metabolicFactor: 1 };
  const ffm = b.weightKg * (1 - estimateBodyFatPct(b) / 100);
  const formula =
    (bmrOf(b, b.weightKg, ffm) * (1 + NEAT_SHARE) + input.avgExerciseKcal * NET_EXERCISE) /
    (1 - TEF_SHARE);
  if (!(formula > 0) || !(observed > 0)) return null;
  return Math.round(clamp(observed / formula, 0.8, 1.2) * 100) / 100;
}

/** 다짐에 필요한 몸 정보가 다 있는가 — 키·체중·체지방·골격근(InBody 또는 직접 입력). */
export function missingBodyFields(b: {
  heightCm: number | null;
  weightKg: number | null;
  inbody: InbodyInput | null | undefined;
}): ("height" | "weight" | "bodyFat" | "skeletalMuscle")[] {
  const out: ("height" | "weight" | "bodyFat" | "skeletalMuscle")[] = [];
  if (!b.heightCm) out.push("height");
  if (!b.weightKg && !b.inbody?.weightKg) out.push("weight");
  if (b.inbody?.bodyFatKg == null && b.inbody?.bodyFatPct == null) out.push("bodyFat");
  if (b.inbody?.skeletalMuscleKg == null) out.push("skeletalMuscle");
  return out;
}

/** 부위별 현재 근육량(InBody) + 예상 증가 — 골격근 증가를 부위로 나눈다. */
export function segmentForecast(
  b: BodyInput,
  p: PledgeSpec,
  muscleGainKg: number,
): { segment: Segment; label: string; nowKg: number | null; gainKg: number }[] {
  const ib = b.inbody;
  const now: Record<Segment, number | null> = {
    arms: ib?.armsKg ?? null,
    trunk: ib?.trunkKg ?? null,
    legs: ib?.legsKg ?? null,
  };
  const weight: Record<Segment, number> = { arms: 0, trunk: 0, legs: 0 };
  const list = p.strength ?? [];
  if (list.some((s) => s.part === "any")) {
    // 전신 — 지금 부위 근육 비율대로(없으면 일반 비율).
    const known = (["arms", "trunk", "legs"] as const).every((s) => now[s] !== null);
    const base: Record<Segment, number> = known
      ? { arms: now.arms!, trunk: now.trunk!, legs: now.legs! }
      : { arms: 0.15, trunk: 0.45, legs: 0.4 };
    for (const s of ["arms", "trunk", "legs"] as const) weight[s] += base[s];
  }
  for (const s of list) {
    if (s.part === "any") continue;
    weight[PART_SEGMENT[s.part as BodyPart]] += PART_SHARE[s.part as BodyPart];
  }
  const total = weight.arms + weight.trunk + weight.legs;
  if (total <= 0) return [];
  return (["arms", "trunk", "legs"] as const)
    .filter((s) => weight[s] > 0)
    .map((s) => ({
      segment: s,
      label: SEGMENT_LABEL[s],
      nowKg: now[s],
      gainKg: Math.round(((muscleGainKg * weight[s]) / total) * 100) / 100,
    }));
}

/** 시작 체중 기준 하루 평균 운동 소모(kcal) — 소모 다짐(순) + 유산소 + 걸음 초과분. */
export function exercisePerDay(p: PledgeSpec, weightKg: number): number {
  let kcal = 0;
  if (p.burnKcal !== undefined && p.workoutDays !== undefined) {
    kcal += ((p.burnKcal * p.workoutDays) / 7) * NET_EXERCISE;
  } else if (hasStrength(p)) {
    kcal += ((strengthSessions(p) * STRENGTH_SESSION_KCAL) / 7) * NET_EXERCISE;
  }
  // 소모 다짐이 있으면 유산소는 이미 그 안에 들어 있다고 본다(이중 계산 방지).
  if (p.cardioMinWeek !== undefined && p.burnKcal === undefined) {
    kcal += (((CARDIO_MET * 3.5 * weightKg) / 200) * p.cardioMinWeek / 7) * NET_EXERCISE;
  }
  if (p.steps) {
    kcal += (Math.max(0, p.steps.steps - BASE_STEPS) * weightKg * STEP_KCAL_PER_KG * p.steps.perWeek) / 7;
  }
  return kcal;
}

/** 근력 세션 하나의 대략 소모 — 소모 다짐이 없을 때 칼로리 수지용. */
const STRENGTH_SESSION_KCAL = 250;

/** 주 근력운동 횟수(부위 다짐은 더한다, 상한 7). */
export function strengthSessions(p: PledgeSpec): number {
  return Math.min(7, (p.strength ?? []).reduce((s, x) => s + x.perWeek, 0));
}

export function sessionFactor(n: number): number {
  if (n <= 0) return 0;
  if (n === 1) return 0.5;
  if (n === 2) return 0.8;
  if (n === 3) return 0.95;
  return 1;
}

/** 단백질 계수 — 0.8g/kg 0.4 → 1.6g/kg 1.0 에서 정체(Morton 2018). */
export function proteinFactor(gPerKg: number): number {
  return clamp(0.4 + 0.75 * (gPerKg - 0.8), 0.4, 1);
}

/**
 * 칼로리 계수(제한 없음 — 음수면 근육이 빠지는 쪽). balance = 섭취 − 소비.
 * 화면·저장에는 `energyFactor`(0 이상)를 쓴다.
 */
export function energyFactorRaw(balance: number | null, exp: Experience): number {
  if (balance === null) return 0.85; // 식단 다짐이 없으면 유지로 본다
  if (balance >= 250) return 1;
  if (balance >= 0) return 0.85;
  const d = -balance;
  let e = 0.85 - (0.65 * d) / 750;
  if (exp === "beginner" && d <= 750) e += 0.15; // 리컴포지션
  return Math.min(0.85, e);
}

export function energyFactor(balance: number | null, exp: Experience): number {
  return Math.max(0, energyFactorRaw(balance, exp));
}

export function ageFactor(age: number): number {
  if (age < 40) return 1;
  if (age < 50) return 0.9;
  if (age < 60) return 0.8;
  return 0.7;
}

/** FFMI 상한까지 남은 여지. */
export function ffmiFactor(ffmKg: number, heightCm: number | null, gender: BodyInput["gender"]): number {
  if (!heightCm) return 1;
  const ffmi = ffmKg / (heightCm / 100) ** 2;
  const { max, ref } = FFMI[gender];
  return clamp((max - ffmi) / (max - ref), 0.1, 1);
}

/** 부위 비중 — "any" 가 있으면 전신(1). */
export function partShare(p: PledgeSpec): number {
  const list = p.strength ?? [];
  if (list.some((s) => s.part === "any")) return 1;
  return Math.min(1, list.reduce((s, x) => s + PART_SHARE[x.part as BodyPart], 0));
}

function intakeOf(p: PledgeSpec): number | null {
  return p.intakeMax ?? p.intakeMin ?? null;
}

export type Prediction = {
  formulaVersion: string;
  days: number;
  /** 체중 예상(kg, 감량은 음수). 식단 kcal 다짐이 없으면 null. */
  weightKg: number | null;
  weightRange: [number, number] | null;
  fatKg: number | null;
  /** 제지방 변화(글리코겐·수분 제외). */
  leanKg: number | null;
  /** 글리코겐 + 수분(첫 주 급감분). */
  waterKg: number | null;
  /** InBody 골격근 기준 증가. 근력+단백질 다짐이 있을 때만. */
  muscleKg: number | null;
  muscleRange: [number, number] | null;
  parts: BodyPart[];
  /** 부위별(InBody 팔·몸통·다리) 현재 근육량과 예상 증가. */
  segments: ReturnType<typeof segmentForecast>;
  hints: string[];
  /** 계산에 쓴 계수 — 결과 테이블에 같이 저장(나중에 AI 학습 피처). */
  factors: {
    r: number;
    S: number;
    P: number;
    E: number;
    A: number;
    X: number;
    Q: number;
    K: number;
  } | null;
  calibrated: boolean;
  baseline: {
    weightKg: number;
    bodyFatPct: number;
    bodyFatMeasured: boolean;
    /** 지금 골격근(InBody·직접 입력). */
    skeletalMuscleKg: number | null;
    /** 골격근 ÷ 제지방(내 값 또는 0.55). */
    smmShare: number;
    metabolicFactor: number | null;
    bmr: number;
    maintenanceKcal: number;
    dailyBalanceKcal: number | null;
  };
};

type SimOut = {
  weight: number;
  fat: number;
  lean: number;
  water: number;
  leanGainTraining: number;
  sigmaKcal: number;
  factors0: Prediction["factors"];
};

/** 하루씩 굴린다. 체중 예상이 불가능하면(섭취 없음) 근육만 굴린다. */
function simulate(p: PledgeSpec, b: BodyInput, days: number): SimOut {
  const bf0 = estimateBodyFatPct(b);
  let fm = (b.weightKg * bf0) / 100;
  let ffm = b.weightKg - fm;
  const bmr0 = bmrOf(b, b.weightKg, ffm);
  const intake = intakeOf(p);
  const ex0 = exercisePerDay(p, b.weightKg);
  // 시작 유지칼로리 = 그 섭취에서 균형이 맞는 값(TEF 는 유지 섭취 기준).
  const maint0 = (bmr0 * (1 + NEAT_SHARE) + ex0) / (1 - TEF_SHARE);
  const training = hasStrength(p) && p.proteinG !== undefined;
  const Q = partShare(p);
  const A = ageFactor(b.age);
  const X = b.gender === "female" ? 0.7 : 1;
  const S = sessionFactor(strengthSessions(p));

  let glycogenLeft = GLYCOGEN_POOL[b.gender];
  let water = 0;
  let at = 0;
  let leanGainTraining = 0;
  let sigmaKcal = 0;
  let exp = b.experience;
  let factors0: Prediction["factors"] = null;

  for (let d = 0; d < days; d++) {
    if (d > 0 && d % 365 === 0) exp = NEXT_EXP[exp];
    const w = fm + ffm;
    const scale = w / b.weightKg;
    const bmr = bmrOf(b, w, ffm);
    const ex = ex0 * scale;
    let balance: number | null = null;
    if (intake !== null) {
      const atTarget = AT_BETA * (intake - maint0);
      at += (atTarget - at) / AT_TAU_DAYS;
      const out = bmr + bmr0 * NEAT_SHARE * scale + intake * TEF_SHARE + ex + at;
      balance = intake - out;
      sigmaKcal += 0.08 * out;
    }

    let dLean = 0;
    if (training) {
      const Eraw = energyFactorRaw(balance, exp);
      const K = ffmiFactor(ffm, b.heightCm, b.gender);
      const P = proteinFactor(p.proteinG! / w);
      const base = w * R_EXP[exp] * S * P * A * X * Q * K;
      if (d === 0) factors0 = { r: R_EXP[exp], S, P, E: Math.max(0, Eraw), A, X, Q, K };
      if (Eraw >= 0) {
        dLean = (base * Eraw) / 30;
        leanGainTraining += dLean;
      } else if (balance !== null) {
        // 적자가 너무 크면 근력운동을 해도 빠진다 — Forbes 손실의 40%.
        const pl = 10.4 / (10.4 + Math.max(fm, 1));
        dLean = ((pl * balance) / (pl * KCAL_PER_KG_LEAN + (1 - pl) * KCAL_PER_KG_FAT)) * 0.4;
      }
    }
    if (balance === null) {
      ffm += dLean;
      continue;
    }

    let rest = balance;
    // 첫 며칠 글리코겐 — 섭취가 유지의 85% 미만일 때.
    if (rest < 0 && glycogenLeft > 0 && intake! < maint0 * 0.85) {
      const use = Math.min(glycogenLeft, 0.05, -rest / KCAL_PER_KG_GLYCOGEN);
      glycogenLeft -= use;
      water -= use * (1 + GLYCOGEN_WATER);
      rest += use * KCAL_PER_KG_GLYCOGEN;
    }
    if (training) {
      ffm += dLean;
      fm += (rest - KCAL_PER_KG_LEAN * dLean) / KCAL_PER_KG_FAT;
    } else {
      const pl = 10.4 / (10.4 + Math.max(fm, 1));
      const dm = rest / (pl * KCAL_PER_KG_LEAN + (1 - pl) * KCAL_PER_KG_FAT);
      ffm += pl * dm;
      fm += (1 - pl) * dm;
    }
    fm = Math.max(fm, 1);
  }
  const fm0 = (b.weightKg * bf0) / 100;
  const ffm0 = b.weightKg - fm0;
  return {
    weight: fm + ffm + water - b.weightKg,
    fat: fm - fm0,
    lean: ffm - ffm0,
    water,
    leanGainTraining,
    sigmaKcal,
    factors0,
  };
}

/**
 * 다짐 → 예상 결과.
 * `calibration` 은 같은 사용자의 지난 다짐 실측 ÷ 예측(있을 때만).
 */
export function predictPledge(
  p: PledgeSpec,
  b: BodyInput,
  opts: { calibration?: Calibration | null } = {},
): Prediction {
  const bf0 = estimateBodyFatPct(b);
  const ffm0 = b.weightKg * (1 - bf0 / 100);
  const bmr0 = bmrOf(b, b.weightKg, ffm0);
  const intake = intakeOf(p);
  const training = hasStrength(p) && p.proteinG !== undefined;
  const hints: string[] = [];
  if (intake === null) hints.push("식단 칼로리 다짐을 추가하면 체중 예상을 볼 수 있어요.");
  if (!training) {
    hints.push(
      hasStrength(p)
        ? "단백질 다짐을 추가하면 근육 예상을 볼 수 있어요."
        : "근력운동과 단백질 다짐을 추가하면 근육 예상을 볼 수 있어요.",
    );
  }

  const sim = simulate(p, b, p.days);
  const kW = opts.calibration?.weight ?? 1;
  const kM = opts.calibration?.muscle ?? 1;
  const calibrated = !!opts.calibration && (opts.calibration.weight !== null || opts.calibration.muscle !== null);

  const weight = intake === null ? null : sim.weight * kW;
  const rho = 7000; // 범위 계산용 평균 에너지 밀도
  const spread = intake === null ? 0 : sim.sigmaKcal / rho + 0.5;
  const muscle = training ? Math.max(0, sim.leanGainTraining + Math.min(0, sim.lean)) * smmShareOf(b) * kM : null;
  const ex0 = exercisePerDay(p, b.weightKg);
  const maintenance = (bmr0 * (1 + NEAT_SHARE) + ex0) / (1 - TEF_SHARE);

  return {
    formulaVersion: FORMULA_VERSION,
    days: p.days,
    weightKg: weight === null ? null : r1(weight),
    weightRange: weight === null ? null : [r1(weight - spread), r1(weight + spread)],
    fatKg: intake === null ? null : r1(sim.fat * kW),
    leanKg: intake === null ? (training ? r1(sim.leanGainTraining) : null) : r1(sim.lean),
    waterKg: intake === null ? null : r1(sim.water),
    muscleKg: muscle === null ? null : r2(muscle),
    muscleRange: muscle === null ? null : [r2(muscle * 0.65), r2(muscle * 1.35)],
    parts: (p.strength ?? []).map((s) => s.part).filter((x): x is BodyPart => x !== "any"),
    segments: muscle === null ? [] : segmentForecast(b, p, muscle),
    hints,
    factors: sim.factors0,
    calibrated,
    baseline: {
      weightKg: b.weightKg,
      bodyFatPct: r1(bf0),
      bodyFatMeasured: bodyFatMeasured(b),
      skeletalMuscleKg: b.inbody?.skeletalMuscleKg ?? null,
      smmShare: Math.round(smmShareOf(b) * 100) / 100,
      metabolicFactor: b.metabolicFactor ?? null,
      bmr: Math.round(bmr0),
      maintenanceKcal: Math.round(maintenance),
      dailyBalanceKcal: intake === null ? null : Math.round(intake - maintenance),
    },
  };
}

/**
 * 개인 보정 계수 — 지난 다짐들의 실측 ÷ 예측 중앙값(0.5~1.5).
 * 예측이 너무 작으면(|0.3kg| 미만) 비율이 튀므로 뺀다.
 */
export function calibrationFrom(
  rows: { predicted: number | null; actual: number | null; kind: "weight" | "muscle" }[],
): Calibration {
  const ratio = (kind: "weight" | "muscle") => {
    const xs = rows
      .filter((r) => r.kind === kind && r.predicted !== null && r.actual !== null && Math.abs(r.predicted) >= 0.3)
      .map((r) => r.actual! / r.predicted!)
      .filter((x) => Number.isFinite(x))
      .sort((a, b) => a - b);
    if (xs.length === 0) return { k: null, n: 0 };
    const mid = xs[Math.floor(xs.length / 2)];
    return { k: clamp(mid, 0.5, 1.5), n: xs.length };
  };
  const w = ratio("weight");
  const m = ratio("muscle");
  return { weight: w.k, muscle: m.k, samples: w.n + m.n };
}

/* ── 역산(990원 라이트) — 결과 목표 → 행동 다짐 ─────────────────────────── */

export type GoalInput =
  | { type: "lose_weight"; kg: number }
  | { type: "gain_muscle"; kg: number }
  | { type: "grow_part"; part: BodyPart };

export type GoalPlan = {
  /** 첫 단계 다짐(최대 30일). */
  pledge: PledgeSpec;
  /** 목표까지 예상 총 기간(일). 도달 못 하면 null. */
  totalDays: number | null;
  /** 30일 단위 단계 수. */
  stages: number;
  notes: string[];
  error?: string;
};

const round = (v: number, unit: number) => Math.round(v / unit) * unit;
export const STAGE_DAYS = 30;
const MAX_PLAN_DAYS = 730;

/** 근육을 지키며 뺄 수 있는 최대 체중 — 체지방률 하한(남 10%·여 18%)까지. */
export function maxHealthyLossKg(b: BodyInput): number {
  const fm = (b.weightKg * estimateBodyFatPct(b)) / 100;
  const floor = BODY_FAT_FLOOR[b.gender] / 100;
  return Math.max(0, (fm - floor * b.weightKg) / (1 - floor));
}

/** 목표 → 다짐. 안전 기준(주 체중 1% 감량, 식단 하한, 체지방 하한)을 넘지 않는다. */
export function planForGoal(goal: GoalInput, b: BodyInput): GoalPlan {
  const bf = estimateBodyFatPct(b);
  const ffm = b.weightKg * (1 - bf / 100);
  const bmr = bmrOf(b, b.weightKg, ffm);
  const sedentary = (bmr * (1 + NEAT_SHARE)) / (1 - TEF_SHARE);
  const protein = round(b.weightKg * PROTEIN_RECOMMEND_PER_KG, 5);
  const floor = INTAKE_WARN_FLOOR[b.gender];
  const notes: string[] = [];
  const fail = (error: string): GoalPlan => ({ pledge: { days: STAGE_DAYS }, totalDays: null, stages: 0, notes, error });

  if (goal.type === "lose_weight") {
    const max = maxHealthyLossKg(b);
    if (!(goal.kg > 0)) return fail("목표 감량을 입력해 주세요.");
    if (goal.kg > max) {
      return fail(
        `지금 체지방(약 ${r1(bf)}%)으로는 근육을 지키며 최대 약 ${r1(max)}kg 까지가 현실적이에요.`,
      );
    }
    // 주 1% 감량 속도(7,700 은 속도 목표를 kcal 로 바꾸는 데만 쓴다).
    const daily = Math.min(1000, (b.weightKg * 0.01 * 7700) / 7);
    const dietDeficit = Math.min(500, daily);
    const intakeMax = Math.max(floor, round(sedentary - dietDeficit, 50));
    const rest = Math.max(0, daily - (sedentary - intakeMax));
    const workoutDays = b.experience === "beginner" ? 4 : 5;
    const burnKcal = clamp(round((rest * 7) / workoutDays / NET_EXERCISE, 10), 200, 800);
    const base: Omit<PledgeSpec, "days"> = {
      workoutDays,
      burnKcal,
      intakeMax,
      mealsPerDay: 3,
      proteinG: protein,
      strength: [{ part: "any", perWeek: 2 }],
    };
    const totalDays = daysToReach((days) => -(simulate({ ...base, days }, b, days).weight), goal.kg);
    notes.push(
      `주 체중 1%(${r1(b.weightKg * 0.01)}kg) 속도로 잡았어요`,
      `식단 ${intakeMax.toLocaleString()}kcal 이하 · 운동일 ${burnKcal}kcal 소모`,
      "근손실을 막으려고 근력 주 2회 + 단백질을 같이 넣었어요",
      "빠질수록 대사가 줄어 뒤로 갈수록 느려져요 — 단계마다 다시 계산해요",
    );
    return finish(base, totalDays, notes);
  }

  if (goal.type === "gain_muscle") {
    if (!(goal.kg > 0) || goal.kg > 10) return fail("목표 근육량(골격근)은 10kg 이내로 정해 주세요.");
    const sessions = 4;
    const intakeMin = round(sedentary + ((sessions * STRENGTH_SESSION_KCAL) / 7) * NET_EXERCISE + 300, 50);
    const base: Omit<PledgeSpec, "days"> = {
      intakeMin,
      mealsPerDay: 3,
      proteinG: protein,
      strength: [{ part: "any", perWeek: sessions }],
    };
    const totalDays = daysToReach(
      (days) => simulate({ ...base, days }, b, days).leanGainTraining * smmShareOf(b),
      goal.kg,
    );
    if (totalDays === null) {
      return fail("2년 안에 닿기 어려운 목표예요. 목표를 조금 낮춰 주세요.");
    }
    notes.push(
      `근력 주 ${sessions}회 · 단백질 ${protein}g(체중 × 1.6)`,
      `근성장을 위해 하루 ${intakeMin.toLocaleString()}kcal 이상(유지 + 300kcal)`,
      "근육량은 InBody 골격근 기준 · 1년이 지나면 성장이 느려져요",
    );
    return finish(base, totalDays, notes);
  }

  // grow_part — 한 부위 집중: 그 부위 주 2회 + 전신 주 2회.
  const intakeMin = round(sedentary + 200, 50);
  const base: Omit<PledgeSpec, "days"> = {
    intakeMin,
    mealsPerDay: 3,
    proteinG: protein,
    strength: [
      { part: goal.part, perWeek: 2 },
      { part: "any", perWeek: 2 },
    ],
  };
  notes.push(
    "그 부위 주 2회가 주 1회보다 근성장이 커요",
    `단백질 ${protein}g · 하루 ${intakeMin.toLocaleString()}kcal 이상`,
  );
  return finish(base, STAGE_DAYS, notes);
}

function finish(base: Omit<PledgeSpec, "days">, totalDays: number | null, notes: string[]): GoalPlan {
  const days = Math.min(STAGE_DAYS, totalDays ?? STAGE_DAYS);
  return {
    pledge: { ...base, days: Math.max(7, days) },
    totalDays,
    stages: totalDays === null ? 0 : Math.ceil(totalDays / STAGE_DAYS),
    notes,
  };
}

/** 단조 증가하는 f(days) 가 target 에 닿는 최소 일수(이분 탐색). 못 닿으면 null. */
function daysToReach(f: (days: number) => number, target: number): number | null {
  if (f(MAX_PLAN_DAYS) < target) return null;
  let lo = 1;
  let hi = MAX_PLAN_DAYS;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (f(mid) >= target) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
