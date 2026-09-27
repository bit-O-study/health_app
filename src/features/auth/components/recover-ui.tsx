"use client";

import { Loader2, Search, ShieldCheck } from "lucide-react";

/**
 * 로그인·가입·아이디/비밀번호 찾기 폼 공용 UI 조각.
 * 아이폰 입력칸(테두리 없는 옅은 회색 바탕) + 알약 버튼 — 2026-09-16 8단계 촘촘하게.
 */

export const inputCls =
  "h-11 w-full rounded-[10px] bg-zinc-100 px-3 text-base outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08] dark:text-zinc-100";

/** 입력칸 위 작은 라벨. */
export const labelCls = "block px-1 pb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400";

/** 전체 폭 주 버튼(알약). */
export const primaryBtnCls =
  "app-press inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-950";

export function Err({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[10px] bg-danger/10 px-3 py-2 text-sm text-danger">
      {children}
    </p>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[10px] bg-brand-soft px-3 py-2 text-sm text-brand">
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
    <button type="submit" disabled={busy} className={primaryBtnCls}>
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
