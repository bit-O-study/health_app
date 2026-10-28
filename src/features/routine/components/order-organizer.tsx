"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowUpDown, Loader2, Lock, X } from "lucide-react";

import { useBackClose } from "@/lib/platform/use-back-close";
import { applyTodayOrderAction, clearTodayOrderAction } from "@/features/routine/order-actions";

/** 서버(today-exercises)가 계산해 내려주는 순서 정리 미리보기 — 이름·부위까지 붙여서. */
export type OrderPreview = {
  ids: string[];
  rows: { id: string; name: string; part: string; partLabel: string; moved: number; reason: string | null }[];
  streaksBefore: number;
  streaksAfter: number;
  costBefore: number;
  costAfter: number;
  singlePart: boolean;
};

const PART_DOT: Record<string, string> = {
  chest: "bg-orange-500",
  back: "bg-sky-500",
  shoulder: "bg-violet-500",
  arm: "bg-amber-500",
  lower: "bg-brand",
  core: "bg-zinc-400",
};

/**
 * 본운동 제목 옆 '순서 정리'(라이트, 2026-10-28). 같은 부위가 연달아 있으면 위에 한 줄 안내.
 * 정리한 순서는 오늘만 — 루틴은 그대로(원칙 #2). 무료 회원은 결과 숫자까지만 보고 잠금 안내.
 */
export function OrderOrganizer({
  preview,
  full,
  applied,
  warn,
}: {
  preview: OrderPreview | null;
  full: boolean;
  /** 오늘 이미 정리한 순서를 쓰는 중 — '원래 순서로' 를 보여 준다. */
  applied: boolean;
  /** 같은 부위가 3개 이상 연달아 있으면 그 부위·개수. */
  warn: { partLabel: string; length: number } | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  useBackClose(open, () => {
    if (!pending) setOpen(false);
  });
  if (!preview && !applied) return null;

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    start(async () => {
      const r = await action();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      // 시트의 history.back() 이 갱신된 서버 화면을 되돌리지 않게 문서를 다시 읽는다(today-focus-menu 와 같음).
      window.location.reload();
    });
  }

  return (
    <>
      {warn && preview && !applied ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="order-warn"
          className="app-card mb-2 flex w-full items-center justify-between gap-2 bg-orange-50 px-3 py-2 text-left text-sm text-orange-900 dark:bg-orange-500/10 dark:text-orange-200"
        >
          <span>{warn.partLabel} 운동 {warn.length}개가 연달아 있어요</span>
          <span className="shrink-0 text-xs font-semibold">순서 정리 →</span>
        </button>
      ) : null}

      {/* 안내 줄로 쓰는 경우(warn)엔 작은 버튼을 다시 그리지 않는다 — 제목 옆에 이미 있다. */}
      {warn ? null : <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="order-organize"
        className="app-press inline-flex h-7 items-center gap-1 rounded-full bg-zinc-100 px-2.5 text-xs font-semibold text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
      >
        {full ? <ArrowUpDown aria-hidden="true" size={13} /> : <Lock aria-hidden="true" size={12} />}
        {applied ? "오늘 순서 정리됨" : "순서 정리"}
      </button>}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            role="dialog"
            aria-label="운동 순서 정리"
            className="app-card max-h-[85dvh] w-full max-w-md overflow-y-auto bg-[var(--surface-strong)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-100">운동 순서 정리</h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => !pending && setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            {applied && !preview ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-600 dark:text-zinc-300">오늘은 정리한 순서로 운동해요. 내일은 루틴 원래 순서로 돌아가요.</p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(clearTodayOrderAction)}
                  className="app-press flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-800 dark:border-white/10 dark:text-zinc-100"
                >
                  {pending ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : null}
                  원래 순서로 되돌리기
                </button>
              </div>
            ) : preview && !full ? (
              <div className="space-y-3 text-center" data-testid="order-locked">
                <Lock aria-hidden="true" size={18} className="mx-auto text-zinc-400" />
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">같은 부위가 연달아 오지 않게 정리해요</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  지금 순서: 같은 부위 연속 {preview.streaksBefore}번 · 정리하면 {preview.streaksAfter}번
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">라이트에서 쓸 수 있어요 · 월 990원</p>
                <Link
                  href="/settings/subscription"
                  className="app-press flex h-11 w-full items-center justify-center rounded-xl bg-brand text-sm font-semibold text-white dark:text-zinc-950"
                >
                  라이트 알아보기
                </Link>
              </div>
            ) : preview ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100" data-testid="order-streaks">
                    같은 부위 연속 {preview.streaksBefore} → {preview.streaksAfter}
                  </p>
                  <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    겹침 {preview.costBefore} → {preview.costAfter}
                  </p>
                </div>
                {preview.singlePart ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">오늘은 한 부위만 있어서 세부 부위를 번갈아 배치했어요.</p>
                ) : null}
                <ol className="space-y-1" data-testid="order-preview">
                  {preview.rows.map((r, i) => (
                    <li key={r.id} className="flex items-center gap-2 rounded-lg bg-zinc-50 px-2.5 py-2 text-sm dark:bg-white/[0.04]">
                      <span className="w-4 text-xs tabular-nums text-zinc-400">{i + 1}</span>
                      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${PART_DOT[r.part] ?? "bg-zinc-400"}`} />
                      <span className="min-w-0 flex-1 truncate text-zinc-900 dark:text-zinc-100">{r.name}</span>
                      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                        {r.partLabel}
                        {r.moved !== 0 ? ` · ${r.moved < 0 ? "↑" : "↓"}${Math.abs(r.moved)}` : ""}
                        {r.reason ? ` · ${r.reason}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">오늘만 바뀌어요. 내일은 루틴 원래 순서예요. 끝낸 운동은 자리를 지켜요.</p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => applyTodayOrderAction(preview.ids))}
                  data-testid="order-apply"
                  className="app-press flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white disabled:opacity-60 dark:text-zinc-950"
                >
                  {pending ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : null}
                  오늘만 이 순서로
                </button>
                {applied ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(clearTodayOrderAction)}
                    className="h-10 w-full text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    원래 순서로 되돌리기
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setOpen(false)}
                    className="h-10 w-full text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    그대로 둘게요
                  </button>
                )}
              </div>
            ) : null}
            {error ? <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
