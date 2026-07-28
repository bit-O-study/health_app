"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw, Trash2, UserX } from "lucide-react";

import type { ReportRow } from "@/features/admin/reports";
import { reportKindLabel } from "@/features/community/report";
import {
  banBadgeLabel,
  formatReportTime,
  reportActionState,
  suspendButtonLabel,
} from "@/features/admin/report-view";
import {
  deleteReportedContentAction,
  reopenReportAction,
  resolveReportAction,
  suspendReportedUserAction,
} from "@/features/admin/report-actions";

/**
 * 신고 처리 목록. 조치들은 서로를 막지 않는다 —
 * 정지를 걸어도 신고는 열린 채라 이어서 게시글/댓글 삭제까지 할 수 있고,
 * 처리완료한 신고도 콘텐츠가 남아 있으면 삭제·정지가 그대로 가능하다.
 */
export function ReportsManager({ reports }: { reports: ReportRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();

  function run(id: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setPendingId(id);
    start(async () => {
      const r = await fn();
      setPendingId(null);
      if (!r.ok) alert(r.error ?? "처리에 실패했어요.");
      else router.refresh();
    });
  }

  if (reports.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-600">
        아직 신고가 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {reports.map((r) => {
        const busy = pendingId === r.id;
        const s = reportActionState({
          status: r.status,
          contentExists: r.contentExists,
          targetUserId: r.targetUserId,
          suspendedUntil: r.targetSuspendedUntil,
          bannedAt: r.targetBannedAt,
        });
        const banBadge = banBadgeLabel(s.banState, r.targetSuspendedUntil);
        return (
          <li
            key={r.id}
            className={`rounded-xl border p-4 ${
              s.resolved
                ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40"
                : "border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-bold text-white dark:bg-zinc-200 dark:text-zinc-900">
                {reportKindLabel(r.targetKind)}
              </span>
              {r.targetAuthor ? (
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  작성자: {r.targetAuthor}
                </span>
              ) : null}
              <span className="ml-auto text-[11px] text-zinc-400">
                {formatReportTime(r.createdAt)}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {s.resolved ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  처리완료
                </span>
              ) : null}
              {s.contentDeleted ? (
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                  {reportKindLabel(r.targetKind)} 삭제됨
                </span>
              ) : null}
              {banBadge ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  {banBadge}
                </span>
              ) : null}
            </div>

            {r.targetPreview ? (
              <p className="mt-2 line-clamp-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                {r.targetPreview}
              </p>
            ) : null}

            <p className="mt-2 text-sm">
              <span className="font-bold text-rose-600 dark:text-rose-400">
                신고 사유:
              </span>{" "}
              {r.reason}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !s.canDelete}
                onClick={() => {
                  if (
                    !confirm(
                      `이 ${reportKindLabel(r.targetKind)}을(를) 삭제할까요? 되돌릴 수 없습니다.`,
                    )
                  )
                    return;
                  run(r.id, () =>
                    deleteReportedContentAction(r.targetKind, r.targetId),
                  );
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-rose-600 px-3 text-xs font-bold text-white transition hover:bg-rose-500 disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                {s.canDelete
                  ? `${reportKindLabel(r.targetKind)} 삭제`
                  : "삭제됨"}
              </button>

              {s.canSuspend ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const days = Number(
                      prompt("정지 기간(일)을 입력하세요.", "7") ?? "",
                    );
                    if (!Number.isFinite(days) || days <= 0) return;
                    run(r.id, () =>
                      suspendReportedUserAction(
                        r.targetUserId!,
                        days,
                        `신고 처리: ${r.reason}`.slice(0, 200),
                      ),
                    );
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-amber-400 bg-white px-3 text-xs font-bold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60 dark:bg-zinc-800 dark:text-amber-400"
                >
                  <UserX size={14} />
                  {suspendButtonLabel(s.banState)}
                </button>
              ) : null}

              {s.resolved ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(r.id, () => reopenReportAction(r.id))}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-xs font-bold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <RotateCcw size={14} />
                  다시 열기
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(r.id, () => resolveReportAction(r.id))}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-xs font-bold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <Check size={14} />
                  처리완료
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}