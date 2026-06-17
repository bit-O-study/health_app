"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { resetMemberPasswordAction } from "@/features/admin/admin-actions";

export function MemberPasswordReset({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);
  const [copied, setCopied] = useState(false);

  function doReset() {
    setError(null);
    setTemp(null);
    setNote(null);
    start(async () => {
      const res = await resetMemberPasswordAction(userId, email);
      if (res.ok) {
        setTemp(res.tempPassword);
        setEmailed(res.emailed);
        setNote(res.note ?? null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  async function copy() {
    if (!temp) return;
    try {
      await navigator.clipboard.writeText(temp);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 권한 없으면 무시 — 사용자가 직접 선택복사 */
    }
  }

  const btn =
    "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-semibold transition disabled:opacity-50";

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => setAsk(true)}
        data-testid="reset-password"
        className={`${btn} border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 hover:bg-sky-100`}
      >
        {pending ? (
          <Loader2 aria-hidden="true" size={12} className="animate-spin" />
        ) : (
          <KeyRound aria-hidden="true" size={12} />
        )}
        비밀번호 초기화
      </button>

      {error ? (
        <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : null}

      {temp ? (
        <div
          data-testid="temp-password-box"
          className="rounded-md border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 px-2 py-1.5"
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500">임시 비밀번호</span>
            <code
              data-testid="temp-password"
              className="select-all font-mono text-xs font-bold tracking-wider text-sky-800 dark:text-sky-300"
            >
              {temp}
            </code>
            <button
              type="button"
              onClick={copy}
              className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-400"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "복사됨" : "복사"}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            {emailed
              ? `${email} 로 메일을 보냈습니다.`
              : (note ?? "메일을 보내지 못했습니다.")}
          </p>
        </div>
      ) : null}

      <ConfirmDialog
        open={ask}
        title="비밀번호 초기화"
        message="이 회원의 비밀번호를 임시 비밀번호로 초기화할까요? 초기화 후 회원은 다음 로그인 시 새 비밀번호로 변경해야 합니다."
        confirmLabel="초기화"
        tone="danger"
        onConfirm={() => {
          setAsk(false);
          doReset();
        }}
        onCancel={() => setAsk(false)}
      />
    </div>
  );
}
