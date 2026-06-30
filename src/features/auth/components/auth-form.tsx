"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, ShieldCheck, UserPlus } from "lucide-react";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isLocalEnv, normalizePhone } from "@/features/auth/phone";

type Mode = "login" | "signup";

export function AuthForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 핸드폰 OTP 단계 (운영에서 가입 후): 인증번호 입력 화면
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setOtpStep(false);
  }

  /** 가입 성공(세션 보유) 후 온보딩으로. 초대 링크 등 목적지가 있으면 이어서 전달. */
  function finishSignup() {
    const q =
      redirectTo && redirectTo !== "/"
        ? `?redirect=${encodeURIComponent(redirectTo)}`
        : "";
    router.replace(`/onboarding${q}`);
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (mode === "signup") {
      if (!name.trim()) {
        setError("이름을 입력해 주세요.");
        return;
      }
      if (!phone.trim()) {
        setError("전화번호를 입력해 주세요.");
        return;
      }
    }

    setIsSubmitting(true);
    const supabase = createSupabaseBrowserClient();

    if (mode === "signup") {
      const normPhone = normalizePhone(phone);
      // 이름·전화번호는 user_metadata 에 저장 → 온보딩 시 프로필로 복사됨.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim(), nickname: nickname.trim(), phone: normPhone },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsSubmitting(false);
        return;
      }

      if (!data.session) {
        setNotice(
          "가입 완료. 이메일 확인이 필요한 설정이면 메일 인증 후 로그인해 주세요.",
        );
        setMode("login");
        setIsSubmitting(false);
        return;
      }

      // 로컬(개발)에서는 핸드폰 인증을 건너뛴다.
      if (isLocalEnv()) {
        finishSignup();
        return;
      }

      // 운영: 핸드폰 번호로 OTP 발송 (Supabase Phone 공급자 설정 필요).
      const { error: otpErr } = await supabase.auth.updateUser({
        phone: normPhone,
      });
      if (otpErr) {
        // SMS 공급자 미설정 등으로 실패하면 인증 없이 진행(가입 자체는 완료).
        setNotice(
          "핸드폰 인증을 건너뛰고 진행합니다(SMS 설정 전). 가입은 완료됐습니다.",
        );
        finishSignup();
        return;
      }
      setOtpStep(true);
      setIsSubmitting(false);
      setNotice("인증번호를 문자로 보냈습니다. 입력해 주세요.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : signInError.message,
      );
      setIsSubmitting(false);
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (otpCode.trim().length < 4) {
      setError("인증번호를 입력해 주세요.");
      return;
    }
    setIsSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { error: vErr } = await supabase.auth.verifyOtp({
      phone: normalizePhone(phone),
      token: otpCode.trim(),
      type: "phone_change",
    });
    if (vErr) {
      setError("인증번호가 올바르지 않습니다. 다시 확인해 주세요.");
      setIsSubmitting(false);
      return;
    }
    finishSignup();
  }

  // ── 핸드폰 OTP 입력 단계 (운영) ──
  if (otpStep) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-7 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <ShieldCheck
            aria-hidden="true"
            className="text-emerald-600"
            size={20}
          />
          <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
            핸드폰 인증
          </h2>
        </div>
        <form className="space-y-4" onSubmit={verifyOtp}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {phone} 로 보낸 인증번호를 입력해 주세요.
          </p>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-center text-lg tracking-widest outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            placeholder="인증번호"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
          />
          {error ? (
            <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              {notice}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:bg-zinc-400"
          >
            {isSubmitting ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={17} />
            ) : (
              <ShieldCheck aria-hidden="true" size={17} />
            )}
            인증하고 시작하기
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-7 shadow-sm">
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 p-1">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={cn(
              "rounded-md py-2 text-sm font-semibold transition",
              mode === m
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200",
            )}
          >
            {m === "login" ? "로그인" : "회원가입"}
          </button>
        ))}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <>
            <div className="space-y-1.5">
              <label
                className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="name"
              >
                이름
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                className="h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="nickname"
              >
                닉네임 <span className="font-normal text-zinc-400">(선택)</span>
              </label>
              <input
                id="nickname"
                type="text"
                autoComplete="nickname"
                maxLength={20}
                className="h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder="그룹·랭킹에 보일 이름 (미입력 시 이름 사용)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="phone"
              >
                전화번호
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                className="h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder="010-1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </>
        ) : null}

        <div className="space-y-1.5">
          <label
            className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
            htmlFor="email"
          >
            이메일
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
            htmlFor="password"
          >
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            placeholder="6자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? (
          <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            {notice}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isSubmitting ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={17} />
          ) : mode === "login" ? (
            <LogIn aria-hidden="true" size={17} />
          ) : (
            <UserPlus aria-hidden="true" size={17} />
          )}
          {mode === "login" ? "로그인" : "회원가입"}
        </button>
      </form>

      {mode === "login" ? (
        <div className="mt-4 flex items-center justify-center gap-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          <Link href="/find-id" className="transition hover:text-zinc-800 dark:hover:text-zinc-200">
            아이디 찾기
          </Link>
          <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
            |
          </span>
          <Link
            href="/find-password"
            className="transition hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            비밀번호 찾기
          </Link>
        </div>
      ) : null}
    </div>
  );
}
