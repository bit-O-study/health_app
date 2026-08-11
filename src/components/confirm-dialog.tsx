"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { nextDialogFocusIndex } from "@/components/dialog-focus";

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
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // createPortal 은 client only — mount 후 한 번만 활성화. 의도된 setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // 배경은 포커스/포인터/보조기술 탐색 대상에서 제외하고, 닫힐 때 기존
  // 포커스를 복원한다. 포털 overlay 자체만 body에서 활성 상태로 남긴다.
  useEffect(() => {
    if (!mounted || !open || !overlayRef.current) return;
    const overlay = overlayRef.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const background = Array.from(document.body.children)
      .filter((element): element is HTMLElement =>
        element instanceof HTMLElement && element !== overlay,
      )
      .map((element) => ({ element, inert: element.inert }));
    background.forEach(({ element }) => {
      element.inert = true;
    });
    confirmButtonRef.current?.focus();

    return () => {
      background.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [mounted, open]);

  // ESC 키 = 취소, Tab/Shift+Tab = 모달 내부 순환
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const current = focusable.indexOf(document.activeElement as HTMLElement);
      const next = nextDialogFocusIndex(current, focusable.length, e.shiftKey);
      if (next >= 0) {
        e.preventDefault();
        focusable[next].focus();
      }
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
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={panelRef}
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
              className={`whitespace-pre-line text-sm leading-6 text-zinc-700 dark:text-zinc-300 ${title ? "mt-1" : ""}`}
            >
              {message}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          {cancelLabel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              {cancelLabel}
            </button>
          ) : null}
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition ${confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
