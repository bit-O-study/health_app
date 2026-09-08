import { describe, expect, it } from "vitest";

/** 라이브 인증 설정 검사. 설정·네트워크·환경변수 오류는 통과로 숨기지 않는다.
 * 카카오 동의항목(KOE205)은 공급자 콘솔 및 실계정 로그인 검증도 필요하다.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/**
 * 소셜 로그인이 돌아와야 하는 곳 — 전부 허용목록에 있어야 한다.
 * 운영/APK: `capacitor.config.ts` 의 SERVER_URL · AndroidManifest 의 App Link host.
 * 로컬: 개발 중 구글/카카오 로그인을 눌러볼 때 쓴다.
 */
const CALLBACKS = [
  "https://health-app-five-iota.vercel.app/auth/callback",
  "http://localhost:3000/auth/callback",
  "https://health-app-five-iota.vercel.app/auth/callback?native=1&next=%2Froutine",
];

type Settings = {
  external: Record<string, boolean>;
  disable_signup: boolean;
  mailer_autoconfirm: boolean;
};

async function getSettings(): Promise<Settings> {
  if (!SUPABASE_URL || !ANON_KEY) throw new Error("Supabase URL/공개 키 환경변수가 필요합니다.");
  const res = await fetch(SUPABASE_URL + "/auth/v1/settings", {
    headers: { apikey: ANON_KEY },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error("Auth 설정 조회 HTTP " + res.status);
  return await res.json() as Settings;
}

/**
 * `redirect_to` 가 허용목록을 통과하는지 — 통과하면 GoTrue 가 그 주소로 되돌리고,
 * 막히면 Site URL 로 갈아끼운다. 없는 토큰이라 어차피 에러로 끝나지만,
 * **어디로 되돌리는지**가 곧 허용 여부다(부작용 없음).
 */
async function redirectSurvives(target: string): Promise<boolean> {
  const url =
    `${SUPABASE_URL}/auth/v1/verify?token=bogus&type=signup` +
    `&redirect_to=${encodeURIComponent(target)}`;
  try {
    const res = await fetch(url, {
      headers: { apikey: ANON_KEY },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    const location = res.headers.get("location");
    if (!location) throw new Error("Auth 리다이렉트 응답 없음: HTTP " + res.status);
    const expected = new URL(target);
    const actual = new URL(location);
    return actual.origin === expected.origin && actual.pathname === expected.pathname
      && [...expected.searchParams].every(([key, value]) => actual.searchParams.get(key) === value);
  } catch (error) {
    throw new Error("Auth 콜백 설정 확인 실패", { cause: error });
  }
}

describe("Supabase Auth 라이브 설정", () => {
  it("소셜/이메일 공급자가 켜져 있고 가입이 막혀 있지 않다", async () => {
    const s = await getSettings();

    expect(s.external.google, "구글 로그인 공급자").toBe(true);
    expect(s.external.kakao, "카카오 로그인 공급자").toBe(true);
    expect(s.external.email, "이메일 가입").toBe(true);
    expect(s.disable_signup, "신규 가입 차단 여부").toBe(false);
  });

  it.each(CALLBACKS)(
    "★ %s 가 Redirect URLs 허용목록에 있다",
    async (target) => {
      const ok = await redirectSurvives(target);

      expect(
        ok,
        `허용목록에 없다 → 소셜 로그인이 이 주소 대신 Site URL 로 떨어진다.\n` +
          `Supabase 콘솔 [Authentication] → [URL Configuration] → Redirect URLs 에\n` +
          `  ${target}\n` +
          `를 추가할 것.`,
      ).toBe(true);
    },
  );
});

// 기본 scopes가 아니라 앱과 같은 단수 scope가 Kakao까지 전달되는지 검사한다.
it("카카오 실제 인가 요청에서 이메일 scope를 제외한다", async () => {
  const url = new URL(SUPABASE_URL + "/auth/v1/authorize");
  url.searchParams.set("provider", "kakao");
  url.searchParams.set("scope", "profile_nickname profile_image");
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
  expect(response.status).toBe(302);
  const target = new URL(response.headers.get("location")!);
  expect(target.hostname).toBe("kauth.kakao.com");
  expect(target.searchParams.get("scope")?.split(" ").sort()).toEqual(["profile_image", "profile_nickname"]);
});
