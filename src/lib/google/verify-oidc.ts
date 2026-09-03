import "server-only";

import { createPublicKey, createVerify, type JsonWebKey } from "node:crypto";

/**
 * 구글이 서명한 OIDC 토큰 검증 — Pub/Sub 푸시가 **정말 구글에서 온 것인지** 확인한다.
 *
 * 🔴 이게 없으면 인터넷의 누구나 우리 웹훅에 POST 해서 **남의 구독을 조작**할 수 있다.
 * "구매 토큰만 알면 되는데 그걸 어떻게 알아?" 가 아니다 — 알림 처리 로직은 토큰으로
 * 행을 찾아 상태를 바꾸므로, 토큰을 아는 사람(그 구매의 당사자)이 남의 계정을
 * 건드리진 못해도 자기 구독을 마음대로 되살릴 수 있다.
 *
 * 구글 공개키(JWKS)는 자주 안 바뀌므로 모듈 스코프에 캐시한다. Fluid Compute 는
 * 인스턴스를 재사용하므로 워밍된 인스턴스에서는 왕복이 0회다.
 */

const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
/** 캐시 수명. 키 로테이션을 놓치지 않을 만큼 짧게. */
const TTL_MS = 60 * 60 * 1000;

type Jwk = JsonWebKey & { kid?: string; alg?: string };

let cached: { keys: Jwk[]; at: number } | null = null;
let inflight: Promise<Jwk[]> | null = null;

async function getKeys(): Promise<Jwk[]> {
  const now = Date.now();
  if (cached && cached.at + TTL_MS > now) return cached.keys;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(CERTS_URL);
      if (!res.ok) return [];
      const json = (await res.json()) as { keys?: Jwk[] };
      const keys = json.keys ?? [];
      if (keys.length > 0) cached = { keys, at: Date.now() };
      return keys;
    } catch {
      return [];
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

const b64urlToBuf = (s: string): Buffer =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

type Claims = {
  iss?: string;
  aud?: string;
  exp?: number;
  email?: string;
  email_verified?: boolean;
};

export type OidcCheck =
  | { ok: true; email: string }
  | { ok: false; reason: string };

/**
 * `Authorization: Bearer <JWT>` 를 검증한다.
 *
 * 확인하는 것: 서명(구글 공개키) · 발급자 · **대상(aud)** · 만료.
 * `aud` 를 안 보면 **구글이 발급한 아무 토큰이나** 통과한다(다른 서비스용 토큰 포함) —
 * 서명만 맞으면 되는 줄 알기 쉬운데, 그게 가장 흔한 구멍이다.
 */
export async function verifyGoogleOidc(
  authorizationHeader: string | null,
  expectedAudience: string,
): Promise<OidcCheck> {
  if (!expectedAudience) return { ok: false, reason: "audience-not-configured" };
  const raw = (authorizationHeader ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!raw) return { ok: false, reason: "no-token" };

  const parts = raw.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [headerB64, payloadB64, sigB64] = parts;

  let header: { kid?: string; alg?: string };
  let claims: Claims;
  try {
    header = JSON.parse(b64urlToBuf(headerB64).toString("utf8"));
    claims = JSON.parse(b64urlToBuf(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  // 알고리즘을 고정한다 — 안 하면 alg:none 이나 대칭키 혼동 공격에 열린다.
  if (header.alg !== "RS256") return { ok: false, reason: "bad-alg" };

  const keys = await getKeys();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return { ok: false, reason: "unknown-key" };

  let verified = false;
  try {
    const pub = createPublicKey({ key: jwk, format: "jwk" });
    verified = createVerify("RSA-SHA256")
      .update(`${headerB64}.${payloadB64}`)
      .verify(pub, b64urlToBuf(sigB64));
  } catch {
    return { ok: false, reason: "verify-failed" };
  }
  if (!verified) return { ok: false, reason: "bad-signature" };

  if (!claims.iss || !ISSUERS.has(claims.iss)) return { ok: false, reason: "bad-issuer" };
  if (claims.aud !== expectedAudience) return { ok: false, reason: "bad-audience" };
  const now = Math.floor(Date.now() / 1000);
  if (!claims.exp || claims.exp <= now) return { ok: false, reason: "expired" };

  return { ok: true, email: claims.email ?? "" };
}
