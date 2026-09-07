import { describe, expect, it } from "vitest";

import { securityHeaders } from "@/lib/security/headers";

/**
 * 보안 헤더는 빠져도 화면이 멀쩡해서 아무도 모른다 — 의도를 여기 못 박는다.
 */
function map(secure: boolean): Record<string, string> {
  return Object.fromEntries(securityHeaders(secure).map((h) => [h.key, h.value]));
}

describe("securityHeaders", () => {
  it("프레임 삽입·MIME 스니핑·리퍼러 유출을 막는다", () => {
    const h = map(true);
    expect(h["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("쓰는 권한만 self 로 연다 — 카메라·위치·모션", () => {
    const p = map(true)["Permissions-Policy"];
    for (const feature of ["camera", "geolocation", "accelerometer", "gyroscope"]) {
      expect(p).toContain(`${feature}=(self)`);
    }
  });

  it("안 쓰는 권한은 아무에게도 열지 않는다 — 마이크·결제·USB", () => {
    const p = map(true)["Permissions-Policy"];
    // getUserMedia 는 전부 audio:false, 결제는 네이티브 Play Billing 이다.
    for (const feature of ["microphone", "payment", "usb"]) {
      expect(p).toContain(`${feature}=()`);
    }
    // '=()' 를 '=(self)' 로 잘못 바꾸는 회귀를 잡는다.
    expect(p).not.toContain("microphone=(self)");
  });

  it("HSTS 는 https 환경에서만 — 로컬 dev(http)에 걸면 개발 서버가 안 열린다", () => {
    expect(map(true)["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains",
    );
    expect(map(false)["Strict-Transport-Security"]).toBeUndefined();
    // HSTS 말고는 두 환경이 같아야 한다.
    expect(securityHeaders(false)).toHaveLength(securityHeaders(true).length - 1);
  });

  it("preload 는 넣지 않는다 — 등재되면 되돌리는 데 몇 달 걸린다", () => {
    expect(map(true)["Strict-Transport-Security"]).not.toContain("preload");
  });
});
