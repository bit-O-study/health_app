import type { BodyLog } from "@/features/profile/body-logs";
import {
  buildBodyLogRows,
  fullDateLabel,
  timeLabel,
} from "@/features/profile/body-chart-data";

/**
 * 체형(체중 등) 측정 기록 목록 — **언제** 잰 값인지 날짜/시각과 함께 최신순으로.
 * 그래프는 추세만 보여줘서 "이 값이 며칠에 잰 건지" 를 알 수 없었다.
 */
export function BodyLogList({ logs }: { logs: BodyLog[] }) {
  const rows = buildBodyLogRows(logs);
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        아직 기록이 없습니다.
      </p>
    );
  }

  return (
    <ul className="max-h-72 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
      {rows.map((r) => (
        <li
          key={r.createdAt}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2"
        >
          <span className="flex items-baseline gap-1.5">
            <span className="text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-200">
              {fullDateLabel(r.createdAt)}
            </span>
            <span className="text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
              {timeLabel(r.createdAt)}
            </span>
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            {r.metrics.map((m) => (
              <span key={m.key} className="inline-flex items-baseline gap-1">
                <span
                  className="inline-block h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {m.label}
                </span>
                <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {m.value}
                  <span className="text-[10px] font-medium text-zinc-400">
                    {m.unit}
                  </span>
                </span>
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}