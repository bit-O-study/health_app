import { describe, expect, it } from "vitest";

import {
  decideRendererRecovery,
  parseRendererRecovery,
  RECOVERY_EVENT_MAX_AGE_MS,
} from "@/lib/platform/renderer-recovery";

const NOW = 1_000_000;
const saved = { path: "/community", ts: NOW - 1_000 };

describe("renderer recovery", () => {
  it("첫 종료는 기존 RouteKeeper 복원을 한 번 허용한다", () => {
    const event = parseRendererRecovery(
      JSON.stringify({ mode: "restore_once", occurredAt: NOW, count: 1, didCrash: false }),
      NOW,
    );
    expect(decideRendererRecovery(event, saved, "/", NOW)).toEqual({
      targetPath: "/community",
      clearSavedRoute: false,
      notice: "앱 화면을 복구했어요.",
    });
  });

  it("5분 안 반복 종료는 저장 경로를 버리고 홈으로 간다", () => {
    const event = parseRendererRecovery(
      JSON.stringify({ mode: "safe_home", occurredAt: NOW, count: 2, didCrash: true }),
      NOW,
    );
    expect(decideRendererRecovery(event, saved, "/", NOW)).toEqual({
      targetPath: "/home",
      clearSavedRoute: true,
      notice: "화면 오류가 반복되어 홈으로 안전하게 이동했어요.",
    });
  });

  it("손상되거나 오래된 이벤트는 무시한다", () => {
    expect(parseRendererRecovery("not-json", NOW)).toBeNull();
    expect(
      parseRendererRecovery(
        JSON.stringify({
          mode: "safe_home",
          occurredAt: NOW - RECOVERY_EVENT_MAX_AGE_MS,
          count: 2,
          didCrash: false,
        }),
        NOW,
      ),
    ).toBeNull();
  });
});
