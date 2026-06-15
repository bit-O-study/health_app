/**
 * 런닝 모드 조작 매핑 — 머리 자세(yaw/pitch) → 게임 조작. 순수 함수(테스트 가능).
 * 카메라/ML 은 클라이언트가 처리하고, 여기서는 각도·표본만 받아 조작으로 바꾼다.
 */

export type Lane = -1 | 0 | 1;

/**
 * 머리 좌우 회전(yaw, deg; 오른쪽 보면 +)이 임계를 넘으면 그쪽 레인.
 * 가운데로 돌아오면 0. (보정된 yaw = 측정값 - 정면 기준값)
 */
export function laneFromYaw(yawDeg: number, threshold = 12): Lane {
  if (yawDeg >= threshold) return 1; // 오른쪽
  if (yawDeg <= -threshold) return -1; // 왼쪽
  return 0;
}

/** 위를 보면(pitch up, deg; 위 +) 점프 신호. (에지 판정=직전 false→true 는 호출부) */
export function isLookingUp(pitchDeg: number, threshold = 12): boolean {
  return pitchDeg >= threshold;
}

/**
 * 머리 수직 흔들림(제자리 달리기)에서 달리기 강도 0..1.
 * recent: 최근 머리 y(화면 비율 0..1) 표본들. 표준편차가 클수록(많이 위아래로
 * 흔들수록=빨리 달릴수록) 강도가 올라간다. 가만히 있으면 0.
 */
export function runIntensityFromBounce(samples: number[]): number {
  if (samples.length < 4) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance =
    samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
  const std = Math.sqrt(variance);
  // 가만히 ≈ 0.004 이하, 달리기 ≈ 0.026 이상 → 0..1 로 매핑.
  return clamp01((std - 0.004) / 0.022);
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
