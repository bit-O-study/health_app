"use client";

import { useEffect, useId, useRef } from "react";

import { createModalHistory } from "@/lib/platform/modal-history";

/**
 * 모달이 떠 있을 때 뒤로가기를 누르면 **모달만** 닫는다(화면은 그대로).
 *
 *   useBackClose(open, () => setOpen(false));
 *   // 열렸을 때만 렌더되는 모달 컴포넌트 안에서는: useBackClose(true, onClose);
 *
 * 로직·주의점은 `modal-history.ts` 머리말 참고.
 */
type ModalHistory = ReturnType<typeof createModalHistory>;

let shared: ModalHistory | null = null;

function getModalHistory(): ModalHistory | null {
  if (typeof window === "undefined") return null;
  if (!shared) {
    const created = createModalHistory(window.history, {
      set: (fn) => window.setTimeout(fn, 0),
      clear: (handle) => window.clearTimeout(handle as number),
    });
    window.addEventListener("popstate", (e) => created.onPopState(e.state));
    shared = created;
  }
  return shared;
}

export function useBackClose(open: boolean, onClose: () => void): void {
  const key = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const mh = getModalHistory();
    if (!mh) return;
    mh.open(key, () => onCloseRef.current());
    return () => mh.release(key);
  }, [open, key]);
}
