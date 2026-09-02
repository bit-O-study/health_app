import { describe, expect, it } from "vitest";

import { readRecoveryCount } from "@/lib/platform/renderer-recovery";
import {
  REPEATED_RENDERER_RECOVERY_COUNT,
  rendererRecoveryDestination,
} from "@/lib/platform/route-restore";

/**
 * 네이티브 → 웹 **복구 상태 전달 방식**과 **반복 종료 시나리오** 고정 — 로드맵 1.1.
 *
 * 이 두 가지가 어긋나면 사용자는 "죽던 화면으로 돌아가 또 죽는" 고리에 갇힌다.
 * 그런데 증상만 보면 앱이 그냥 자주 꺼지는 것으로 보여, 원인을 짚기가 아주 어렵다.
 */

describe("readRecoveryCount — 브리지에서 복구 횟수 받기", () => {
  it("새 APK: 횟수를 그대로 받는다", () => {
    expect(readRecoveryCount({ consumeRendererRecoveryCount: () => 3 })).toBe(3);
  });

  it("🔴 옛 APK: 횟수 함수가 없으면 boolean 으로 내려간다", () => {
    // 사용자는 앱을 바로 업데이트하지 않는다. 폴백이 없으면 옛 APK 에서는
    // 반복 종료를 영영 못 알아채고 죽는 고리를 그대로 돈다.
    expect(readRecoveryCount({ consumeRendererRecovery: () => true })).toBe(1);
    expect(readRecoveryCount({ consumeRendererRecovery: () => false })).toBe(0);
  });

  it("새 함수가 숫자가 아니면 옛 함수로 내려간다(버전이 섞인 경우)", () => {
    expect(
      readRecoveryCount({
        consumeRendererRecoveryCount: () => undefined as unknown as number,
        consumeRendererRecovery: () => true,
      }),
    ).toBe(1);
  });

  it("웹(브리지 없음)은 0 — 평범한 부팅", () => {
    expect(readRecoveryCount(null)).toBe(0);
    expect(readRecoveryCount(undefined)).toBe(0);
    expect(readRecoveryCount({})).toBe(0);
  });

  it("🔴 브리지가 던져도 0 — 복구 감지 실패가 앱을 막으면 안 된다", () => {
    expect(
      readRecoveryCount({
        consumeRendererRecoveryCount: () => {
          throw new Error("bridge gone");
        },
      }),
    ).toBe(0);
  });

  it("이상한 값(음수·소수·NaN)은 안전하게 정리한다", () => {
    expect(readRecoveryCount({ consumeRendererRecoveryCount: () => -5 })).toBe(0);
    expect(readRecoveryCount({ consumeRendererRecoveryCount: () => 2.9 })).toBe(2);
    expect(readRecoveryCount({ consumeRendererRecoveryCount: () => NaN })).toBe(0);
    expect(
      readRecoveryCount({ consumeRendererRecoveryCount: () => Infinity }),
    ).toBe(0);
  });

  it("🔴 값은 한 번만 온다 — 네이티브가 읽는 즉시 지운다", () => {
    // 부팅당 한 번만 부르는 것이 계약이다. 두 번 부르면 두 번째는 0 이라,
    // 호출부가 여러 번 부르면 반복 종료를 놓친다.
    let left = 2;
    const bridge = {
      consumeRendererRecoveryCount: () => {
        const v = left;
        left = 0;
        return v;
      },
    };
    expect(readRecoveryCount(bridge)).toBe(2);
    expect(readRecoveryCount(bridge)).toBe(0);
  });
});

describe("반복 종료 시나리오 — 어디로 보낼 것인가", () => {
  it("한 번 죽은 것으로는 화면을 뺏지 않는다", () => {
    expect(rendererRecoveryDestination(0)).toBeNull();
    expect(rendererRecoveryDestination(1)).toBeNull();
  });

  it("🔴 2분 안에 두 번 이상이면 안전한 홈으로 — 죽던 화면으로 돌아가면 또 죽는다", () => {
    expect(rendererRecoveryDestination(REPEATED_RENDERER_RECOVERY_COUNT)).toBe("/home");
    expect(rendererRecoveryDestination(5)).toBe("/home");
  });

  it("기준은 2회 — 낮추면 한 번 죽어도 화면을 뺏고, 높이면 고리를 더 오래 돈다", () => {
    expect(REPEATED_RENDERER_RECOVERY_COUNT).toBe(2);
  });

  it("브리지에서 읽은 값이 그대로 목적지 판단으로 이어진다(옛 APK 포함)", () => {
    // 옛 APK 는 최대 1 이라 **혼자서는 안전 홈으로 못 보낸다** — 알려진 한계다.
    // (횟수를 세는 건 새 APK 부터. 이 사실을 테스트로 남겨 둬야 나중에 헷갈리지 않는다)
    const old = readRecoveryCount({ consumeRendererRecovery: () => true });
    expect(rendererRecoveryDestination(old)).toBeNull();

    const fresh = readRecoveryCount({ consumeRendererRecoveryCount: () => 2 });
    expect(rendererRecoveryDestination(fresh)).toBe("/home");
  });
});
