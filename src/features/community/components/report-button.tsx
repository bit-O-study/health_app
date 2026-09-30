"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import { useBackClose } from "@/lib/platform/use-back-close";
import { Ban, Flag, Loader2, X } from "lucide-react";

import {
  REPORT_REASONS,
  type ReportTargetKind,
} from "@/features/community/report";
import { blockAuthorAction, reportContentAction } from "@/features/community/report-actions";

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
  onBlocked,
  leaveOnBlock,
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
  /** 차단한 뒤(시트를 닫고) — 목록을 다시 읽는 등. 없으면 지금 화면을 새로 그린다. */
  onBlocked?: () => void;
  /** 차단한 뒤 이 화면을 떠난다(상세 화면 — 그 글은 이제 안 보인다). 시트는 화면과 함께 사라진다. */
  leaveOnBlock?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  // 차단은 한 번 더 묻는다(커뮤니티 3단계) — 서로의 글·댓글이 안 보이게 된다.
  const [confirmBlock, setConfirmBlock] = useState(false);
  // 오류는 시트 안에 한 줄로(브라우저 alert 대신 — 커뮤니티 2단계).
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // 시트를 닫는 곳은 전부 이걸로 — 부모(메뉴)에게 닫혔다고 알린다.
  const closeSheet = () => {
    setOpen(false);
    setConfirmBlock(false);
    setError(null);
    onClose?.();
  };
  useBackClose(open, () => {
    if (!pending) closeSheet();
  });

  function submit(reason: string) {
    setError(null);
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
        setDone("신고가 접수되었어요. 감사합니다 🙏");
        setTimeout(() => {
          closeSheet();
          setDone(null);
        }, 1200);
      } else {
        setError(r.error);
      }
    });
  }

  function block() {
    setError(null);
    start(async () => {
      const r = await blockAuthorAction({ targetKind, targetId });
      if (r.ok) {
        setDone("차단했어요. 이제 서로의 글과 댓글이 보이지 않아요.");
        setTimeout(() => {
          // 🔴 화면을 옮길 거면 시트를 먼저 닫지 않는다 — 닫기가 쌓아 둔 '뒤로' 항목을 빼면서
          //    (history.back) 방금 한 이동을 되돌린다. 시트는 화면과 함께 사라진다(modal-history 가 빼기를 건너뜀).
          if (leaveOnBlock) {
            leaveOnBlock();
            return;
          }
          closeSheet();
          setDone(null);
          if (onBlocked) onBlocked();
          else router.refresh();
        }, 1200);
      } else {
        setError(r.error);
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

      {/* 🔴 시트는 body 로 띄운다 — 상세 ⋮ 메뉴(z-20) 안에서 그리면 그 층에 갇혀 시트 아래쪽이
          하단 탭바(z-30)에 가려진다(커뮤니티 3단계에서 '차단하기'를 아래에 넣으며 E2E 로 발견). */}
      {open && typeof document !== "undefined" ? createPortal(
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
              <p role="status" className="py-8 text-center text-sm font-bold text-brand">
                {done}
              </p>
            ) : confirmBlock ? (
              <div className="flex flex-col gap-3 py-2">
                <p className="text-sm leading-relaxed">
                  <b>{targetAuthor?.trim() || "이 사람"}</b>님을 차단할까요? 서로의 글과 댓글이 보이지 않고, 내 글에 댓글을 달 수 없어요.
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">커뮤니티 › 내 글 › 차단한 사용자에서 풀 수 있어요.</p>
                {error ? (
                  <p role="alert" data-testid="report-error" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-danger dark:bg-rose-950/30">
                    {error}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <button type="button" disabled={pending} onClick={() => setConfirmBlock(false)} className="min-h-11 flex-1 rounded-xl border border-zinc-200 text-sm font-semibold dark:border-zinc-700">
                    취소
                  </button>
                  <button type="button" disabled={pending} onClick={block} className="min-h-11 flex-1 rounded-xl bg-danger text-sm font-semibold text-white disabled:opacity-60">
                    {pending ? <Loader2 size={15} className="mx-auto animate-spin" /> : "차단"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                  신고 사유를 선택하면 관리자가 확인합니다.
                </p>
                {error ? (
                  <p role="alert" data-testid="report-error" className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-danger dark:bg-rose-950/30">
                    {error}
                  </p>
                ) : null}
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
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    setConfirmBlock(true);
                  }}
                  className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-zinc-500 hover:text-danger disabled:opacity-60 dark:text-zinc-400"
                >
                  <Ban size={15} /> 이 사람 차단하기
                </button>
              </>
            )}
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
