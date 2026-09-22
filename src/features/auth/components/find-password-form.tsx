"use client";

import { type FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import {
  requestEmailOtpAction,
  verifyEmailOtpAndResetAction,
} from "@/features/auth/recover-actions";
import {
  Err,
  Notice,
  Submit,
  inputCls,
  labelCls,
  primaryBtnCls,
} from "@/features/auth/components/recover-ui";
import { withPrefilled } from "@/lib/forms/prefilled";
import { usePrefilledInputs } from "@/lib/forms/use-prefilled-inputs";

type Stage = "form" | "verify" | "done";

const VERIFY_MSG: Record<string, string> = {
  invalid: "인증번호가 올바르지 않습니다. 다시 확인해 주세요.",
  expired: "인증번호가 만료되었습니다. 다시 받아 주세요.",
  locked: "인증 시도가 많아 잠겼습니다. 인증번호를 다시 받아 주세요.",
  nomatch: "입력하신 이메일·휴대폰과 일치하는 계정이 없습니다.",
};

export function FindPasswordForm() {
  const [stage, setStage] = useState<Stage>("form");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // 하이드레이션 전에 채워진 값(빠른 타이핑·자동완성)을 state 로 끌어올린다.
  usePrefilledInputs(formRef, { email, phone }, (v) => {
    if (v.email !== undefined) setEmail(v.email);
    if (v.phone !== undefined) setPhone(v.phone);
  });

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    // state 가 아직 비어 있을 수 있어 폼 DOM 의 실제 값을 쓴다(하이드레이션 경합).
    const filled = withPrefilled(event.currentTarget, { email, phone });
    if (!filled.email.trim() || !filled.phone.trim()) {
      setError("이메일과 휴대폰 번호를 입력해 주세요.");
      return;
    }
    // 다음 단계(인증번호 확인)에서 같은 값을 다시 쓰므로 state 도 맞춰 둔다.
    setEmail(filled.email);
    setPhone(filled.phone);
    setBusy(true);
    const res = await requestEmailOtpAction(filled.email, filled.phone);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (!res.matched) {
      setError("입력하신 이메일·휴대폰과 일치하는 계정이 없습니다.");
      return;
    }
    setStage("verify");
    setNotice(`${filled.email} 로 인증번호를 보냈습니다. 메일을 확인해 주세요.`);
  }

  async function handleResend() {
    setError(null);
    setBusy(true);
    const res = await requestEmailOtpAction(email, phone);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNotice(`${email} 로 인증번호를 다시 보냈습니다.`);
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (code.trim().length < 4) {
      setError("인증번호를 입력해 주세요.");
      return;
    }
    if (newPw.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (newPw !== confirmPw) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setBusy(true);
    const res = await verifyEmailOtpAndResetAction(email, phone, code, newPw);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.status === "ok") {
      setStage("done");
      return;
    }
    setError(VERIFY_MSG[res.status] ?? "인증에 실패했습니다.");
  }

  if (stage === "done") {
    return (
      <div className="w-full space-y-3">
        <div className="app-card flex items-start gap-2 px-3 py-3">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-brand" size={18} />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
              비밀번호 변경 완료
            </h2>
            <p
              data-testid="find-pw-done"
              className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400"
            >
              새 비밀번호로 변경되었습니다. 변경한 비밀번호로 로그인해 주세요.
            </p>
          </div>
        </div>
        <Link href="/login" className={primaryBtnCls}>
          로그인하기
        </Link>
      </div>
    );
  }

  if (stage === "verify") {
    return (
      <form className="w-full space-y-3" onSubmit={handleVerify}>
        <div>
          <label className={labelCls} htmlFor="otp-code">
            이메일 인증번호
          </label>
          <input
            id="otp-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            className={`${inputCls} text-center text-lg tracking-widest`}
            placeholder="6자리"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="new-password">
            새 비밀번호
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            className={inputCls}
            placeholder="6자 이상"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="confirm-password">
            새 비밀번호 확인
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            className={inputCls}
            placeholder="다시 입력"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
          />
        </div>
        {error ? <Err>{error}</Err> : null}
        {notice ? <Notice>{notice}</Notice> : null}
        <Submit busy={busy} label="비밀번호 변경" />
        <button
          type="button"
          disabled={busy}
          onClick={handleResend}
          className="h-9 w-full text-center text-sm font-semibold text-brand transition active:opacity-60 disabled:opacity-50"
        >
          인증번호 다시 받기
        </button>
      </form>
    );
  }

  return (
    <form ref={formRef} className="w-full space-y-3" onSubmit={handleRequest}>
      <div>
        <label className={labelCls} htmlFor="email">
          아이디(이메일)
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={inputCls}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="phone">
          전화번호
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          className={inputCls}
          placeholder="010-1234-5678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      {error ? <Err>{error}</Err> : null}
      {notice ? <Notice>{notice}</Notice> : null}
      <Submit busy={busy} label="인증번호 받기" icon="search" />
    </form>
  );
}
