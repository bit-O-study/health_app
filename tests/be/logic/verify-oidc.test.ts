import { generateKeyPairSync, createSign, type KeyObject } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { verifyGoogleOidc } from "@/lib/google/verify-oidc";

/**
 * Pub/Sub 푸시가 **정말 구글에서 온 것인지** 확인하는 검증기.
 * 여기서 막지 못하면 인터넷의 누구나 우리 웹훅에 POST 할 수 있다.
 *
 * 진짜 RSA 키로 서명한 토큰을 만들어, 구글 공개키 응답만 가짜로 끼운다.
 */

const AUD = "https://helssu.example/api/billing/google/notify";
const KID = "test-key-1";

let publicKey: KeyObject;
let privateKey: KeyObject;

const b64url = (b: Buffer | string) =>
  (typeof b === "string" ? Buffer.from(b) : b)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

function sign(
  claims: Record<string, unknown>,
  header: Record<string, unknown> = {},
): string {
  const h = b64url(JSON.stringify({ alg: "RS256", kid: KID, ...header }));
  const p = b64url(JSON.stringify(claims));
  const s = createSign("RSA-SHA256").update(`${h}.${p}`).sign(privateKey);
  return `${h}.${p}.${b64url(s)}`;
}

const validClaims = () => ({
  iss: "https://accounts.google.com",
  aud: AUD,
  exp: Math.floor(Date.now() / 1000) + 600,
  email: "pubsub@example.iam.gserviceaccount.com",
});

beforeAll(() => {
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  publicKey = pair.publicKey;
  privateKey = pair.privateKey;

  const jwk = { ...publicKey.export({ format: "jwk" }), kid: KID, alg: "RS256" };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ keys: [jwk] }),
    })),
  );
});

afterEach(() => {
  // 캐시 때문에 fetch 는 한 번만 불린다 — 호출 수를 단언하지 않는다.
});

describe("verifyGoogleOidc", () => {
  it("제대로 서명된 토큰은 통과", async () => {
    const r = await verifyGoogleOidc(`Bearer ${sign(validClaims())}`, AUD);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.email).toContain("gserviceaccount.com");
  });

  it("Bearer 접두사가 없어도 읽는다", async () => {
    expect((await verifyGoogleOidc(sign(validClaims()), AUD)).ok).toBe(true);
  });

  it("토큰이 없으면 거절", async () => {
    expect(await verifyGoogleOidc(null, AUD)).toEqual({ ok: false, reason: "no-token" });
    expect(await verifyGoogleOidc("Bearer ", AUD)).toEqual({
      ok: false,
      reason: "no-token",
    });
  });

  it("모양이 깨진 토큰은 거절", async () => {
    expect((await verifyGoogleOidc("Bearer a.b", AUD)).ok).toBe(false);
    expect((await verifyGoogleOidc("Bearer !.@.#", AUD)).ok).toBe(false);
  });

  it("🔴 대상(aud)이 다르면 거절 — 안 보면 구글이 발급한 아무 토큰이나 통과한다", async () => {
    const r = await verifyGoogleOidc(`Bearer ${sign(validClaims())}`, "https://다른곳");
    expect(r).toEqual({ ok: false, reason: "bad-audience" });
  });

  it("설정이 없으면(audience 빈 값) 통과시키지 않는다", async () => {
    const r = await verifyGoogleOidc(`Bearer ${sign(validClaims())}`, "");
    expect(r).toEqual({ ok: false, reason: "audience-not-configured" });
  });

  it("발급자가 구글이 아니면 거절", async () => {
    const r = await verifyGoogleOidc(
      `Bearer ${sign({ ...validClaims(), iss: "https://evil.example" })}`,
      AUD,
    );
    expect(r).toEqual({ ok: false, reason: "bad-issuer" });
  });

  it("만료된 토큰은 거절", async () => {
    const r = await verifyGoogleOidc(
      `Bearer ${sign({ ...validClaims(), exp: Math.floor(Date.now() / 1000) - 10 })}`,
      AUD,
    );
    expect(r).toEqual({ ok: false, reason: "expired" });
  });

  it("🔴 alg 를 고정한다 — none/대칭키 혼동 공격 차단", async () => {
    const h = b64url(JSON.stringify({ alg: "none", kid: KID }));
    const p = b64url(JSON.stringify(validClaims()));
    const r = await verifyGoogleOidc(`Bearer ${h}.${p}.`, AUD);
    expect(r).toEqual({ ok: false, reason: "bad-alg" });
  });

  it("모르는 키(kid)로 서명했으면 거절", async () => {
    const r = await verifyGoogleOidc(
      `Bearer ${sign(validClaims(), { kid: "다른키" })}`,
      AUD,
    );
    expect(r).toEqual({ ok: false, reason: "unknown-key" });
  });

  it("🔴 내용을 바꾼 토큰은 서명이 안 맞아 거절", async () => {
    const token = sign(validClaims());
    const [h, , s] = token.split(".");
    const tampered = b64url(
      JSON.stringify({ ...validClaims(), email: "attacker@evil.example" }),
    );
    const r = await verifyGoogleOidc(`Bearer ${h}.${tampered}.${s}`, AUD);
    expect(r).toEqual({ ok: false, reason: "bad-signature" });
  });
});
