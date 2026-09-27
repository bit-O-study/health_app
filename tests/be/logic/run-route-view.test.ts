import { describe, expect, it } from "vitest";

import { cleanRunRoute, runRouteSvg, runSplits } from "@/features/running/run-route-view";
import type { RunRoutePoint } from "@/features/running/run-session";

const M_PER_DEG_LAT = 111_194.9; // haversine 기준 위도 1도(m)
const T0 = 1_790_000_000_000;

/** 북쪽으로 100m 마다 한 점, 한 점에 secPer100 초. */
function straight(totalM: number, secPer100: number, extra: Partial<RunRoutePoint> = {}): RunRoutePoint[] {
  const pts: RunRoutePoint[] = [];
  for (let m = 0; m <= totalM; m += 100) {
    pts.push({ lat: 37.5 + m / M_PER_DEG_LAT, lng: 127.0, timestamp: T0 + (m / 100) * secPer100 * 1000, ...extra });
  }
  return pts;
}

describe("cleanRunRoute", () => {
  it("정확도 나쁜 점과 순간 이동 점을 버리고 시간순으로", () => {
    const base = straight(300, 30);
    const jump = { lat: 38.5, lng: 127.0, timestamp: T0 + 45_000 }; // 110km 순간 이동
    const blurry = { ...base[2], timestamp: T0 + 50_000, accuracyM: 80 };
    const cleaned = cleanRunRoute([base[3], jump, base[0], blurry, base[1], base[2]]);
    expect(cleaned.map((p) => p.timestamp)).toEqual(base.map((p) => p.timestamp));
  });
});

describe("runSplits", () => {
  it("5'00\" 페이스 2.5km → 1km 두 구간 + 0.5km 자투리", () => {
    expect(runSplits(straight(2500, 30))).toEqual([
      { distanceM: 1000, sec: 300, paceSecPerKm: 300 },
      { distanceM: 1000, sec: 300, paceSecPerKm: 300 },
      { distanceM: 500, sec: 150, paceSecPerKm: 300 },
    ]);
  });
  it("구간마다 속도가 다르면 페이스도 다르다", () => {
    const fast = straight(1000, 27); // 4'30"
    const slowStart = fast[fast.length - 1];
    const slow = straight(1000, 36).slice(1).map((p) => ({
      ...p,
      lat: p.lat + (slowStart.lat - 37.5),
      timestamp: p.timestamp - T0 + slowStart.timestamp,
    }));
    expect(runSplits([...fast, ...slow]).map((s) => s.paceSecPerKm)).toEqual([270, 360]);
  });
  it("100m 미만 자투리는 버리고, 경로가 없으면 빈 배열(실내)", () => {
    expect(runSplits(straight(1050, 30)).length).toBe(1);
    expect(runSplits([])).toEqual([]);
    expect(runSplits(straight(0, 30))).toEqual([]);
  });
});

describe("runRouteSvg", () => {
  it("여백 안에 비율을 지켜 그리고 시작·끝 점을 준다", () => {
    const drawing = runRouteSvg(straight(1000, 30), 320, 200, 16)!;
    expect(drawing.d.startsWith("M")).toBe(true);
    // 북쪽으로 곧게 — 가운데 세로선, 시작은 아래(남) 끝은 위(북)
    expect(drawing.start.x).toBeCloseTo(160, 0);
    expect(drawing.end.x).toBeCloseTo(160, 0);
    expect(drawing.start.y).toBeCloseTo(184, 0);
    expect(drawing.end.y).toBeCloseTo(16, 0);
  });
  it("점이 2개 미만이면 null", () => {
    expect(runRouteSvg([])).toBeNull();
    expect(runRouteSvg(straight(0, 30))).toBeNull();
  });
});
