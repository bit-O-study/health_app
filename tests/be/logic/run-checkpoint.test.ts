import { afterEach, describe, expect, it, vi } from "vitest";

import {
  newRunCheckpoint,
  normalizeRunCheckpoint,
  readRunCheckpoint,
  RUN_CHECKPOINT_MAX_AGE_MS,
} from "@/features/running/run-checkpoint";

const now = Date.parse("2026-09-01T03:00:00.000Z");
const id = "123e4567-e89b-42d3-a456-426614174000";

afterEach(() => vi.unstubAllGlobals());

describe("run checkpoint", () => {
  it("같은 서울 날짜와 모드의 체크포인트만 복원한다", () => {
    const checkpoint = newRunCheckpoint("outdoor", id, now);
    expect(normalizeRunCheckpoint(checkpoint, "outdoor", now)).toMatchObject({
      sessionId: id,
      forDate: "2026-09-01",
    });
    expect(normalizeRunCheckpoint(checkpoint, "indoor", now)).toBeNull();
    expect(normalizeRunCheckpoint(checkpoint, "outdoor", now + RUN_CHECKPOINT_MAX_AGE_MS + 1)).toBeNull();
  });

  it("복원값을 안전 범위로 제한하고 실내에는 GPS 경로를 남기지 않는다", () => {
    const checkpoint = {
      ...newRunCheckpoint("indoor", id, now),
      elapsedSec: 100_000,
      distanceM: 300_000,
      speedKmh: 80,
      incline: 20,
      route: [{ lat: 37, lng: 127, t: now }],
    };
    expect(normalizeRunCheckpoint(checkpoint, "indoor", now)).toMatchObject({
      elapsedSec: 86_400,
      distanceM: 200_000,
      speedKmh: 50,
      incline: 15,
      route: [],
    });
  });

  it("손상되거나 범위를 벗어난 GPS 경로는 복원하지 않는다", () => {
    const checkpoint = newRunCheckpoint("outdoor", id, now);
    expect(normalizeRunCheckpoint({ ...checkpoint, route: [{ lat: 91, lng: 127, t: now }] }, "outdoor", now)).toBeNull();
    expect(normalizeRunCheckpoint({ ...checkpoint, route: [{ lat: 37, lng: Number.NaN, t: now }] }, "outdoor", now)).toBeNull();
  });

  it("다른 모드 체크포인트는 읽지 않되 저장소에서 삭제하지 않는다", () => {
    const saved = JSON.stringify(newRunCheckpoint("outdoor", id));
    const removeItem = vi.fn();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: () => saved, removeItem });

    expect(readRunCheckpoint("indoor")).toBeNull();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it("깨진 체크포인트는 저장소에서 제거한다", () => {
    const removeItem = vi.fn();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: () => "{broken", removeItem });

    expect(readRunCheckpoint("outdoor")).toBeNull();
    expect(removeItem).toHaveBeenCalledWith("heltch.running.checkpoint");
  });
});
