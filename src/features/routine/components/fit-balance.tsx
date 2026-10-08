"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Lock, X } from "lucide-react";

import { useBackClose } from "@/lib/platform/use-back-close";
import { useHydrated } from "@/lib/use-hydrated";
import { BODY_PART_LABEL, type BodyPart } from "@/features/routine/exercise-catalog-labels";
import type { BalanceRow, SubStatus } from "@/features/routine/fit";
import { BALANCE_PART, radarGeometry, statusChip } from "@/features/routine/fit-view";

export type FitPartView = { part: BodyPart; pct: number; status: SubStatus; stim: number; target: number };
export type FitSubView = { sub: string; label: string; stim: string; target: string; pct: number; status: SubStatus };

/** 상태 색 — 부족 빨강 · 조금 연두 · 적정 초록 · 넘침 회색(나쁜 게 아님) · 안 함 옅은 회색. */
const BAR: Record<SubStatus, string> = {
  none: "bg-zinc-300 dark:bg-zinc-600",
  low: "bg-danger",
  some: "bg-brand/50",
  ok: "bg-brand",
  high: "bg-zinc-400 dark:bg-zinc-500",
};
const CHIP: Record<SubStatus, string> = {
  none: "bg-danger/10 text-danger",
  low: "bg-danger/10 text-danger",
  some: "bg-brand-soft text-brand",
  ok: "bg-brand-soft text-brand",
  high: "bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300",
};
const needs = (s: SubStatus) => s === "none" || s === "low";

function Bar({ pct, status }: { pct: number; status: SubStatus }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
      <div className={`h-full rounded-full ${BAR[status]}`} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
    </div>
  );
}

/**
 * 맞춤 운동 · 몸 균형 레이더(2026-10-07 한 화면 개편) — 부위 6개를 한 그림으로.
 * 점선 = 이번 주 목표(100%), 바깥 = 150%. 누르면 세부 근육·비율 시트가 올라온다.
 */
