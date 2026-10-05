"use client";

import Link from "next/link";

import { formatRunClock, formatRunKm, formatRunPaceShort } from "@/features/running/run-records-view";
import { recordLabel, type RunRecordKind } from "@/features/running/run-guide";
import { runSaveMessage, type RunSaveResult } from "@/features/running/run-save";

/**
 * 런닝 종료 화면(실내·야외 공용, 2026-09-29 런닝 3단계 — 보고서 결정 1).
 * 예전에 뺀 긴 요약은 다시 넣지 않고, **한 줄 요약 + 개인 최고 배지 + 저장 상태 + 기록 바로 가기**만.
 */
export function RunFinishSummary({
  recorded,
  notRecordedText,
  meters,
  sec,
  saveState,
  runId,
  records,
  onConfirm,
}: {
  recorded: boolean;
  notRecordedText: string;
  meters: number;
  sec: number;
  saveState: RunSaveResult | "saving" | null;
  runId?: string;
  records?: RunRecordKind[];
  onConfirm: () => void;
}) {
  const pace = meters > 0 ? sec / (meters / 1000) : null;
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center">
      <h2 className="text-2xl font-bold">{recorded ? "런닝 완료 🏁" : "런닝 종료"}</h2>
      {!recorded ? <p className="text-sm text-zinc-300">{notRecordedText}</p> : null}
      {recorded ? (
        <p data-testid="run-finish-line" className="text-lg font-semibold tabular-nums">
          {formatRunKm(meters)}km · {formatRunClock(sec)} · 평균 {formatRunPaceShort(pace)}
        </p>
      ) : null}
      {recorded && records && records.length > 0 ? (
        <ul aria-label="개인 최고 기록" className="flex flex-wrap justify-center gap-2">
          {records.map((kind) => (
            <li key={kind} className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300">
              🏅 {recordLabel(kind)}
            </li>
          ))}
        </ul>
      ) : null}
      {recorded && runSaveMessage(saveState) ? (
        <p role="status" data-testid="run-save-state" data-state={saveState ?? ""} className="text-sm text-zinc-300">
          {runSaveMessage(saveState)}
        </p>
      ) : null}
      <div className="mt-2 flex flex-col items-center gap-2">
        {recorded && saveState !== "saving" ? (
          // 기기에 보관만 됐으면 아직 id 가 없다 — 목록으로(연결되면 거기 나타난다).
          <Link
            href={runId ? `/routine/running-records/${runId}` : "/routine/running-records"}
            className="inline-flex min-h-11 items-center rounded-full bg-emerald-500 px-8 text-lg font-bold text-zinc-950"
          >
            기록 자세히 보기
          </Link>
        ) : null}
        <button
          type="button"
          onClick={onConfirm}
          className={
            recorded
              ? "min-h-11 px-6 text-sm font-semibold text-zinc-300 underline"
              : "min-h-11 rounded-full bg-emerald-500 px-8 text-lg font-bold text-zinc-950"
          }
        >
          확인
        </button>
      </div>
    </div>
  );
}
