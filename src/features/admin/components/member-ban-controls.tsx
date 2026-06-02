"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Clock, Loader2, RotateCcw } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  banUserAction,
  suspendUserAction,
  unbanUserAction,
} from "@/features/admin/admin-actions";
import type { AdminActionResult } from "@/features/admin/admin-actions";
import type { BanState } from "@/features/admin/ban";

export function MemberBanControls({
  userId,
  state,
}: {
  userId: string;
  state: BanState;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [askBan, setAskBan] = useState(false);
  const [reason, setReason] = useState("");

  function run(fn: () => Promise<AdminActionResult>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        setReason("");
        router.refresh();
      } else setError(res.error);
    });
  }

  const r = () => reason.trim() || undefined;
  const btn =
    "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-semibold transition disabled:opacity-50";

  return (
    <div className="flex flex-col gap-1">
      <input
        type="text"
        value={reason}
        maxLength={200}
        placeholder="정지 사유 (선택)"
        onChange={(e) => setReason(e.target.value)}
        disabled={pending}
        className="h-7 w-44 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-xs text-zinc-800 dark:text-zinc-200"
      />
      <div className="flex flex-wrap items-center gap-1">
        {pending ? (
          <Loader2 aria-hidden="true" size={13} className="animate-spin text-zinc-400" />
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => suspendUserAction(userId, 7, r()))}
          className={`${btn} border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100`}
        >
          <Clock aria-hidden="true" size={12} />
          7일
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => suspendUserAction(userId, 30, r()))}
          className={`${btn} border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100`}
        >
          <Clock aria-hidden="true" size={12} />
          30일
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setAskBan(true)}
          className={`${btn} border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 hover:bg-red-100`}
        >
          <Ban aria-hidden="true" size={12} />
          영구정지
        </button>
        {state !== "active" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => unbanUserAction(userId))}
            className={`${btn} border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100`}
          >
            <RotateCcw aria-hidden="true" size={12} />
            해제
          </button>
        ) : null}
      </div>
      {error ? (
        <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : null}

      <ConfirmDialog
        open={askBan}
        title="영구 정지"
        message="이 회원을 영구 정지할까요? 해제 전까지 앱을 이용할 수 없습니다."
        confirmLabel="영구 정지"
        tone="danger"
        onConfirm={() => {
          setAskBan(false);
          run(() => banUserAction(userId, r()));
        }}
        onCancel={() => setAskBan(false)}
      />
    </div>
  );
}
