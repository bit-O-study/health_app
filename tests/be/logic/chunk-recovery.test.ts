import { describe, expect, it } from "vitest";

import { isChunkLoadError, shouldAutoReload } from "@/lib/chunk-recovery";

describe("isChunkLoadError", () => {
  it("청크/동적 import 로드 실패 메시지를 잡는다", () => {
    const hits = [
      "ChunkLoadError: Loading chunk 472 failed.",
      "Loading chunk app/running/page failed",
      "Failed to fetch dynamically imported module: https://x/_next/static/abc.js",
      "error loading dynamically imported module",
      "Importing a module script failed.",
      "Loading CSS chunk 12 failed",
    ];
    for (const m of hits) expect(isChunkLoadError(m)).toBe(true);
  });

  it("관련 없는 에러/빈값은 무시한다(불필요한 새로고침 방지)", () => {
    for (const m of [
      "TypeError: x is not a function",
      "Network request failed",
      "",
      null,
      undefined,
    ]) {
      expect(isChunkLoadError(m)).toBe(false);
    }
  });
});

describe("shouldAutoReload", () => {
  const now = 1_000_000_000_000;

  it("처음(기록 없음 0/NaN)엔 자동 리로드 허용", () => {
    expect(shouldAutoReload(0, now)).toBe(true);
    expect(shouldAutoReload(Number.NaN, now)).toBe(true);
    expect(shouldAutoReload(-1, now)).toBe(true);
  });

  it("최근 30초 내 이미 리로드했으면 막는다(무한 루프 방지)", () => {
    expect(shouldAutoReload(now - 5_000, now)).toBe(false);
    expect(shouldAutoReload(now - 29_999, now)).toBe(false);
  });

  it("30초 지났으면 다시 허용", () => {
    expect(shouldAutoReload(now - 30_000, now)).toBe(true);
    expect(shouldAutoReload(now - 60_000, now)).toBe(true);
  });

  it("windowMs 를 조절할 수 있다", () => {
    expect(shouldAutoReload(now - 5_000, now, 10_000)).toBe(false);
    expect(shouldAutoReload(now - 5_000, now, 3_000)).toBe(true);
  });
});
