import { describe, expect, it } from "vitest";

import {
  comparePair,
  compOnOrBefore,
  daysBetween,
  DAILY_PHOTO_LIMIT,
  FREE_PHOTO_LIMIT,
  isPose,
  photoDates,
  photoLimitError,
  type BodyPhoto,
} from "@/features/lite/body-photos";

const p = (id: string, takenOn: string, pose: BodyPhoto["pose"] = "front"): BodyPhoto => ({ id, takenOn, pose, path: `u/${id}.jpg` });

describe("몸 사진 한도", () => {
  it("🔴 무료는 3장까지, 라이트는 장수 무제한(하루 10장)", () => {
    expect(FREE_PHOTO_LIMIT).toBe(3);
    expect(photoLimitError("free", 2, 0)).toBeNull();
    expect(photoLimitError("free", 3, 0)).toMatch(/무료는 몸 사진 3장까지/);
    expect(photoLimitError("lite", 300, 0)).toBeNull();
    expect(photoLimitError("lite", 5, DAILY_PHOTO_LIMIT)).toMatch(/하루 10장/);
  });

  it("방향 값 검사", () => {
    expect(isPose("front")).toBe(true);
    expect(isPose("top")).toBe(false);
  });
});

describe("비교", () => {
  const photos = [p("a", "2026-07-01"), p("b", "2026-08-01"), p("c", "2026-09-01"), p("s", "2026-09-01", "side")];

  it("🔴 날짜를 안 고르면 같은 방향의 가장 오래된 것과 최근 것", () => {
    const pair = comparePair(photos, "front");
    expect(pair?.before.id).toBe("a");
    expect(pair?.after.id).toBe("c");
  });

  it("고른 날짜로, 순서가 거꾸로면 바로잡는다", () => {
    const pair = comparePair(photos, "front", "2026-09-01", "2026-08-01");
    expect(pair?.before.id).toBe("b");
    expect(pair?.after.id).toBe("c");
  });

  it("그 방향 사진이 1장뿐이거나 같은 사진이면 비교 없음", () => {
    expect(comparePair(photos, "side")).toBeNull();
    expect(comparePair(photos, "back")).toBeNull();
    expect(comparePair(photos, "front", "2026-08-01", "2026-08-01")).toBeNull();
  });

  it("날짜 목록·기간", () => {
    expect(photoDates(photos)).toEqual(["2026-09-01", "2026-08-01", "2026-07-01"]);
    expect(daysBetween("2026-07-01", "2026-09-01")).toBe(62);
  });

  it("사진 날짜 그날 또는 그 전 가장 가까운 체성분", () => {
    const comps = [
      { date: "2026-06-20", weightKg: 80, muscleKg: 30, fatPct: 25 },
      { date: "2026-08-25", weightKg: 77, muscleKg: 31, fatPct: 22 },
    ];
    expect(compOnOrBefore(comps, "2026-07-01")?.weightKg).toBe(80);
    expect(compOnOrBefore(comps, "2026-09-01")?.weightKg).toBe(77);
    expect(compOnOrBefore(comps, "2026-06-01")).toBeNull();
  });
});
