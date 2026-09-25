"use client";

import { useEffect, useRef, useState } from "react";
import { Droplet, Plus, X } from "lucide-react";

import {
  deleteWaterEntryAction,
  logWaterAction,
  type WaterEntry,
} from "@/features/diet/water-actions";
import {
  WATER_CUPS,
  WATER_ONE_MAX_ML,
  formatWater,
  isValidOneShotMl,
  remainingBy,
  sinceLabel,
  timeLabel,
  waterPercent,
} from "@/features/diet/water";

/**
 * 수분 섭취 — **마신 기록 하나하나**로 남긴다(2026-09-25 리뉴얼).
 *
 * 예전엔 하루 합계 한 숫자만 있어서
 *  - 잘못 담은 걸 되돌리려면 그 화면을 안 떠나야 했고(되돌릴 대상이 기억에만 있었다)
 *  - 컵 크기가 다른 사람(텀블러 600·물병 1L)은 정확히 기록할 수 없었고
 *  - 언제 마셨는지 남지 않아 "몰아 마시기"를 알아채지 못했다.
 *
 * 이제 컵 버튼·직접 입력 모두 기록 한 줄을 남기고, 목록에서 하나씩 지울 수 있다.
 */
export function WaterCard({
  initialMl,
  initialEntries = [],
  targetMl,
  date,
}: {
  initialMl: number;
  /** 그날 기록(최신순). 없으면 목록을 접어 둔다. */
  initialEntries?: WaterEntry[];
  targetMl: number;
  date?: string;
}) {
  const [ml, setMl] = useState(initialMl);
  const [entries, setEntries] = useState<WaterEntry[]>(initialEntries);
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /** 마지막 요청 번호 — 늦게 온 옛 응답이 합계를 되돌리지 않게. */
  const seq = useRef(0);
  // '방금 / 20분 전' 은 시간이 흐르면 틀려진다 — 1분마다 다시 그린다.
  const [, tick] = useState(0);

  useEffect(() => {
    if (entries.length === 0) return;
    const t = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, [entries.length]);

  useEffect(() => {
    if (custom) inputRef.current?.focus();
  }, [custom]);

  const pct = waterPercent(ml, targetMl);
  const reached = pct >= 100;
  const left = remainingBy(ml, targetMl, WATER_CUPS[0].ml);
  const last = entries[0];

  /**
   * 🔴 담기는 **막지 않는다.** 컵을 빠르게 두세 번 누르는 건 정상 사용인데,
   * 요청 중이라고 버튼을 잠그면 그 잔들이 조용히 사라진다.
   * 대신 응답은 **가장 마지막 요청의 것만** 반영한다(먼저 보낸 응답이 늦게 와서
   * 합계를 과거 값으로 되돌리지 않게).
   */
  async function add(amount: number) {
    setError(null);
    const mine = ++seq.current;
    // 낙관적 — 누르고 반응이 없으면 사람은 또 누른다.
    setMl((v) => v + amount);
    const res = await logWaterAction(amount, date);
    if (!res.ok) {
      setMl((v) => v - amount);
      setError(res.error);
      return;
    }
    if (mine !== seq.current) return; // 더 최근 요청이 있다 — 그쪽 결과를 쓴다.
    setMl(res.ml);
    setEntries(res.entries);
  }

  async function remove(id: string) {
    if (busy) return;
    setError(null);
    setBusy(true);
    const res = await deleteWaterEntryAction(id, date);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMl(res.ml);
    setEntries(res.entries);
  }

  function submitCustom() {
    const amount = Number(draft);
    if (!isValidOneShotMl(amount)) {
      setError(`1~${WATER_ONE_MAX_ML}ml 사이로 입력해 주세요.`);
      return;
    }
    setDraft("");
    setCustom(false);
    void add(amount);
  }

  return (
    <section
      aria-label="수분 섭취"
      data-testid="water-card"
      data-ml={ml}
      className="app-card px-3 py-3"
    >
      <div className="flex items-baseline gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Droplet aria-hidden="true" size={15} className="text-brand" />
          수분
        </p>
        <p className="text-base font-bold tabular-nums">{formatWater(ml)}</p>
        <p className="text-xs text-zinc-400">/ {formatWater(targetMl)}</p>
        {last ? (
          <p className="ml-auto text-xs text-zinc-400" data-testid="water-since">
            마지막 {sinceLabel(last.at)}
          </p>
        ) : null}
      </div>

      <div
        role="progressbar"
        aria-label="수분 목표 달성률"
        aria-valuenow={Math.min(100, pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width]"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      {/* 남은 양을 '무엇을 더 하면 되는지' 로 바꿔 말한다. */}
      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        {reached
          ? "오늘 목표를 채웠어요 👏"
          : `${formatWater(left.ml)} 남음 · ${WATER_CUPS[0].label} ${left.cups}잔`}
      </p>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {WATER_CUPS.map((cup) => (
          <button
            key={cup.ml}
            type="button"
            onClick={() => void add(cup.ml)}
            className="app-press inline-flex h-9 items-center gap-1 rounded-full bg-zinc-100 px-3 text-xs font-semibold text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
          >
            +{cup.ml}ml
            <span className="text-zinc-400">{cup.label}</span>
          </button>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={() => setCustom((v) => !v)}
          aria-expanded={custom}
          data-testid="water-custom-open"
          className="app-press inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-zinc-300 px-3 text-xs font-semibold text-zinc-600 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300"
        >
          <Plus aria-hidden="true" size={12} />
          직접 입력
        </button>
      </div>

      {custom ? (
        <div className="mt-2 flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            aria-label="마신 양(ml)"
            placeholder="예: 600"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCustom();
              if (e.key === "Escape") setCustom(false);
            }}
            className="h-9 w-24 rounded-md border app-field px-2 text-center text-sm"
          />
          <span className="text-xs text-zinc-500">ml</span>
          <button
            type="button"
            onClick={submitCustom}
            disabled={busy}
            data-testid="water-custom-add"
            className="app-press h-9 rounded-full bg-brand px-3.5 text-xs font-semibold text-white disabled:opacity-50 dark:text-zinc-950"
          >
            담기
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}

      {entries.length > 0 ? (
        <ul className="mt-3 border-t border-[var(--line)] pt-2" data-testid="water-entries">
          {entries.slice(0, 8).map((e) => (
            <li key={e.id} className="flex items-center gap-2 py-1 text-xs">
              <span className="w-16 shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                {timeLabel(e.at)}
              </span>
              <span className="font-semibold tabular-nums">{e.ml}ml</span>
              <button
                type="button"
                onClick={() => void remove(e.id)}
                disabled={busy}
                aria-label={`${timeLabel(e.at)} ${e.ml}ml 기록 지우기`}
                className="ml-auto grid h-7 w-7 place-items-center rounded-md text-zinc-400 transition hover:text-danger disabled:opacity-40"
              >
                <X aria-hidden="true" size={13} />
              </button>
            </li>
          ))}
          {entries.length > 8 ? (
            <li className="py-1 text-xs text-zinc-400">
              외 {entries.length - 8}건
            </li>
          ) : null}
        </ul>
      ) : null}
    </section>
  );
}
