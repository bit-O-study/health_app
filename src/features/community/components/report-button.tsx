"use client";

import { useState, useTransition } from "react";

import { useBackClose } from "@/lib/platform/use-back-close";
import { Flag, Loader2, X } from "lucide-react";

import {
  REPORT_REASONS,
  type ReportTargetKind,
} from "@/features/community/report";
import { reportContentAction } from "@/features/community/report-actions";

/**
 * 게시글/댓글 신고 버튼 — 탭하면 사유 선택 시트. 신고는 관리자페이지에 쌓인다.
 * className 으로 트리거 버튼 스타일을 주입(작은 아이콘/텍스트 등 상황별).
 */
export function ReportButton({
  targetKind,
  targetId,
  targetUserId,
  targetAuthor,
  targetPreview,
  className,
  label,
  iconSize = 15,
  onClose,
}: {
  targetKind: ReportTargetKind;
  targetId: string;
  targetUserId?: string | null;
  targetAuthor?: string | null;
  targetPreview?: string | null;
  className?: string;
  label?: string;
  iconSize?: number;
  /** 신고 시트가 닫힐 때(접수·취소 모두) — 메뉴 안에 둔 버튼이 메뉴를 닫는 데 쓴다. */
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  // 시트를 닫는 곳은 전부 이걸로 — 부모(메뉴)에게 닫혔다고 알린다.
  const closeSheet = () => {
    setOpen(false);
    onClose?.();
  };
  useBackClose(open, () => {
    if (!pending) closeSheet();
  });

  function submit(reason: string) {
    start(async () => {
      const r = await reportContentAction({
        targetKind,
        targetId,
        targetUserId,
        targetAuthor,
        targetPreview,
        reason,
      });
      if (r.ok) {
        setDone(true);
        setTimeout(() => {
          closeSheet();
          setDone(false);
        }, 1200);
      } else {
        alert(r.error);
        closeSheet();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="신고"
        className={
          className ??
          "inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-rose-500"
        }
      >
        <Flag size={iconSize} />
        {label}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => !pending && closeSheet()}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 sm:rounded-3xl sm:pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-base font-bold">신고하기</h3>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => !pending && closeSheet()}
                className="rounded-full p-1 text-zinc-400"
              >
                <X size={20} />
              </button>
            </div>

            {done ? (
              <p className="py-8 text-center text-sm font-bold text-brand">
                신고가 접수되었어요. 감사합니다 🙏
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                  신고 사유를 선택하면 관리자가 확인합니다.
                </p>
                <div className="flex flex-col gap-1.5">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      disabled={pending}
                      onClick={() => submit(reason)}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm font-semibold transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-rose-950/20"
                    >
                      {reason}
                      {pending ? (
                        <Loader2 size={15} className="animate-spin text-zinc-400" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
