import "server-only";

import { createSign } from "node:crypto";

/**
 * 네이티브 푸시(FCM) 전송 — 안드로이드 WebView 앱은 Web Push 미지원이라 FCM 토큰으로 보낸다.
 * 무거운 SDK 없이 서비스 계정으로 JWT 서명 → OAuth 토큰 → FCM HTTP v1 REST 로 보낸다.
 * FIREBASE_SERVICE_ACCOUNT(서비스 계정 JSON 문자열) 가 있어야 동작. 없으면 no-op.
 */

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

let sa: ServiceAccount | null | undefined;
function getSA(): ServiceAccount | null {
  if (sa !== undefined) return sa;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    sa = null;
    return null;
  }
  try {
    const j = JSON.parse(raw) as Partial<ServiceAccount>;
    sa =
      j.project_id && j.client_email && j.private_key
        ? {
            project_id: j.project_id,
            client_email: j.client_email,
            private_key: j.private_key,
          }
        : null;
  } catch {
    sa = null;
  }
  return sa;
}

/** FCM 전송 가능 여부(서비스 계정 설정됨). */
export function fcmEnabled(): boolean {
  return getSA() !== null;
}

const b64url = (s: string | Buffer): string =>
  (typeof s === "string" ? Buffer.from(s) : s)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

let cachedToken: { token: string; exp: number } | null = null;

/** 서비스 계정으로 OAuth 액세스 토큰 발급(1시간 캐시). */
async function getAccessToken(s: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: s.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = b64url(signer.sign(s.private_key));
  const jwt = `${header}.${claim}.${signature}`;

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
    cachedToken = { token: j.access_token, exp: now + (j.expires_in ?? 3600) };
    return j.access_token;
  } catch {
    return null;
  }
}

export type FcmPayload = {
  title: string;
  body: string;
  type?: string;
  url?: string;
};

/**
 * 토큰 1개에 FCM 알림 전송. 만료/무효 토큰이면 "gone"(호출측이 정리).
 */
export async function sendFcm(
  token: string,
  payload: FcmPayload,
): Promise<"ok" | "gone" | "error"> {
  const s = getSA();
  if (!s) return "error";
  const accessToken = await getAccessToken(s);
  if (!accessToken) return "error";

  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${s.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: payload.title, body: payload.body },
            data: {
              type: String(payload.type ?? ""),
              url: String(payload.url ?? ""),
            },
            android: {
              priority: "HIGH",
              notification: { channel_id: "default", default_sound: true },
            },
          },
        }),
      },
    );
    if (res.ok) return "ok";
    // 404(등록 안 됨)·400(무효 토큰)은 정리 대상.
    if (res.status === 404 || res.status === 400) return "gone";
    return "error";
  } catch {
    return "error";
  }
}
