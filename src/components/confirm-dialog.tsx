"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

/**
 * 인앱 confirm 다이얼로그. 브라우저 네이티브 confirm() 의 'localhost:3000 says'
 * 같은 도메인 prefix 없이 깔끔한 모달.
 *
 * 사용:
 *   const [open, setOpen] = useState(false);
 *   <ConfirmDialog
 *     open={open}
 *     title="..."
 *     message="..."
 *     confirmLabel="..."
 *     onConfirm={() => { ...; setOpen(false); }}
 *     onCancel={() => setOpen(false)}
 *   />
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  tone = "default",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger 면 확인 버튼이 red, default 면 emerald */
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // createPortal 은 client only — mount 후 한 번만 활성화. 의도된 setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // ESC 키 = 취소
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!mounted || !open) return null;

  const confirmBtn =
    tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-500"
      : "bg-emerald-600 text-white hover:bg-emerald-500";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              tone === "danger"
                ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                : "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
            }`}
          >
            <AlertTriangle aria-hidden="true" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            {title ? (
              <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                {title}
              </h3>
            ) : null}
            <p
              className={`text-sm leading-6 text-zinc-700 dark:text-zinc-300 ${title ? "mt-1" : ""}`}
            >
              {message}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition ${confirmBtn}`}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
