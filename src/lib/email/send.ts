import "server-only";

import nodemailer from "nodemailer";

/**
 * 이메일 발송. 우선순위:
 *   1) Gmail SMTP  — GMAIL_USER + GMAIL_APP_PASSWORD 있으면 사용(무료, 임의 수신자 OK,
 *      하루 ~500통). 앱 비밀번호(16자리) 필요. 발신주소 = GMAIL_USER.
 *   2) Resend REST — RESEND_API_KEY 있으면 사용. 단 EMAIL_FROM 이 인증된 도메인이어야
 *      임의 수신자 발송 가능(아니면 계정 소유자에게만).
 *   3) 둘 다 없으면 발송 생략(콘솔 로그 no-op) — 로컬/E2E 에서도 앱이 안 깨지게.
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

async function sendViaGmail(
  input: SendEmailInput,
  user: string,
  pass: string,
): Promise<SendEmailResult> {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    // Gmail 은 발신주소가 인증된 계정이어야 한다 — EMAIL_FROM(도메인 주소)을 쓰면 거부됨.
    await transporter.sendMail({
      from: `헬쑤 <${user}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gmail 발송 실패" };
  }
}

async function sendViaResend(
  input: SendEmailInput,
  apiKey: string,
): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
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

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  // RFC 2606 예약 도메인(example.com 등)은 실제로 배달 불가 + E2E 더미 계정이라
  // 발송을 건너뛴다(Gmail 반송/쿼터 낭비 방지). 코드 생성·저장 로직엔 영향 없음.
  if (/@example\.(com|org|net)$/i.test(input.to.trim())) {
    return { ok: true, skipped: true };
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    return sendViaGmail(input, gmailUser, gmailPass);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    return sendViaResend(input, apiKey);
  }

  // 발송 수단 없음 — 로그만(비번/코드 본문은 남기지 않는다).
  console.warn(
    `[email] 발송 수단 미설정(GMAIL_*/RESEND_API_KEY) — 발송 생략. to=${input.to} subject="${input.subject}"`,
  );
  return { ok: true, skipped: true };
}
