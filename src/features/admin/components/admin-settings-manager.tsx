"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import {
  addAdminAction,
  removeAdminAction,
} from "@/features/admin/admin-actions";
import type { AdminRow } from "@/features/admin/admin";

export function AdminSettingsManager({ admins }: { admins: AdminRow[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    start(async () => {
      const res = await addAdminAction(email);
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
      const res = await removeAdminAction(e);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <input
          aria-label="관리자 이메일"
          type="email"
          inputMode="email"
          placeholder="member@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          disabled={pending}
          className="h-10 flex-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm text-zinc-800 dark:text-zinc-200"
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
          관리자 추가
        </button>
      </div>
      {error ? (
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {admins.map((a) => (
          <li
            key={a.email}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {a.email}
              </p>
              <p className="text-xs text-zinc-500">
                지정일 {a.createdAt.slice(0, 10)}
              </p>
            </div>
            <button
              type="button"
              aria-label="관리자 해제"
              onClick={() => remove(a.email)}
              disabled={pending || admins.length <= 1}
              title={admins.length <= 1 ? "마지막 관리자는 해제 불가" : "관리자 해제"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 aria-hidden="true" size={15} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
