/**
 * 하루 권장 섭취 칼로리·탄단지 목표 — 순수 모듈(테스트 가능).
 *
 * Mifflin–St Jeor 로 기초대사량(BMR)을 구하고 활동계수(보통 1.5)를 곱해 TDEE 추정.
 * 나이는 프로필에 없어 30세로 가정. 키·몸무게가 없으면 보수적인 기본 목표를 쓴다.
 * 정밀 영양설계가 아니라 식단 관리의 대략 기준선용.
 */

export type Gender = "male" | "female";

export type MacroTarget = {
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
};

const DEFAULT_AGE = 30;
const ACTIVITY = 1.5; // 가벼운~보통 활동
const FALLBACK_KCAL = 2000;
/** 키·몸무게가 없을 때 쓰는 기본 기초대사량(kcal/일). */
const FALLBACK_BMR = { male: 1700, female: 1400 };

/** 기초대사량(BMR, kcal/일) — Mifflin–St Jeor. 키·몸무게 없으면 성별 기본값. */
export function basalMetabolicRate(profile: {
  gender: Gender;
  weightKg: number | null;
  heightCm: number | null;
}): number {
  const { gender, weightKg, heightCm } = profile;
  if (weightKg && heightCm && weightKg > 0 && heightCm > 0) {
    return Math.round(
      10 * weightKg + 6.25 * heightCm - 5 * DEFAULT_AGE + (gender === "male" ? 5 : -161),
    );
  }
  return FALLBACK_BMR[gender];
}

export function dailyTarget(profile: {
  gender: Gender;
  weightKg: number | null;
  heightCm: number | null;
}): MacroTarget {
  const { gender, weightKg, heightCm } = profile;

  let kcal: number;
  if (weightKg && heightCm && weightKg > 0 && heightCm > 0) {
    kcal = Math.round((basalMetabolicRate(profile) * ACTIVITY) / 10) * 10;
  } else {
    kcal = gender === "female" ? 1800 : FALLBACK_KCAL;
  }

  // 단백질: 체중 1.6g/kg(없으면 kcal의 20%), 지방: kcal의 25%, 탄수: 나머지.
  const protein = weightKg
    ? Math.round(weightKg * 1.6)
    : Math.round((kcal * 0.2) / 4);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  return { kcal, protein, carbs, fat };
}
