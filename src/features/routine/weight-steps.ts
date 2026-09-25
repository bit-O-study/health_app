/**
 * 종목별 증량 단위(kg) — 순수 로직.
 *
 * 기본 단위는 기구와 종목 크기로 정한다(`weightStepKg`). 그런데 같은 '머신' 이라도
 * 1kg 씩 올라가는 기구가 있고, 바벨도 헬스장에 1.25kg 원판이 없으면 5kg 씩만
 * 올릴 수 있다. 그래서 **사용자가 종목별로 덮어쓸 수 있게** 하고, 그 값이 기본을 이긴다.
 *
 * `profiles.weight_steps` jsonb 에 `{"pec-deck": 1}` 로 저장한다.
 * DB·외부 입력은 믿지 않고 여기서 한 번 걸러 쓴다.
 */

/** 고를 수 있는 단위(kg) — 실제 헬스장에서 나오는 값들. */
export const WEIGHT_STEP_CHOICES = [1, 1.25, 2, 2.5, 5, 10] as const;

/** 허용 범위 — 이 밖의 값은 저장하지 않는다. */
export const MIN_STEP_KG = 0.5;
export const MAX_STEP_KG = 25;

/** 종목 ID 로 인정할 길이(카탈로그 ID 는 이보다 훨씬 짧다). */
const MAX_ID_LEN = 64;

/** 단위 하나가 저장할 만한 값인지. */
export function isValidStepKg(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= MIN_STEP_KG &&
    value <= MAX_STEP_KG
  );
}

/**
 * jsonb → 종목별 단위 맵. 형식이 틀린 항목은 **그 항목만** 버린다
 * (하나가 이상하다고 나머지 설정까지 날리면 사용자가 영문을 모른다).
 */
export function parseWeightSteps(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!key || key.length > MAX_ID_LEN) continue;
    const num = typeof raw === "string" ? Number(raw) : raw;
    if (isValidStepKg(num)) out[key] = num;
  }
  return out;
}

/**
 * 저장할 다음 맵을 만든다. `stepKg === null` 이면 그 종목의 설정을 지운다(기본값으로 복귀).
 * 잘못된 값이면 **바꾸지 않고 그대로** 돌려준다 — 조용히 이상한 값을 넣지 않는다.
 */
export function withWeightStep(
  current: Record<string, number>,
  exerciseId: string,
  stepKg: number | null,
): Record<string, number> {
  if (!exerciseId || exerciseId.length > MAX_ID_LEN) return current;
  const next = { ...current };
  if (stepKg === null) {
    delete next[exerciseId];
    return next;
  }
  if (!isValidStepKg(stepKg)) return current;
  next[exerciseId] = stepKg;
  return next;
}

/** 이 종목에 사용자가 정해 둔 단위. 없으면 null(기본 규칙을 쓴다). */
export function stepOverrideFor(
  steps: Record<string, number> | null | undefined,
  exerciseId: string,
): number | null {
  const value = steps?.[exerciseId];
  return isValidStepKg(value) ? value : null;
}
