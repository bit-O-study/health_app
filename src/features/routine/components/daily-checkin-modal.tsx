"use client";

import { useCallback, useEffect, useId, useRef, useState, type ComponentProps } from "react";
import { HeartPulse, X } from "lucide-react";
import { DailyCheckinCard } from "./daily-checkin-card";
import { useBackClose } from "@/lib/platform/use-back-close";

type Props = Omit<ComponentProps<typeof DailyCheckinCard>, "onSaved"> & { userId: string };

/** One automatic prompt per account/day; saved check-ins remain server-owned. */
export function DailyCheckinModal({ userId, ...props }: Props) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(props.initial !== null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = useId();
  const storageKey = `helssu.checkin-dismissed.${userId}.${props.today}`;
  const remember = useCallback(() => {
    try { window.localStorage.setItem(storageKey, "1"); } catch { /* Storage can be unavailable. */ }
  }, [storageKey]);
  const close = useCallback(() => { remember(); setOpen(false); }, [remember]);
  useBackClose(open, close);

  useEffect(() => {
    if (props.initial) return;
    try { if (window.localStorage.getItem(storageKey) === "1") return; } catch { /* Still allow check-in. */ }
    // The persisted dismissal is available only after mounting in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [storageKey, props.initial]);

  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fallbackFocus = trigger.current;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected && previous !== document.body) previous.focus();
      else fallbackFocus?.focus();
    };
  }, [open]);

  return <>
    <div className="flex justify-end">
      <button ref={trigger} type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-brand" aria-haspopup="dialog">
        <HeartPulse size={16} aria-hidden="true" />{saved ? "컨디션 다시 확인" : "컨디션 체크"}
      </button>
    </div>
    <dialog ref={dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); close(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-xl backdrop:bg-black/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" data-testid="daily-checkin-modal">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div><h2 id={title} className="text-lg font-bold">운동 전, 몸 상태를 확인해요</h2><p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">수면 · 근육통 · 기운, 세 가지만 체크해요.</p></div>
        <button type="button" aria-label="컨디션 모달 닫기" onClick={close} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"><X size={20} aria-hidden="true" /></button>
      </header>
      <DailyCheckinCard {...props} onSaved={() => { setSaved(true); remember(); }} />
      <button type="button" onClick={close} className="mt-3 min-h-11 w-full rounded-full border border-zinc-200 px-4 text-sm font-semibold dark:border-zinc-700">{saved ? "운동 화면으로" : "나중에 체크할게요"}</button>
    </dialog>
  </>;
}
