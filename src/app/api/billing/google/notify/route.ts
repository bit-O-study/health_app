import { NextResponse } from "next/server";

import { handleRtdn } from "@/features/billing/rtdn-handler";
import { verifyGoogleOidc } from "@/lib/google/verify-oidc";

/**
 * 구글 플레이 실시간 개발자 알림(RTDN) 수신 — 로드맵 7.1.
 *
 * Play Console → 수익 창출 설정 → 실시간 개발자 알림에 Pub/Sub 주제를 걸고,
 * 그 주제의 **푸시 구독** 엔드포인트를 이 주소로 지정한다. 푸시 구독에는 반드시
 * **인증(OIDC 토큰)** 을 켜고, 대상(audience)을 `GOOGLE_PLAY_RTDN_AUDIENCE` 와 같게 둔다.
 *
 * 🔴 인증을 안 켜면 인터넷의 누구나 여기에 POST 할 수 있다.
 *
 * 응답 규칙(Pub/Sub 재시도와 직결):
 *  - 2xx  → 처리 완료. 다시 안 보낸다
 *  - 4xx  → 우리가 거절했다(인증 실패). 다시 보내도 소용없다
 *  - 5xx  → 지금은 못 했다. **다시 보내 달라**
 *  잠깐의 오류로 환불 알림을 2xx 로 삼키면 그 사용자는 계속 프리미엄이 된다.
 */
export async function POST(request: Request) {
  const audience = process.env.GOOGLE_PLAY_RTDN_AUDIENCE ?? "";
  const auth = await verifyGoogleOidc(
    request.headers.get("authorization"),
    audience,
  );
  if (!auth.ok) {
    // 설정이 안 된 것과 위조를 구분해 로그에 남기되, 밖으로는 이유를 알리지 않는다
    // (공격자에게 무엇이 틀렸는지 알려 줄 이유가 없다).
    console.warn(`[rtdn] rejected: ${auth.reason}`);
    return new NextResponse("unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // 읽을 수 없는 본문은 다시 보내도 같다 — 재시도시키지 않는다.
    return new NextResponse("bad request", { status: 400 });
  }

  const outcome = await handleRtdn(body);
  if (!outcome.ok) {
    console.warn(`[rtdn] retry needed: ${outcome.kind}`);
    return new NextResponse("retry", { status: 503 });
  }
  return NextResponse.json({ ok: true, kind: outcome.kind, applied: outcome.applied });
}
