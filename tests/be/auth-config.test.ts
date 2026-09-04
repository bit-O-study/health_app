import { describe, expect, it } from "vitest";

/**
 * AUTH CONFIG DRIFT GUARD — 스키마 가드(schema-sync)의 인증 설정 판.
 *
 * 스키마와 똑같은 병이 인증에도 있다: **코드는 맞는데 라이브 설정이 안 따라와서**
 * prod 에서만 빵꾸가 난다. 여기서 잡는 게 그것 — Supabase 콘솔의 Auth 설정은
 * 레포에 없어서 코드 리뷰로는 절대 안 보인다.
 *
 * 실제로 2026-09-04 에 걸린 것: **운영 도메인이 Redirect URLs 허용목록에 없었다.**
 * 그러면 구글/카카오 인증이 끝난 뒤 Supabase 가 우리 `/auth/callback` 대신
 * Site URL 로 떨어뜨려, code 교환이 아예 안 일어나고 사용자는 로그아웃 상태로
 * 남는다(앱은 더 나쁘다 — `native=1` 도 같이 버려져 `helssu://` 복귀가 안 된다).
 *
 * 기본 스위트(`pnpm test`)에서는 **빠져 있다** — 여기서 실패하는 건 코드가 아니라
 * 콘솔 설정이라, 빌드 게이트를 막아봐야 코드로는 고칠 수가 없다.
 * 설정을 만졌을 때 `pnpm test:auth` 로 직접 돌린다.
 *
 * 읽기만 한다(존재하지 않는 토큰으로 리다이렉트 판정만 본다). 네트워크가 안 되면 건너뛴다.
 */
const SUPABASE_URL = "https://hgfsfupazyjcrmophmzc.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/**
 * 소셜 로그인이 돌아와야 하는 곳 — 전부 허용목록에 있어야 한다.
 * 운영/APK: `capacitor.config.ts` 의 SERVER_URL · AndroidManifest 의 App Link host.
 * 로컬: 개발 중 구글/카카오 로그인을 눌러볼 때 쓴다.
 */
const CALLBACKS = [
  "https://health-app-five-iota.vercel.app/auth/callback",
  "http://localhost:3000/auth/callback",
];

type Settings = {
  external: Record<string, boolean>;
  disable_signup: boolean;
  mailer_autoconfirm: boolean;
};

async function getSettings(): Promise<Settings | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: ANON_KEY },
    });
    if (!res.ok) return null;
    return (await res.json()) as Settings;
  } catch {
    return null; // 오프라인 → 건너뛴다
  }
}

/**
 * `redirect_to` 가 허용목록을 통과하는지 — 통과하면 GoTrue 가 그 주소로 되돌리고,
 * 막히면 Site URL 로 갈아끼운다. 없는 토큰이라 어차피 에러로 끝나지만,
 * **어디로 되돌리는지**가 곧 허용 여부다(부작용 없음).
 */
async function redirectSurvives(target: string): Promise<boolean | null> {
  const url =
    `${SUPABASE_URL}/auth/v1/verify?token=bogus&type=signup` +
    `&redirect_to=${encodeURIComponent(target)}`;
  try {
    const res = await fetch(url, {
      headers: { apikey: ANON_KEY },
      redirect: "manual",
    });
    const location = res.headers.get("location");
    if (!location) return null;
    return location.startsWith(target);
  } catch {
    return null; // 오프라인 → 건너뛴다
  }
}

describe("Supabase Auth 라이브 설정", () => {
  it("소셜/이메일 공급자가 켜져 있고 가입이 막혀 있지 않다", async () => {
    const s = await getSettings();
    if (!s) return; // 오프라인

    expect(s.external.google, "구글 로그인 공급자").toBe(true);
    expect(s.external.kakao, "카카오 로그인 공급자").toBe(true);
    expect(s.external.email, "이메일 가입").toBe(true);
    expect(s.disable_signup, "신규 가입 차단 여부").toBe(false);
  });

  it.each(CALLBACKS)(
    "★ %s 가 Redirect URLs 허용목록에 있다",
    async (target) => {
      const ok = await redirectSurvives(target);
      if (ok === null) return; // 오프라인

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
