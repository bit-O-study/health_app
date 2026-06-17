"use client";

import { Loader2, Search, ShieldCheck } from "lucide-react";

/** 아이디/비밀번호 찾기 폼 공용 UI 조각. */

export const inputCls =
  "h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

export function Err({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">
      {children}
    </p>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
      {children}
    </p>
  );
}

export function Submit({
  busy,
  label,
  icon = "shield",
}: {
  busy: boolean;
  label: string;
  icon?: "shield" | "search";
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
    >
      {busy ? (
        <Loader2 aria-hidden="true" className="animate-spin" size={17} />
      ) : icon === "search" ? (
        <Search aria-hidden="true" size={17} />
      ) : (
        <ShieldCheck aria-hidden="true" size={17} />
      )}
      {label}
    </button>
  );
}
