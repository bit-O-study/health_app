import { describe, expect, it } from "vitest";

import {
  createAppErrorDiagnostic,
  isChunkLoadError,
  isRecoverableLoadError,
  LAST_APP_ERROR_KEY,
  recordAppErrorDiagnostic,
  shouldAutoReload,
  shouldRecoverAppError,
} from "@/lib/chunk-recovery";

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

describe("isRecoverableLoadError", () => {
  it("청크와 일시적 네트워크 로드 오류만 복구 대상으로 본다", () => {
    for (const message of [
      "ChunkLoadError: Loading chunk 472 failed.",
      "TypeError: Failed to fetch",
      "NetworkError when attempting to fetch resource.",
      "net::ERR_NETWORK_CHANGED",
    ]) {
      expect(isRecoverableLoadError(message)).toBe(true);
    }
  });

  it("일반 코드·렌더 오류는 앱 전체 새로고침 대상으로 보지 않는다", () => {
    for (const message of [
      "TypeError: Cannot read properties of undefined",
      "Invariant: expected a routine row",
      "An error occurred while rendering the Server Component",
    ]) {
      expect(isRecoverableLoadError(message)).toBe(false);
    }
  });
});

describe("app error recovery decision", () => {
  const now = 1_000_000;

  it("복구 가능한 오류도 30초 가드를 통과할 때만 자동 새로고침한다", () => {
    const error = new Error("ChunkLoadError: Loading chunk 1 failed");
    expect(shouldRecoverAppError(error, 0, now)).toBe(true);
    expect(shouldRecoverAppError(error, now - 5_000, now)).toBe(false);
  });

  it("진단 정보는 허용 필드만 길이 제한해 만든다", () => {
    const error = Object.assign(new Error("m".repeat(700)), {
      digest: "d".repeat(200),
    });
    const diagnostic = createAppErrorDiagnostic(
      error,
      `/${"p".repeat(700)}`,
      now,
    );

    expect(diagnostic).toEqual({
      occurredAt: now,
      path: `/${"p".repeat(499)}`,
      message: "m".repeat(500),
      digest: "d".repeat(120),
      recoverable: false,
    });
    expect(Object.keys(diagnostic).sort()).toEqual(
      ["digest", "message", "occurredAt", "path", "recoverable"].sort(),
    );
  });

  it("최신 진단 한 건을 지정 저장소에 기록하고 결과를 반환한다", () => {
    const values = new Map<string, string>();
    const storage = {
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const error = Object.assign(new Error("render failed"), { digest: "abc" });

    const diagnostic = recordAppErrorDiagnostic(
      error,
      "/routine",
      123,
      storage,
    );

    expect(JSON.parse(values.get(LAST_APP_ERROR_KEY)!)).toEqual(diagnostic);
  });
});
