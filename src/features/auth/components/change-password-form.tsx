"use client";

import { type FormEvent, useRef, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearMustChangePasswordAction } from "@/features/auth/actions";
import { withPrefilled } from "@/lib/forms/prefilled";
import { usePrefilledInputs } from "@/lib/forms/use-prefilled-inputs";

/**
 * 임시 비밀번호로 로그인한 사용자가 새 비밀번호로 바꾸는 폼.
 * supabase.auth.updateUser 로 비번 변경 후 must_change_password 플래그를 내린다.
 */
export function ChangePasswordForm({ redirectTo }: { redirectTo: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // 하이드레이션 전에 채워진 값(자동완성 등)을 state 로 끌어올린다.
  usePrefilledInputs(
    formRef,
    { "new-password": password, "confirm-password": confirm },
    (v) => {
      if (v["new-password"] !== undefined) setPassword(v["new-password"]);
      if (v["confirm-password"] !== undefined) setConfirm(v["confirm-password"]);
    },
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // state 가 아직 비어 있을 수 있어 폼 DOM 의 실제 값을 쓴다(하이드레이션 경합).
    const filled = withPrefilled(event.currentTarget, {
      "new-password": password,
      "confirm-password": confirm,
    });
    const newPassword = filled["new-password"];

    if (newPassword.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== filled["confirm-password"]) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updErr } = await supabase.auth.updateUser({
      password: newPassword,
    });
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
      ref={formRef}
      className="app-card w-full space-y-3 p-3"
      onSubmit={handleSubmit}
    >
      <div className="space-y-1">
        <label
          className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
          htmlFor="new-password"
        >
          새 비밀번호
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          className="h-11 w-full rounded-[10px] bg-zinc-100 px-3 text-base outline-none transition focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08] dark:text-zinc-100"
          placeholder="6자 이상"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label
          className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
          htmlFor="confirm-password"
        >
          새 비밀번호 확인
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          className="h-11 w-full rounded-[10px] bg-zinc-100 px-3 text-base outline-none transition focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08] dark:text-zinc-100"
          placeholder="다시 입력"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {error ? (
        <p className="rounded-[10px] bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        data-testid="change-password-submit"
        className="app-press inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-base font-semibold text-white dark:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
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
