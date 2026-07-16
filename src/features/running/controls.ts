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

/**
 * 머리를 좌우로 '기울이기/옮기기'(화면 가로 위치 이동)로 레인 선택.
 * dxNorm = 보정 기준(정면) 대비 코끝의 가로 위치 변화(화면 비율, 대략 -0.3..0.3).
 * 고개를 돌리지 않고 화면을 계속 보면서 몸/머리를 좌우로 살짝 옮기면 되므로,
 * 제자리 달리기 중에도 조작하기 쉽다. (호출부에서 좌우 방향 부호를 맞춘다.)
 */
export function laneFromLean(dxNorm: number, threshold = 0.045): Lane {
  if (dxNorm >= threshold) return 1;
  if (dxNorm <= -threshold) return -1;
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
  // 감도 조정(너무 민감해 작은 흔들림에도 최고속으로 달리던 문제): 바닥값을 올리고 범위를
  // 넓혀, 실제로 제대로 뛰어야 강도가 붙게 한다. 가만히(std≈0) 는 여전히 0.
  //   가만히 ≈ 0.006 이하, 전력 달리기 ≈ 0.026 이상 → 0..1.
  return clamp01((std - 0.006) / 0.02);
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * 실내 러닝에서 '1초 동안 달린 실거리(m)'.
 * 설정 속도(km/h)를 m/s 로 바꾼 뒤 달리기 강도(0..1)를 곱한다.
 * 가만히 있으면(intensity 0) 0. — 화면 HUD·그룹 순위·기록이 모두 이 값을 쓴다
 * (단일 소스). 씬 스크롤 단위와 섞이면 '왼쪽 m ≠ 순위 m' 이 된다.
 */
export function runMetersPerSecond(speedKmh: number, intensity: number): number {
  return (Math.max(0, speedKmh) / 3.6) * clamp01(intensity);
}
