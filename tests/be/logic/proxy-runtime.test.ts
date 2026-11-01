import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

// 회귀 방지(2026-11-01): 요청 앞단이 middleware.ts(Edge 샌드박스)이면 서버의 로컬 API 경로가
// 안 먹어 로그인 사용자 요청마다 4~5번을 Cloudflare 로 돌아 나갔다(약 0.6초). Next 16 의
// proxy.ts 는 Node.js 런타임이라 같은 서버 안으로 바로 간다.
describe("요청 앞단은 Node.js 런타임 proxy", () => {
  it("src/proxy.ts 가 proxy 를 내보내고 middleware.ts 는 없다", () => {
    expect(existsSync("src/middleware.ts")).toBe(false);
    const src = readFileSync("src/proxy.ts", "utf8");
    expect(src).toMatch(/export async function proxy\(/);
    expect(src).toContain("updateSession(request)");
    expect(src).not.toMatch(/runtime\s*[:=]/); // proxy 에 runtime 설정은 오류
  });
});