export function FitBalanceRadar({
  parts,
  rows,
  balance,
  worstId,
  full,
  initialOpen = false,
}: {
  parts: FitPartView[];
  rows: FitSubView[];
  balance: BalanceRow[];
  worstId: string | null;
  full: boolean;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const g = radarGeometry(parts);
  const statusOf = new Map(parts.map((p) => [p.part, p.status]));
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="app-press block w-full rounded-2xl"
        aria-label="몸 균형 자세히 보기"
        data-testid="fit-radar"
      >
        <svg viewBox="-14 -16 228 232" className="w-full" aria-hidden="true">
          <polygon points={g.outer} fill="none" className="stroke-zinc-200 dark:stroke-white/[0.1]" strokeWidth="1.5" />
          {g.axes.map((a) => (
            <line key={a.part} x1="100" y1="100" x2={a.x} y2={a.y} className="stroke-zinc-100 dark:stroke-white/[0.06]" />
          ))}
          <polygon points={g.goal} fill="none" className="stroke-brand/50" strokeWidth="1.5" strokeDasharray="4 4" />
          <polygon points={g.actual} className="fill-brand/25 stroke-brand" strokeWidth="2" strokeLinejoin="round" />
          {g.axes.map((a) => {
            const bad = needs(statusOf.get(a.part) ?? "none");
            return (
              <text
                key={a.part}
                x={a.lx}
                y={a.ly + 5}
                textAnchor="middle"
                fontSize="16"
                fontWeight={bad ? 700 : 400}
                className={bad ? "fill-danger" : "fill-zinc-400"}
              >
                {BODY_PART_LABEL[a.part]}
              </text>
            );
          })}
        </svg>
      </button>
      {open ? (
        <BalanceSheet parts={parts} rows={rows} balance={balance} worstId={worstId} full={full} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function BalanceSheet({
  parts,
  rows,
  balance,
  worstId,
  full,
  onClose,
}: {
  parts: FitPartView[];
  rows: FitSubView[];
  balance: BalanceRow[];
  worstId: string | null;
  full: boolean;
  onClose: () => void;
}) {
  useBackClose(true, onClose);
  const sorted = [...parts].sort((a, b) => a.pct - b.pct);
  const [sel, setSel] = useState<BodyPart>(sorted[0]?.part ?? "back");
  const cur = parts.find((p) => p.part === sel)!;
  // 🔴 주소로 바로 열 때(?sheet=balance) 서버는 시트를 못 그리는데(document 없음) 브라우저 첫 렌더는 그려
  //    '화면 불일치(hydration)' 오류가 났다(2026-10-08 개발 서버 로그). 붙은 뒤에만 그린다.
  const hydrated = useHydrated();
  if (!hydrated || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="몸 균형"
        data-testid="fit-balance-sheet"
        className="max-h-[85dvh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 sm:rounded-3xl sm:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-base font-bold">몸 균형</h2>
          <span className="text-xs text-zinc-500">지난 7일 · 세부 근육 25개</span>
          <button type="button" aria-label="닫기" onClick={onClose} className="rounded-full p-1 text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="부위">
          {sorted.map((p) => (
            <button
              key={p.part}
              type="button"
              role="tab"
              aria-selected={sel === p.part}
              onClick={() => setSel(p.part)}
              data-testid={`fit-part-${p.part}`}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CHIP[p.status]} ${sel === p.part ? "ring-2 ring-zinc-900/70 dark:ring-white/70" : ""}`}
            >
              {BODY_PART_LABEL[p.part]} {statusChip(p.status, p.pct, p)}
            </button>
          ))}
        </div>
        <p className="flex flex-wrap gap-x-3 text-xs text-zinc-500" data-testid="fit-legend">
          <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-danger" />부족</span>
          <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-brand/50" />조금</span>
          <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-brand" />적정</span>
          <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-zinc-400" />넘침</span>
        </p>

        {full ? (
          <>
            <div className="space-y-2.5 rounded-2xl bg-zinc-50 p-3 dark:bg-white/[0.04]">
              {rows
                .filter((r) => r.sub.startsWith(`${sel}-`))
                .map((r) => (
                  <div key={r.sub} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-200">
                      <span>{r.label}</span>
                      <span className="tabular-nums">
                        {r.stim} / {r.target}세트
                      </span>
                    </div>
                    <Bar pct={r.pct} status={r.status} />
                  </div>
                ))}
            </div>
            {balance
              .filter((b) => BALANCE_PART[b.id] === sel)
              .map((b) => (
                <RatioBars key={b.id} row={b} alarm={worstId === b.id} />
              ))}
          </>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-white/[0.04] dark:text-zinc-300" data-testid="fit-locked">
            <Lock aria-hidden="true" size={14} className="shrink-0" />
            <span className="flex-1">세부 근육 25개 · 비율은 라이트에서 볼 수 있어요</span>
            <Link href="/settings/subscription" className="font-semibold text-brand">
              보기
            </Link>
          </div>
        )}

        {cur.status !== "ok" && cur.status !== "high" ? (
          // 같은 화면(/fit) 안 이동 — 시트를 먼저 닫지 않는다(닫으며 거는 뒤로가기가 이동을 되돌린다).
          // 화면이 `key` 로 다시 그려지며 시트가 함께 사라진다.
          <Link
            href={`/fit?part=${sel}`}
            className="app-press flex h-11 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white dark:text-zinc-950"
            data-testid={`fit-part-go-${sel}`}
          >
            {BODY_PART_LABEL[sel]} 채우는 운동 추천
          </Link>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}

/** 비율 막대 — 지금과 목표를 같은 폭의 두 줄로(조각마다 칸). */
function RatioBars({ row, alarm }: { row: BalanceRow; alarm: boolean }) {
  const shades = ["bg-brand", "bg-brand/55", "bg-brand/25"];
  const line = (key: "now" | "goal") => (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
      {row.parts.map((p, i) => (
        <div key={p.label} className={shades.at(i) ?? "bg-brand/25"} style={{ width: `${p[key]}%` }} />
      ))}
    </div>
  );
  const low = [...row.parts].sort((a, b) => b.goal - b.now - (a.goal - a.now))[0];
  return (
    <div className="space-y-1.5 rounded-2xl bg-zinc-50 p-3 dark:bg-white/[0.04]" data-testid={`fit-balance-${row.id}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{row.label}</p>
        {row.hint && low ? (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${alarm ? "bg-danger/10 text-danger" : "bg-zinc-100 text-zinc-500 dark:bg-white/[0.08]"}`}>
            {low.label} 부족
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-[2.5rem_1fr] items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
        <span>지금</span>
        {line("now")}
        <span>목표</span>
        {line("goal")}
      </div>
      <p className="flex flex-wrap gap-x-2.5 text-xs text-zinc-500 dark:text-zinc-400">
        {row.parts.map((p, i) => (
          <span key={p.label} className="inline-flex items-center gap-1">
            <i className={`h-2 w-2 rounded-full ${shades.at(i) ?? "bg-brand/25"}`} />
            {p.label}
          </span>
        ))}
      </p>
    </div>
  );
}
