"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import {
  addDebugAccountAction,
  removeDebugAccountAction,
} from "@/features/admin/admin-actions";

/**
 * 관리자용 — '디버그 계정'(이메일) 지정. 여기에 등록된 계정은 관리자가 아니어도
 * 켜진 디버그 기능을 앱에서 볼 수 있다(테스트폰 현장 진단용). 관리자는 항상 디버그 계정.
 */
export function DebugAccountsManager({ accounts }: { accounts: string[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    start(async () => {
      const res = await addDebugAccountAction(email);
      if (res.ok) {
        setEmail("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function remove(e: string) {
    setError(null);
    start(async () => {
      const res = await removeDebugAccountAction(e);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          aria-label="디버그 계정 이메일"
          type="email"
          inputMode="email"
          placeholder="tester@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          disabled={pending}
          className="h-10 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
        />
        <button
          type="button"
          onClick={add}
          disabled={pending || email.trim() === ""}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={15} />
          ) : (
            <Plus aria-hidden="true" size={15} />
          )}
          계정 추가
        </button>
      </div>
      {error ? (
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {accounts.length === 0 ? (
        <p className="text-xs text-zinc-500">
          지정된 디버그 계정이 없습니다. (관리자 계정은 항상 디버그 기능을 볼 수 있습니다.)
        </p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li
              key={a}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {a}
              </p>
              <button
                type="button"
                aria-label="디버그 계정 해제"
                onClick={() => remove(a)}
                disabled={pending}
                title="디버그 계정 해제"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/40"
              >
                <Trash2 aria-hidden="true" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
