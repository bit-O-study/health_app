"use client";

import { type FormEvent, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearMustChangePasswordAction } from "@/features/auth/actions";

/**
 * 임시 비밀번호로 로그인한 사용자가 새 비밀번호로 바꾸는 폼.
 * supabase.auth.updateUser 로 비번 변경 후 must_change_password 플래그를 내린다.
 */
export function ChangePasswordForm({ redirectTo }: { redirectTo: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      setError(
        updErr.message.includes("should be different")
          ? "임시 비밀번호와 다른 새 비밀번호를 입력해 주세요."
          : updErr.message,
      );
      setIsSubmitting(false);
      return;
    }

    const cleared = await clearMustChangePasswordAction();
    if (!cleared.ok) {
      setError(cleared.error);
      setIsSubmitting(false);
      return;
    }

    // 비밀번호 변경으로 세션 토큰이 회전한 직후라 soft navigation 이 누락될 수 있어
    // 하드 이동으로 미들웨어가 새 쿠키·플래그 상태로 다시 판정하게 한다.
    window.location.assign(redirectTo);
  }

  return (
    <form
      className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-7 shadow-sm"
      onSubmit={handleSubmit}
    >
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
          className="h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          placeholder="6자 이상"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          className="h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          placeholder="다시 입력"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        data-testid="change-password-submit"
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {isSubmitting ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={17} />
        ) : (
          <KeyRound aria-hidden="true" size={17} />
        )}
        비밀번호 변경
      </button>
    </form>
  );
}
