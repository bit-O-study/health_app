import { randomInt } from "node:crypto";

/**
 * 임시 비밀번호 생성/메일 본문 — 순수 로직(단위테스트 대상).
 * 발송/DB 는 호출 측(서버 액션)에서.
 */

// 혼동하기 쉬운 글자(0·O, 1·l·I) 제외. 영문 대/소문자 + 숫자.
const CHARS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 임시 비밀번호 생성. 기본 10자, 영문+숫자(혼동 글자 제외). 항상 6자 이상. */
export function genTempPassword(length = 10): string {
  const len = Math.max(6, length);
  let out = "";
  for (let i = 0; i < len; i++) out += CHARS[randomInt(CHARS.length)];
  return out;
}

/** 비밀번호 찾기 이메일 인증번호 안내 메일. */
export function otpEmail(code: string): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "[헬쑤] 비밀번호 찾기 인증번호";
  const text = [
    "안녕하세요, 헬쑤입니다.",
    "",
    `비밀번호 찾기 인증번호는 ${code} 입니다. (5분 안에 입력)`,
    "",
    "본인이 요청하지 않았다면 무시해 주세요.",
  ].join("\n");
  const html = `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181b">
    <h2 style="margin:0 0 16px;font-size:18px">헬쑤 비밀번호 찾기 인증번호</h2>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6">아래 인증번호를 입력해 주세요. (5분 안에 유효)</p>
    <div style="margin:16px 0;padding:16px;border-radius:10px;background:#f4f4f5;text-align:center">
      <span style="font-size:26px;font-weight:700;letter-spacing:6px">${code}</span>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#52525b">본인이 요청하지 않았다면 이 메일을 무시해 주세요.</p>
  </div>`.trim();
  return { subject, html, text };
}

/** 임시 비밀번호 안내 메일(관리자 초기화 / 비밀번호 찾기 공용). */
export function tempPasswordEmail(tempPassword: string): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "[헬쑤] 임시 비밀번호 안내";
  const text = [
    "안녕하세요, 헬쑤입니다.",
    "",
    `요청하신 임시 비밀번호는 다음과 같습니다: ${tempPassword}`,
    "",
    "이 임시 비밀번호로 로그인하면 새 비밀번호로 변경하는 화면으로 이동합니다.",
    "본인이 요청하지 않았다면 고객센터로 문의해 주세요.",
  ].join("\n");
  const html = `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181b">
    <h2 style="margin:0 0 16px;font-size:18px">헬쑤 임시 비밀번호 안내</h2>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6">안녕하세요, 헬쑤입니다.<br/>요청하신 임시 비밀번호는 다음과 같습니다.</p>
    <div style="margin:16px 0;padding:16px;border-radius:10px;background:#f4f4f5;text-align:center">
      <span style="font-size:22px;font-weight:700;letter-spacing:2px">${tempPassword}</span>
    </div>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#52525b">이 임시 비밀번호로 로그인하면 새 비밀번호로 변경하는 화면으로 이동합니다.</p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#52525b">본인이 요청하지 않았다면 고객센터로 문의해 주세요.</p>
  </div>`.trim();
  return { subject, html, text };
}
