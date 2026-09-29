import { describe, expect, it } from "vitest";

import { reanchorTrack, recentPaceSecPerKm, addPoint, emptyTrack, type GeoPoint } from "@/features/running/geo";
import { AUTO_PAUSE_MS, activeElapsedMs, gpsSignalLevel, resumedStart, shouldAutoPause } from "@/features/running/run-pause";

const M_PER_DEG_LAT = 111_194.9;
const pt = (m: number, t: number, acc = 5): GeoPoint => ({ lat: 37.5 + m / M_PER_DEG_LAT, lng: 127, t, acc });

describe("일시정지 시간 계산", () => {
  it("멈춘 동안은 달린 시간이 늘지 않고, 다시 시작하면 멈춘 만큼 빠진다", () => {
    const start = 1_000_000;
    // 60초 달리고 멈춤
    const pausedAt = start + 60_000;
    expect(activeElapsedMs(start, pausedAt + 30_000, pausedAt)).toBe(60_000);
    // 30초 멈췄다 다시 시작 → 가상 시작이 30초 밀림
    const next = resumedStart(start, pausedAt, pausedAt + 30_000);
    expect(next).toBe(start + 30_000);
    // 다시 20초 달리면 달린 시간 80초
    expect(activeElapsedMs(next, pausedAt + 50_000, null)).toBe(80_000);
  });

  it("자동 일시정지는 10초 이동 없음, 이미 멈췄거나 한 번도 안 움직였으면 아님", () => {
    expect(shouldAutoPause(20_000, 20_000 - AUTO_PAUSE_MS, null, true)).toBe(true);
    expect(shouldAutoPause(20_000, 20_000 - AUTO_PAUSE_MS + 1, null, true)).toBe(false);
    expect(shouldAutoPause(20_000, 0, 15_000, true)).toBe(false);
    expect(shouldAutoPause(20_000, 0, null, false)).toBe(false);
  });
});

describe("GPS 신호 막대", () => {
  it("정확도·경과로 0–3", () => {
    expect(gpsSignalLevel(5, 1000)).toBe(3);
    expect(gpsSignalLevel(20, 1000)).toBe(2);
    expect(gpsSignalLevel(60, 1000)).toBe(1);
    expect(gpsSignalLevel(5, 6000)).toBe(0);
    expect(gpsSignalLevel(null, null)).toBe(0);
  });
});

describe("다시 시작 기준점", () => {
  it("멈춘 동안 이동한 거리는 더하지 않고 경로는 이어진다", () => {
    let track = addPoint(emptyTrack(), pt(0, 0)).track;
    track = addPoint(track, pt(50, 15_000)).track;
    expect(Math.round(track.totalMeters)).toBe(50);
    // 멈춘 사이 200m 떨어진 곳에서 다시 시작
    track = reanchorTrack(track, pt(250, 120_000));
    expect(Math.round(track.totalMeters)).toBe(50);
    expect(track.points).toHaveLength(3);
    track = addPoint(track, pt(280, 130_000)).track;
    expect(Math.round(track.totalMeters)).toBe(80);
  });
});

describe("지금 페이스(최근 30초)", () => {
  it("최근 구간만 — 처음엔 느렸어도 지금 빠르면 지금 값", () => {
    const points: GeoPoint[] = [];
    // 0–60초: 50m/15초(5'00"/km)
    for (let i = 0; i <= 4; i++) points.push(pt(i * 50, i * 15_000));
    // 60–90초: 50m/10초(3'20"/km)
    for (let i = 1; i <= 3; i++) points.push(pt(200 + i * 50, 60_000 + i * 10_000));
    expect(recentPaceSecPerKm(points, 90_000)).toBeCloseTo(200, 0);
  });
  it("최근 30초 이동이 20m 미만이면 null(서 있음)", () => {
    const points = [pt(0, 0), pt(100, 30_000), pt(105, 60_000), pt(110, 90_000)];
    expect(recentPaceSecPerKm(points, 95_000)).toBeNull();
  });
});
