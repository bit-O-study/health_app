import "server-only";

import { createSign } from "node:crypto";

/**
 * 구글 서비스 계정 → OAuth 액세스 토큰. 무거운 SDK 없이 JWT 를 직접 서명한다.
 *
 * FCM(푸시)과 Google Play Developer API(인앱결제 검증)가 **같은 방식**을 쓴다. 예전엔
 * 이 코드가 `fcm.ts` 안에만 있었는데, 결제가 붙으면서 복사할 자리가 생겼다 — 복사하면
 * 캐시·오류 처리가 한쪽만 고쳐진다.
 *
 * 🔴 **토큰 캐시는 scope 별로 나눈다.** 예전 코드는 캐시 키가 하나뿐이라, 두 기능이
 * 같이 쓰면 푸시용 토큰을 결제 검증에 쓰게 된다(권한이 달라 401 이 나는데, 원인을
 * 찾기가 아주 어렵다).
 */

export type GoogleServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

/** 환경변수(JSON 문자열) → 서비스 계정. 없거나 깨졌으면 null. */
export function loadServiceAccount(
  envName: string,
): GoogleServiceAccount | null {
  const raw = process.env[envName];
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Partial<GoogleServiceAccount>;
    return j.project_id && j.client_email && j.private_key
      ? {
          project_id: j.project_id,
          client_email: j.client_email,
          private_key: j.private_key,
        }
      : null;
  } catch {
    return null;
  }
}

const b64url = (s: string | Buffer): string =>
  (typeof s === "string" ? Buffer.from(s) : s)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** scope 별 토큰 캐시 — 같은 계정이라도 권한이 다르면 다른 토큰이다. */
const cache = new Map<string, { token: string; exp: number }>();

/** 캐시 키는 계정 + scope. 계정이 바뀌면(환경변수 교체) 옛 토큰을 재사용하지 않는다. */
const keyOf = (sa: GoogleServiceAccount, scope: string) =>
  `${sa.client_email}|${scope}`;

/** 서비스 계정으로 OAuth 액세스 토큰 발급(만료 1분 전까지 캐시). 실패하면 null. */
export async function getGoogleAccessToken(
  sa: GoogleServiceAccount,
  scope: string,
): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const key = keyOf(sa, scope);
  const hit = cache.get(key);
  if (hit && hit.exp - 60 > now) return hit.token;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  let jwt: string;
  try {
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${claim}`);
    jwt = `${header}.${claim}.${b64url(signer.sign(sa.private_key))}`;
  } catch {
    // 키 형식이 깨졌다(줄바꿈이 \n 문자로 들어간 경우가 흔하다).
    return null;
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!j.access_token) return null;
    cache.set(key, { token: j.access_token, exp: now + (j.expires_in ?? 3600) });
    return j.access_token;
  } catch {
    return null;
  }
}

/** 테스트·환경변수 교체용. */
export function clearGoogleTokenCache(): void {
  cache.clear();
}
