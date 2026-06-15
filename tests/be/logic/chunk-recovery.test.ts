import { describe, expect, it } from "vitest";

import { isChunkLoadError } from "@/lib/chunk-recovery";

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
