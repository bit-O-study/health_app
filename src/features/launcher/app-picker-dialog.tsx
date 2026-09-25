"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useBackClose } from "@/lib/platform/use-back-close";

export function AppPickerDialog({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useBackClose(true, onClose);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} aria-labelledby="app-picker-title" className="m-auto max-h-[80dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-3xl border border-line bg-surface p-5 text-foreground shadow-2xl backdrop:bg-black/60" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }}>
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 id="app-picker-title" className="text-base font-semibold">앱 추가</h2>
      <button type="button" aria-label="앱 추가 닫기" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted"><X size={22} /></button>
    </div>
    {children}
  </dialog>;
}