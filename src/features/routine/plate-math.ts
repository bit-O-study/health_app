/**
 * 원판(플레이트) 계산 — "60kg면 봉 양쪽에 뭘 끼워야 하나".
 *
 * 앱은 무게를 **총중량(kg)** 으로 기록하는데, 랙 앞에서 실제로 하는 일은
 * "한쪽에 몇 킬로 원판 몇 장"이다. 그 환산을 매번 암산하게 두지 않는다.
 *
 * server-only 의존성 없는 순수 함수 — 에디터(클라)와 운동모드(클라) 양쪽에서 쓴다.
 * 부동소수 오차(2.5 · 1.25)가 나지 않도록 내부 계산은 전부 **100배 정수**로 한다.
 */

/**
 * 국내 헬스장 표준 원판(kg), 큰 것부터.
 *
 * 🔴 **25kg 를 일부러 뺐다.** 국내 헬스장에 흔치 않기도 하고, 넣으면 그리디가
 * 한쪽 40kg 를 `25+15` 로 낸다 — 장수는 같지만 실제로 사람이 끼우는 건 `20+20` 이다.
 * 25kg 가 있는 곳은 `platesPerSide(..., PLATE_KG_WITH_25)` 로 넘기면 된다.
 */
export const PLATE_KG = [20, 15, 10, 5, 2.5, 1.25] as const;

/** 25kg 원판이 있는 헬스장용. */
export const PLATE_KG_WITH_25 = [25, ...PLATE_KG] as const;

/** 봉 무게 선택지(kg). 0 = "봉 무게는 빼고 원판만" (스미스처럼 봉 무게를 모르는 경우). */
export const BAR_KG_OPTIONS = [20, 15, 10, 0] as const;
export type BarKg = (typeof BAR_KG_OPTIONS)[number];

export function isBarKg(v: unknown): v is BarKg {
  return typeof v === "number" && (BAR_KG_OPTIONS as readonly number[]).includes(v);
}

/**
 * 원판을 꽂는 기구인가.
 *
 * 덤벨·머신·케이블은 제외한다 — 핀을 꽂거나 통짜라 "한쪽에 몇 장"이 성립하지 않는다.
 * 랜드마인은 바벨 한쪽 끝을 바닥에 고정하는 것이라 원판 계산이 그대로 통한다.
 */
export function usesPlates(equipment?: string | null): boolean {
  return equipment === "barbell" || equipment === "smith" || equipment === "landmine";
}

/**
 * 기구별 기본 봉 무게(kg).
 *
 * 스미스는 **0** 이다 — 카운터밸런스 여부에 따라 기계마다 7~20kg 로 제각각이라
 * 하나를 찍으면 그냥 틀린 값을 보여주게 된다. 대신 사용자가 바꿀 수 있게 둔다.
 */
export function defaultBarKg(equipment?: string | null): BarKg {
  return equipment === "smith" ? 0 : 20;
}

export type PlateBreakdown = {
  /** 한쪽에 끼울 원판(kg), 큰 것부터. */
  perSide: number[];
  /** 원판으로 못 맞추고 남은 한쪽 무게(kg). 0 이면 딱 맞음. */
  leftoverKg: number;
  /** 총중량이 봉보다 가벼워 원판을 끼울 수 없음. */
  belowBar: boolean;
};

/**
 * 총중량 → 한쪽 원판 구성. 큰 원판부터 채우는 그리디.
 *
 * 표준 원판 집합에서는 그리디가 최소 장수와 어긋나지 않는다(25/20/15/10/5/2.5/1.25).
 * 원판 재고는 무제한으로 본다 — 헬스장마다 다르고, 모르면서 "없다"고 하는 게 더 나쁘다.
 */
export function platesPerSide(
  totalKg: number | null,
  barKg: number,
  plates: readonly number[] = PLATE_KG,
): PlateBreakdown | null {
  if (totalKg === null || !Number.isFinite(totalKg) || totalKg <= 0) return null;
  if (!Number.isFinite(barKg) || barKg < 0) return null;

  const total = Math.round(totalKg * 100);
  const bar = Math.round(barKg * 100);
  if (total < bar) return { perSide: [], leftoverKg: 0, belowBar: true };

  // 한쪽 = (총중량 - 봉) / 2. 홀수 1kg 처럼 2로 안 나뉘면 나머지는 leftover 로 남는다.
  const bothSides = total - bar;
  let side = Math.floor(bothSides / 2);
  const oddRemainder = bothSides - side * 2;

  const perSide: number[] = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    const unit = Math.round(p * 100);
    if (unit <= 0) continue;
    while (side >= unit) {
      side -= unit;
      perSide.push(p);
    }
  }

  return {
    perSide,
    leftoverKg: (side * 2 + oddRemainder) / 100,
    belowBar: false,
  };
}

/** "20 + 5 + 1.25" — 같은 원판이 여러 장이면 "20×2" 로 묶는다. */
export function formatPerSide(perSide: number[]): string {
  if (perSide.length === 0) return "없음";
  // 그리디 결과는 내림차순이라 같은 원판은 항상 붙어 있다 — 연속 구간만 세면 된다.
  const out: string[] = [];
  let i = 0;
  while (i < perSide.length) {
    let n = 1;
    while (i + n < perSide.length && perSide[i + n] === perSide[i]) n += 1;
    out.push(n > 1 ? `${perSide[i]}×${n}` : `${perSide[i]}`);
    i += n;
  }
  return out.join(" + ");
}

/** 원판 총 장수(양쪽 합). */
export function totalPlateCount(perSide: number[]): number {
  return perSide.length * 2;
}
