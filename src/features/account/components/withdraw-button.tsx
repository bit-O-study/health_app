"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserX } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { withdrawSelfAction } from "@/features/account/withdraw-actions";

/** 설정 화면의 '회원탈퇴' — 확인 후 소프트 탈퇴(데이터 유지·복구 가능) + 로그아웃. */
export function WithdrawButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doWithdraw() {
    setError(null);
    start(async () => {
      const res = await withdrawSelfAction();
      if (res.ok) {
        // 세션이 종료됐으므로 로그인 화면으로.
        router.replace("/login");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
      <button
        type="button"
        data-testid="withdraw-account"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="inline-flex h-11 items-center gap-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 text-sm font-semibold text-zinc-500 transition hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={16} />
        ) : (
          <UserX aria-hidden="true" size={16} />
        )}
        회원탈퇴
      </button>
      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
        탈퇴하면 로그아웃되고 앱을 이용할 수 없습니다. 데이터는 일정 기간 보관되어
        관리자에게 문의하면 복구할 수 있습니다.
      </p>
      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={open}
        tone="danger"
        title="정말 탈퇴하시겠어요?"
        message="회원탈퇴 후 즉시 로그아웃되며 앱에 접근할 수 없습니다. 데이터는 보관되어 관리자 복구가 가능합니다."
        confirmLabel="회원탈퇴"
        onConfirm={() => {
          setOpen(false);
          doWithdraw();
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}