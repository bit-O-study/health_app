/**
 * 카메라 없이 '제자리 달리기'를 폰 가속도계로 감지. 순수 함수(테스트 가능).
 * 클라이언트가 DeviceMotion 의 가속도 크기 표본을 모아 넘기면, 흔들림 세기로
 * 0..1 달리기 강도를 돌려준다. 캐릭터는 이 값이 클 때만 앞으로 나아간다.
 */

import { clamp01 } from "@/features/running/controls";

/** 가속도 3축 → 크기(중력 포함 시 정지값 ≈ 9.8). */
export function accelMagnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

const STILL_STD = 1.2; // 이하면 가만히 있는 것으로 보고 0
const RUN_STD_RANGE = 6.0; // 이만큼 더 흔들리면 강도 1

/**
 * 최근 가속도 크기 표본들의 표준편차로 달리기 강도(0..1).
 * 가만히 ≈ 0, 걷기 ≈ 0.2~0.4, 뛰기 ≈ 0.7~1. 표본이 모자라면 0.
 */
export function runIntensityFromAccel(magnitudes: number[]): number {
  if (magnitudes.length < 6) return 0;
  const mean =
    magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  const variance =
    magnitudes.reduce((a, b) => a + (b - mean) ** 2, 0) / magnitudes.length;
  const std = Math.sqrt(variance);
  return clamp01((std - STILL_STD) / RUN_STD_RANGE);
}

export const MOTION_TUNING = { STILL_STD, RUN_STD_RANGE };
