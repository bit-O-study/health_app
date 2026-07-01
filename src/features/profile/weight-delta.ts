/**
 * 체중 증감 계산(순수). 캘린더 하단에 '직전 대비 ±kg' 표시용.
 * 입력은 시간순(오래된→최신) 체중 배열(null/0 은 무시).
 */
export type WeightDelta = {
  latestKg: number;
  prevKg: number | null;
  deltaKg: number | null; // latest - prev (소수1자리), 직전 기록 없으면 null
};

export function computeWeightDelta(
  weights: (number | null | undefined)[],
): WeightDelta | null {
  const ws = weights.filter(
    (w): w is number => typeof w === "number" && w > 0,
  );
  if (ws.length === 0) return null;
  const latestKg = ws[ws.length - 1];
  const prevKg = ws.length >= 2 ? ws[ws.length - 2] : null;
  const deltaKg =
    prevKg === null ? null : Math.round((latestKg - prevKg) * 10) / 10;
  return { latestKg, prevKg, deltaKg };
}
