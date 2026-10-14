"use client";

import { useCallback, useState, type ReactNode } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";

type Request = {
  message: string;
  title?: string;
  confirmLabel?: string;
  tone?: "default" | "danger";
  resolve: (ok: boolean) => void;
};

/**
 * `window.confirm` 대신 쓰는 앱 확인창(2026-10-14) — `const [confirm, dialog] = useConfirm();`
 * `if (!(await confirm("지울까요?", { tone: "danger" }))) return;` 처럼 쓰고, `dialog` 를 화면 어딘가에 둔다.
 *
 * 앱(안드로이드 WebView)에서 브라우저 기본 창은 주소가 박힌 어색한 창으로 뜨거나 아예 막힐 수 있다.
 */
export function useConfirm(): [
  (message: string, opts?: { title?: string; confirmLabel?: string; tone?: "default" | "danger" }) => Promise<boolean>,
  ReactNode,
] {
  const [req, setReq] = useState<Request | null>(null);
  const confirm = useCallback(
    (message: string, opts: { title?: string; confirmLabel?: string; tone?: "default" | "danger" } = {}) =>
      new Promise<boolean>((resolve) => setReq({ message, ...opts, resolve })),
    [],
  );
  const close = (ok: boolean) => {
    req?.resolve(ok);
    setReq(null);
  };
  const dialog = (
    <ConfirmDialog
      open={req !== null}
      title={req?.title}
      message={req?.message ?? ""}
      confirmLabel={req?.confirmLabel}
      tone={req?.tone}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );
  return [confirm, dialog];
}
