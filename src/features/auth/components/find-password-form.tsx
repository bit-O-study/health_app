"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isLocalEnv } from "@/features/auth/phone";
import { sendPhoneOtp, verifyPhoneOtp } from "@/features/auth/otp";
import { resetPasswordWithIdentityAction } from "@/features/auth/recover-actions";
import {
  Err,
  Notice,
  Submit,
  inputCls,
} from "@/features/auth/components/recover-ui";

type Stage = "form" | "otp" | "newpw" | "done";

export function FindPasswordForm() {
  const [stage, setStage] = useState<Stage>("form");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.trim() || !phone.trim()) {
      setError("이메일과 휴대폰 번호를 입력해 주세요.");
      return;
    }
    setBusy(true);

    // 로컬(또는 SMS 미설정)에선 OTP 를 건너뛰고 바로 새 비번 단계로.
    if (isLocalEnv()) {
      setStage("newpw");
      setBusy(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const sent = await sendPhoneOtp(supabase, phone);
    setBusy(false);
    if (sent) {
      setStage("otp");
      setNotice("인증번호를 문자로 보냈습니다. 입력해 주세요.");
    } else {
      setNotice("휴대폰 인증을 건너뛰고 진행합니다(SMS 미설정).");
      setStage("newpw");
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (otpCode.trim().length < 4) {
      setError("인증번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const ok = await verifyPhoneOtp(supabase, phone, otpCode);
    setBusy(false);
    if (!ok) {
      setError("인증번호가 올바르지 않습니다. 다시 확인해 주세요.");
      return;
    }
    setNotice(null);
    setStage("newpw");
  }

  async function handleSetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (newPw.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (newPw !== confirmPw) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setBusy(true);
    const res = await resetPasswordWithIdentityAction(email, phone, newPw);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (!res.matched) {
      setError(
        "입력하신 이메일·휴대폰과 일치하는 계정이 없습니다. 정보를 다시 확인해 주세요.",
      );
      return;
    }
    setStage("done");
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

  if (stage === "newpw") {
    return (
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-7 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <KeyRound aria-hidden="true" className="text-emerald-600" size={20} />
          <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
            새 비밀번호 설정
          </h2>
        </div>
        <form className="space-y-4" onSubmit={handleSetPassword}>
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
          <Submit busy={busy} label="비밀번호 변경" />
        </form>
      </div>
    );
  }

  if (stage === "otp") {
    return (
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-7 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="text-emerald-600" size={20} />
          <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
            휴대폰 인증
          </h2>
        </div>
        <form className="space-y-4" onSubmit={handleVerify}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {phone} 로 보낸 인증번호를 입력해 주세요.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            className={`${inputCls} text-center text-lg tracking-widest`}
            placeholder="인증번호"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
          />
          {error ? <Err>{error}</Err> : null}
          <Submit busy={busy} label="인증하고 새 비밀번호 설정" />
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-7 shadow-sm">
      <form className="space-y-4" onSubmit={handleStart}>
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
        <Submit busy={busy} label="다음" icon="search" />
      </form>
    </div>
  );
}
