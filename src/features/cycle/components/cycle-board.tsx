"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Heart, X } from "lucide-react";

import { addDaysYmd } from "@/features/routine/data";
import {
  FLOWS,
  FLOW_LABEL,
  SYMPTOMS,
  type CycleLog,
  type Flow,
} from "@/features/cycle/cycle";
import { setCycleDayAction } from "@/features/cycle/cycle-actions";
import type { CyclePrediction } from "@/features/cycle/cycle-predict";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m1: number, d: number) => `${y}-${pad(m1)}-${pad(d)}`;
const daysInMonth = (y: number, m0: number) =>
  new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
const leadDays = (jsDay: number) => (jsDay === 0 ? 6 : jsDay - 1);

export function CycleBoard({
  year,
  month0,
  today,
  logs: initial,
  prediction,
  predicted,
}: {
  year: number;
  month0: number;
  today: string;
  logs: CycleLog[];
  prediction: CyclePrediction;
  predicted: string[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [logs, setLogs] = useState<Map<string, CycleLog>>(
    () => new Map(initial.map((l) => [l.forDate, l])),
  );
  const [editing, setEditing] = useState<string | null>(null);

  const predictedSet = useMemo(() => new Set(predicted), [predicted]);
  const dim = daysInMonth(year, month0);
  const firstJsDay = new Date(Date.UTC(year, month0, 1)).getUTCDay();
  const lead = leadDays(firstJsDay);
  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function goMonth(delta: number) {
    const d = new Date(Date.UTC(year, month0 + delta, 1));
    router.push(`/cycle?m=${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`);
  }

  function saveDay(date: string, patch: CycleLog) {
    setLogs((prev) => {
      const next = new Map(prev);
      const empty =
        !patch.isPeriod &&
        !patch.flow &&
        patch.symptoms.length === 0 &&
        !patch.note;
      if (empty) next.delete(date);
      else next.set(date, patch);
      return next;
    });
    setEditing(null);
    start(async () => {
      await setCycleDayAction(date, {
        isPeriod: patch.isPeriod,
        flow: patch.flow,
        symptoms: patch.symptoms,
        note: patch.note,
      });
      router.refresh();
    });
  }

  const dday = prediction.daysUntilNext;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-950 dark:text-zinc-50">
          <Heart aria-hidden="true" size={20} className="fill-rose-500 text-rose-500" />
          생리 기록
        </h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="이전 달"
            onClick={() => goMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[5.5rem] text-center text-sm font-bold text-zinc-700 dark:text-zinc-200">
            {year}.{pad(month0 + 1)}
          </span>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => goMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 예측 요약 */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-500/30 dark:bg-rose-950/20">
        {prediction.nextStart ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat
              label="다음 생리"
              value={dday === 0 ? "오늘" : dday && dday > 0 ? `D-${dday}` : "-"}
              sub={prediction.nextStart.slice(5).replace("-", "/")}
            />
            <Stat label="평균 주기" value={`${prediction.avgCycle}일`} sub="최근 기준" />
            <Stat
              label="주기"
              value={prediction.dayOfCycle ? `${prediction.dayOfCycle}일째` : "-"}
              sub={prediction.ovulation ? `배란 ${prediction.ovulation.slice(5).replace("-", "/")}` : ""}
            />
          </div>
        ) : (
          <p className="text-center text-sm leading-6 text-rose-700 dark:text-rose-300">
            생리한 날을 달력에서 눌러 기록하면
            <br />
            다음 생리·배란 예정일을 알려드려요.
          </p>
        )}
      </div>

      {/* 달력 */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-3">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`pb-1 text-center text-[11px] font-bold ${
                i === 5 ? "text-sky-600" : i === 6 ? "text-rose-500" : "text-zinc-400"
              }`}
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e${idx}`} />;
            const date = ymd(year, month0 + 1, day);
            const log = logs.get(date);
            const isPeriod = log?.isPeriod;
            const isPredicted = !isPeriod && predictedSet.has(date) && date >= today;
            const isOvul = date === prediction.ovulation;
            const isToday = date === today;
            return (
              <button
                key={date}
                type="button"
                onClick={() => setEditing(date)}
                className={`flex min-h-[52px] flex-col items-center gap-0.5 rounded-lg border p-1 transition hover:border-rose-300 ${
                  isToday
                    ? "border-emerald-400 dark:border-emerald-600"
                    : "border-transparent"
                }`}
              >
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {day}
                </span>
                {isPeriod ? (
                  <Heart aria-label="생리" size={16} className="fill-rose-500 text-rose-500" />
                ) : isPredicted ? (
                  <Heart aria-label="생리 예정" size={16} className="text-rose-300 dark:text-rose-500/60" />
                ) : isOvul ? (
                  <span className="text-[9px] font-bold text-violet-500">배란</span>
                ) : log?.symptoms.length || log?.note ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 border-t border-zinc-100 pt-2 text-[10px] text-zinc-400 dark:border-zinc-800">
          <span className="flex items-center gap-1">
            <Heart size={11} className="fill-rose-500 text-rose-500" /> 생리
          </span>
          <span className="flex items-center gap-1">
            <Heart size={11} className="text-rose-300" /> 예정
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-violet-500">배란</span> 배란 예정
          </span>
        </div>
      </div>

      {editing ? (
        <DayEditor
          date={editing}
          log={logs.get(editing) ?? null}
          onClose={() => setEditing(null)}
          onSave={(patch) => saveDay(editing, patch)}
        />
      ) : null}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-rose-700/70 dark:text-rose-300/70">{label}</p>
      <p className="text-lg font-extrabold text-rose-700 dark:text-rose-300">{value}</p>
      {sub ? <p className="text-[10px] text-rose-700/60 dark:text-rose-300/50">{sub}</p> : null}
    </div>
  );
}

function DayEditor({
  date,
  log,
  onClose,
  onSave,
}: {
  date: string;
  log: CycleLog | null;
  onClose: () => void;
  onSave: (patch: CycleLog) => void;
}) {
  const [isPeriod, setIsPeriod] = useState(log?.isPeriod ?? false);
  const [flow, setFlow] = useState<Flow | null>(log?.flow ?? null);
  const [symptoms, setSymptoms] = useState<string[]>(log?.symptoms ?? []);
  const [note, setNote] = useState(log?.note ?? "");
  const toggle = (s: string) =>
    setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 cursor-default bg-black/40" />
      <div className="relative max-h-[88vh] w-full overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:m-3 sm:max-w-md sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
            {date.slice(5).replace("-", "월 ")}일
          </h3>
          <button type="button" aria-label="닫기" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <X size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsPeriod((v) => !v)}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-bold transition ${
            isPeriod
              ? "bg-rose-500 text-white"
              : "border border-zinc-300 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          <Heart size={18} className={isPeriod ? "fill-white" : ""} />
          {isPeriod ? "생리 중" : "생리 시작/기록"}
        </button>

        {isPeriod ? (
          <div className="mt-3">
            <p className="mb-1 text-xs font-bold text-zinc-500">출혈량</p>
            <div className="flex gap-1.5">
              {FLOWS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFlow(flow === f ? null : f)}
                  className={`h-9 flex-1 rounded-lg text-xs font-bold transition ${
                    flow === f
                      ? "bg-rose-500 text-white"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {FLOW_LABEL[f]}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-3">
          <p className="mb-1 text-xs font-bold text-zinc-500">증상</p>
          <div className="flex flex-wrap gap-1.5">
            {SYMPTOMS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  symptoms.includes(s)
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="메모 (선택)"
          className="mt-3 w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />

        <button
          type="button"
          onClick={() =>
            onSave({ forDate: date, isPeriod, flow: isPeriod ? flow : null, symptoms, note: note.trim() || null })
          }
          className="mt-4 h-12 w-full rounded-xl bg-rose-500 text-base font-bold text-white transition hover:bg-rose-600"
        >
          저장
        </button>
      </div>
    </div>
  );
}
