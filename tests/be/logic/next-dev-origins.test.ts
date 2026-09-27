import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 개발 서버 접속 주소 가드 (2026-09-25 "편집이 안 눌러지네").
 * Next 16 은 localhost 가 아닌 주소에서 온 개발 리소스 요청을 막는다 → 127.0.0.1·폰(같은 와이파이)으로
 * 열면 화면만 뜨고 JS 가 안 붙어 버튼이 전부 먹통이었다. E2E 도 127.0.0.1 로 붙는다.
 */
describe("next.config allowedDevOrigins", () => {
  const config = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");

  it("127.0.0.1 과 사설망(폰) 주소를 허용한다", () => {
    const m = config.match(/allowedDevOrigins:\s*\[([^\]]*)\]/);
    expect(m, "allowedDevOrigins 없음").not.toBeNull();
    const list = m![1];
    expect(list).toContain('"127.0.0.1"');
    expect(list).toContain('"192.168.*.*"');
  });
});
