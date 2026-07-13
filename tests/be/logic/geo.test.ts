import { describe, expect, it } from "vitest";

import {
  addPoint,
  avgPaceSecPerKm,
  emptyTrack,
  formatDistanceKm,
  formatDuration,
  formatPace,
  haversineMeters,
  runIntensityFromSpeed,
  speedKmh,
  type GeoPoint,
} from "@/features/running/geo";

const pt = (lat: number, lng: number, t: number, acc?: number): GeoPoint => ({
  lat,
  lng,
  t,
  acc,
});

describe("haversineMeters", () => {
  it("같은 점은 0", () => {
    expect(haversineMeters(pt(37.5, 127, 0), pt(37.5, 127, 0))).toBe(0);
  });
  it("위도 0.001도 ≈ 111m", () => {
    const d = haversineMeters(pt(37.5, 127, 0), pt(37.501, 127, 0));
    expect(d).toBeGreaterThan(108);
    expect(d).toBeLessThan(114);
  });
});

describe("addPoint — 누적 거리 + 노이즈 필터", () => {
  it("첫 표본은 거리 0, 기준점 설정", () => {
    const r = addPoint(emptyTrack(), pt(37.5, 127, 0));
    expect(r.addedM).toBe(0);
    expect(r.track.totalMeters).toBe(0);
    expect(r.track.lastMovingPoint).not.toBeNull();
  });

  it("정상 이동은 누적된다", () => {
    let t = emptyTrack();
    t = addPoint(t, pt(37.5, 127, 0)).track;
    const r = addPoint(t, pt(37.501, 127, 5000)); // ~111m in 5s (~22 m/s? too fast)
    // 111m/5s = 22.2 m/s > MAX_SPEED_MPS(12) → 점프로 무시.
    expect(r.addedM).toBe(0);
  });

  it("현실적 속도 이동은 누적, 순간속도 계산", () => {
    let t = emptyTrack();
    t = addPoint(t, pt(37.5, 127, 0)).track;
    // 위도 0.00005도 ≈ 5.55m, 3초 → ~1.85 m/s (조깅)
    const r = addPoint(t, pt(37.50005, 127, 3000));
    expect(r.addedM).toBeGreaterThan(4);
    expect(r.addedM).toBeLessThan(7);
    expect(r.instMps).toBeGreaterThan(1);
    expect(r.instMps).toBeLessThan(3);
    expect(r.track.totalMeters).toBeGreaterThan(4);
  });

  it("정확도 나쁜 표본(acc>30)은 버린다", () => {
    let t = emptyTrack();
    t = addPoint(t, pt(37.5, 127, 0)).track;
    const r = addPoint(t, pt(37.50005, 127, 3000, 99));
    expect(r.addedM).toBe(0);
    expect(r.track.totalMeters).toBe(0);
  });

  it("지터(너무 짧은 이동)는 무시", () => {
    let t = emptyTrack();
    t = addPoint(t, pt(37.5, 127, 0)).track;
    // 위도 0.000005도 ≈ 0.55m < MIN_SEG_M(1.5)
    const r = addPoint(t, pt(37.500005, 127, 2000));
    expect(r.addedM).toBe(0);
  });
});

describe("파생 지표·포맷", () => {
  it("speedKmh", () => {
    expect(speedKmh(0)).toBe(0);
    expect(speedKmh(2.7778)).toBeCloseTo(10, 1);
  });
  it("avgPaceSecPerKm", () => {
    expect(avgPaceSecPerKm(0, 100)).toBeNull();
    // 1000m 를 300초 → 300초/km
    expect(avgPaceSecPerKm(1000, 300)).toBeCloseTo(300, 5);
  });
  it("formatPace", () => {
    expect(formatPace(330)).toBe("5'30\"");
    expect(formatPace(null)).toBe("--'--\"");
    expect(formatPace(0)).toBe("--'--\"");
  });
  it("formatDistanceKm", () => {
    expect(formatDistanceKm(1234)).toBe("1.23");
  });
  it("formatDuration", () => {
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(3665)).toBe("1:01:05");
  });
  it("runIntensityFromSpeed — 걷기~달리기 0..1", () => {
    expect(runIntensityFromSpeed(0)).toBe(0);
    expect(runIntensityFromSpeed(3)).toBe(0);
    expect(runIntensityFromSpeed(16)).toBeCloseTo(1, 1);
    expect(runIntensityFromSpeed(9)).toBeGreaterThan(0.4);
    expect(runIntensityFromSpeed(9)).toBeLessThan(0.6);
  });
});
