import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { RunHistoryRow } from "@/features/running/run-history-summary";
import {
  formatRunDate,
  formatRunDuration,
  formatRunKm,
  formatRunPaceShort,
} from "@/features/running/run-records-view";

/** 런닝 기록 상세 주소 — 목록 3곳(런닝 기록·설정→기록·날짜 기록)이 모두 여기로 간다. */
export function runRecordHref(id: string): string {
  return `/routine/running-records/${id}`;
}

/**
 * 런닝 기록 줄 목록. 줄에는 거리·시간·페이스만 — kcal·심박·경사도·경로는 상세 화면에서.
 * (2026-09-27 B안: 예전엔 줄을 누르면 같은 줄이 다시 나오는 날짜 기록으로 갔다.)
 */
export function RunHistoryList({
  rows,
  emptyText = "저장된 런닝 기록이 없습니다.",
}: {
  rows: RunHistoryRow[];
  emptyText?: string;
}) {
  if (rows.length === 0) {
    return <p className="px-3 py-2.5 text-sm text-zinc-500 dark:text-zinc-400">{emptyText}</p>;
  }

  return (
    // 카드 안 줄 목록 — 바깥 .app-card 가 테두리를 맡고, 줄마다 선으로만 나눈다.
    <ul className="divide-y divide-[var(--line)]">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={runRecordHref(row.id)}
            aria-label={`${formatRunDate(row.forDate)} ${row.mode === "outdoor" ? "야외" : "실내"} 런닝 ${formatRunKm(row.distanceM)}km 상세 보기`}
            className="flex min-h-14 items-center gap-2 px-3 py-2.5 transition active:bg-zinc-100 dark:active:bg-white/[0.06]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                  {formatRunDate(row.forDate)} · {row.mode === "outdoor" ? "야외" : "실내"}
                </p>
                <span className="shrink-0 text-base font-semibold tabular-nums text-brand">
                  {formatRunKm(row.distanceM)}km
                </span>
              </div>
              <p className="mt-0.5 flex gap-3 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                <span>{formatRunDuration(row.durationSec)}</span>
                <span>{formatRunPaceShort(row.paceSecPerKm)}</span>
              </p>
            </div>
            <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-zinc-400" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
