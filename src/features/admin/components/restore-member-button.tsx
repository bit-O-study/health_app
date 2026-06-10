"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";

import { restoreUserAction } from "@/features/admin/admin-actions";

/** 탈퇴 회원 복구 버튼 — withdrawn_at 을 null 로 되돌린다. */
export function RestoreMemberButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function restore() {
    setError(null);
    start(async () => {
      const res = await restoreUserAction(userId);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={restore}
        disabled={pending}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={13} />
        ) : (
          <RotateCcw aria-hidden="true" size={13} />
        )}
        탈퇴 복구
      </button>
      {error ? (
        <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}