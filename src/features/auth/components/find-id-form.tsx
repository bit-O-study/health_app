"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isLocalEnv } from "@/features/auth/phone";
import { sendPhoneOtp, verifyPhoneOtp } from "@/features/auth/otp";
import { findLoginEmailAction } from "@/features/auth/recover-actions";
import {
  Err,
  Notice,
  Submit,
  inputCls,
} from "@/features/auth/components/recover-ui";

export function FindIdForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [foundEmail, setFoundEmail] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runFind() {
    const res = await findLoginEmailAction(name, phone);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOtpStep(false);
    setDone(true);
    setFoundEmail(res.email);
  }

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!name.trim() || !phone.trim()) {
      setError("이름과 휴대폰 번호를 입력해 주세요.");
      return;
    }
    setBusy(true);

    if (isLocalEnv()) {
      await runFind();
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const sent = await sendPhoneOtp(supabase, phone);
    if (sent) {
      setOtpStep(true);
      setBusy(false);
      setNotice("인증번호를 문자로 보냈습니다. 입력해 주세요.");
    } else {
      setNotice("휴대폰 인증을 건너뛰고 진행합니다(SMS 미설정).");
      await runFind();
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
    if (!ok) {
      setError("인증번호가 올바르지 않습니다. 다시 확인해 주세요.");
      setBusy(false);
      return;
    }
    await runFind();
  }

  if (done) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-7 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-zinc-950 dark:text-zinc-100">
          아이디 찾기 결과
        </h2>
        {foundEmail ? (
          <>
            <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
              입력하신 정보와 일치하는 아이디(이메일)입니다.
            </p>
            <div className="mb-5 rounded-md bg-zinc-100 dark:bg-zinc-900 px-3 py-3 text-center">
              <span
                data-testid="found-email"
                className="select-all text-sm font-bold text-zinc-900 dark:text-zinc-100"
              >
                {foundEmail}
              </span>
            </div>
          </>
        ) : (
          <p
            data-testid="find-id-none"
            className="mb-5 rounded-md bg-amber-50 dark:bg-amber-950/40 px-3 py-3 text-sm text-amber-700 dark:text-amber-400"
          >
            입력하신 정보와 일치하는 아이디가 없습니다.
          </p>
        )}
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          로그인하기
        </Link>
      </div>
    );
  }

  if (otpStep) {
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
          <Submit busy={busy} label="인증하고 아이디 찾기" />
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-7 shadow-sm">
      <form className="space-y-4" onSubmit={handleStart}>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" htmlFor="name">
            이름
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className={inputCls}
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
        <Submit busy={busy} label="아이디 찾기" icon="search" />
      </form>
    </div>
  );
}
