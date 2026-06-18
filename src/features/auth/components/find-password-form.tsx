"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, MailCheck } from "lucide-react";

import {
  requestEmailOtpAction,
  verifyEmailOtpAndResetAction,
} from "@/features/auth/recover-actions";
import {
  Err,
  Notice,
  Submit,
  inputCls,
} from "@/features/auth/components/recover-ui";

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

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.trim() || !phone.trim()) {
      setError("이메일과 휴대폰 번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    const res = await requestEmailOtpAction(email, phone);
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
    setNotice(`${email} 로 인증번호를 보냈습니다. 메일을 확인해 주세요.`);
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
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-7 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 aria-hidden="true" className="text-emerald-600" size={20} />
          <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
            비밀번호 변경 완료
          </h2>
        </div>
        <p
          data-testid="find-pw-done"
          className="mb-5 text-sm leading-6 text-zinc-600 dark:text-zinc-400"
        >
          새 비밀번호로 변경되었습니다. 변경한 비밀번호로 로그인해 주세요.
        </p>
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          로그인하기
        </Link>
      </div>
    );
  }

  if (stage === "verify") {
    return (
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-7 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <MailCheck aria-hidden="true" className="text-emerald-600" size={20} />
          <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
            인증번호 입력 & 새 비밀번호
          </h2>
        </div>
        <form className="space-y-4" onSubmit={handleVerify}>
          <div className="space-y-1.5">
            <label
              className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="otp-code"
            >
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
          <div className="space-y-1.5">
            <label
              className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="new-password"
            >
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
          <div className="space-y-1.5">
            <label
              className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="confirm-password"
            >
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
            className="w-full text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 transition hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50"
          >
            인증번호 다시 받기
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-7 shadow-sm">
      <form className="space-y-4" onSubmit={handleRequest}>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" htmlFor="email">
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
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" htmlFor="phone">
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
    </div>
  );
}
