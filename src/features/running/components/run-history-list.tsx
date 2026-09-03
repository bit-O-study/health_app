import Link from "next/link";
import { HeartPulse, MapPin, Timer, Zap } from "lucide-react";

import {
  formatRunPace,
  type RunHistoryRow,
} from "@/features/running/run-history-summary";

function duration(sec: number): string {
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem === 0 ? `${min}분` : `${min}분 ${rem}초`;
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function RunHistoryList({ rows }: { rows: RunHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
        저장된 런닝 기록이 없습니다.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/settings/history/${row.forDate}#running`}
            className="block rounded-xl border border-zinc-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-zinc-700 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-zinc-950 dark:text-zinc-100">
                  {row.mode === "outdoor" ? "야외 런닝" : "실내 런닝"}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {row.forDate} · {timeLabel(row.startedAt)}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                {(row.distanceM / 1_000).toFixed(2)}km
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
              <span className="inline-flex items-center gap-1"><Timer size={13} />{duration(row.durationSec)}</span>
              <span>{formatRunPace(row.paceSecPerKm)}</span>
              <span className="inline-flex items-center gap-1"><Zap size={13} />{row.caloriesKcal}kcal</span>
              {row.averageHeartRate ? (
                <span className="inline-flex items-center gap-1"><HeartPulse size={13} />평균 {row.averageHeartRate} · 최대 {row.maxHeartRate}bpm</span>
              ) : null}
              {row.routePointCount > 0 ? (
                <span className="inline-flex items-center gap-1"><MapPin size={13} />경로 {row.routePointCount}점</span>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
