import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";
import { afterEach, describe, expect, it, vi } from "vitest";
import config from "../../../next.config";

afterEach(() => vi.unstubAllEnvs());

describe("로컬 개발 서버의 DB 주소", () => {
  const legacyUrl = "https://hgfsfupazyjcrmophmzc.supabase.co";

  it.each([legacyUrl, `${legacyUrl}.:443/rest/v1`])("이전 헬쑤 DB의 주소 변형도 차단한다 (%s)", (url) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    expect(() => config(PHASE_DEVELOPMENT_SERVER)).toThrow("이전 헬쑤 DB");
  });

  it.each(["https://api.helthssu.co.kr/health", "http://127.0.0.1:54321"])("현재 운영 API와 로컬 테스트 DB는 허용한다 (%s)", (url) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    expect(() => config(PHASE_DEVELOPMENT_SERVER)).not.toThrow();
  });

  it("배포 빌드의 시작 조건은 바꾸지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", legacyUrl);
    expect(() => config(PHASE_PRODUCTION_BUILD)).not.toThrow();
  });
});
