"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export function AuthForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
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

    setIsSubmitting(true);
    const supabase = createSupabaseBrowserClient();

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsSubmitting(false);
        return;
      }

      // 이메일 확인이 켜져 있으면 세션이 없습니다.
      if (!data.session) {
        setNotice(
          "가입 완료. 이메일 확인이 필요한 설정이면 메일 인증 후 로그인해 주세요.",
        );
        setMode("login");
        setIsSubmitting(false);
        return;
      }

      // 신규 가입자는 항상 온보딩(성별·경력 → 추천 루틴)으로.
      router.replace("/onboarding");
      router.refresh();
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

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-7 shadow-sm">
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1">
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
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
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

      <p className="mt-4 text-center text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        이메일·비밀번호 자체 로그인만 지원합니다. 세션은 access·refresh 토큰으로
        안전하게 유지됩니다.
      </p>
    </div>
  );
}
