import "server-only";

/**
 * 이메일 발송 — Resend REST API(https://resend.com) 직접 호출(SDK 의존성 없음).
 *
 * RESEND_API_KEY 가 없으면 발송하지 않고 콘솔에 로그만 남긴다(no-op). 로컬/E2E 처럼
 * 키가 없는 환경에서도 앱이 깨지지 않게 — 기존 SMS 미설정 graceful degradation 과 동일.
 *
 * 발신 주소(EMAIL_FROM)는 Resend 에 도메인 인증이 되어 있어야 임의 수신자에게 보낼 수
 * 있다. 미설정 시 'onboarding@resend.dev' 로 폴백 — 이 주소는 Resend 계정 소유자
 * 본인에게만 발송 가능(도메인 인증 전 테스트용).
 */
const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  if (!apiKey) {
    // 키 없음 — 발송 대신 로그만(개발/E2E). 메일 본문은 남기지 않는다(비번 노출 방지).
    console.warn(
      `[email] RESEND_API_KEY 미설정 — 발송 생략. to=${input.to} subject="${input.subject}"`,
    );
    return { ok: true, skipped: true };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${detail.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "발송 실패" };
  }
}
