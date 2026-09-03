import Link from "next/link";
import { ArrowUpRight, CalendarRange } from "lucide-react";

import {
  formatDistance,
  formatMinutes,
  hasWeeklyActivity,
  type Delta,
  type WeeklyReport,
} from "@/features/routine/weekly-report";

/**
 * 이번 주 한눈에 — 로드맵 2.3.
 *
 * 한 주가 끝나기 전에도 의미가 있으려면 **지난주 같은 요일까지**와 견줘야 한다
 * (화요일에 "이번 주 2일 vs 지난주 7일" 은 늘 폭락으로 보인다). 그 사실을 카드에도
 * 적어 둔다 — 숫자만 보면 왜 이 값인지 알 수 없다.
 *
 * 홈과 캘린더가 **같은 카드**를 쓴다(그래서 `home/` 이 아니라 집계와 같은 `routine/` 에
 * 둔다). 화면마다 따로 그리면 같은 주에 두 화면이 다른 숫자를 말하게 된다.
 */

/** 변화 배지 — 지난주가 0이면 비율을 말할 수 없어 '신규'로 적는다. */
function DeltaBadge({ delta, unit = "" }: { delta: Delta; unit?: string }) {
  if (delta.diff === 0) {
    return (
      <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
        지난주와 같음
      </span>
    );
  }
  const up = delta.diff > 0;
  const tone = up
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-zinc-500 dark:text-zinc-400";
  const amount = `${up ? "+" : "−"}${Math.abs(delta.diff).toLocaleString()}${unit}`;
  return (
    <span className={`text-[11px] font-semibold ${tone}`}>
      {amount}
      {delta.pct === null ? (
        <span className="ml-1 font-medium opacity-70">신규</span>
      ) : (
        <span className="ml-1 font-medium opacity-70">
          {delta.pct > 0 ? "+" : ""}
          {delta.pct}%
        </span>
      )}
    </span>
  );
}

function Stat({
  label,
  value,
  delta,
  unit = "",
}: {
  label: string;
  value: string;
  delta: Delta;
  unit?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="truncate text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      <DeltaBadge delta={delta} unit={unit} />
    </div>
  );
}

export function WeeklyReportCard({
  report,
  compact = false,
}: {
  report: WeeklyReport;
  /**
   * 운동탭용 간단형 — 지표 3개(운동한 날·시간·볼륨)만. 운동탭의 주인공은 '오늘'이라
   * 주간 카드가 오늘 목록만큼 커지면 안 된다. **숫자는 같은 집계**를 쓴다(화면마다
   * 다른 값을 말하지 않게).
   */
  compact?: boolean;
}) {
  const { current, deltas, partial } = report;
  // 이번 주에 아무 것도 없으면 빈 카드를 띄우지 않는다 — 홈이 0으로 도배된다.
  if (!hasWeeklyActivity(current)) return null;

  const topParts = current.bodyParts.slice(0, 4);

  if (compact) {
    return (
      <section className="app-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-950 dark:text-zinc-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
              <CalendarRange aria-hidden="true" size={15} />
            </span>
            이번 주
            <span className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
              {partial ? `${current.days}일째` : "한 주 전체"}
            </span>
          </h2>
          <Link
            href="/settings/progress"
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            성장 그래프
            <ArrowUpRight aria-hidden="true" size={13} />
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-x-3">
          <Stat
            label="운동한 날"
            value={`${current.workoutDays}일`}
            delta={deltas.workoutDays}
            unit="일"
          />
          <Stat
            label="운동 시간"
            value={formatMinutes(current.workoutMinutes)}
            delta={deltas.workoutMinutes}
            unit="분"
          />
          <Stat
            label="총 볼륨"
            value={`${current.volumeKg.toLocaleString()}kg`}
            delta={deltas.volumeKg}
            unit="kg"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="app-card p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-zinc-950 dark:text-zinc-100">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
            <CalendarRange aria-hidden="true" size={16} />
          </span>
          이번 주 요약
        </h2>
        <Link
          href="/settings/progress"
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          성장 그래프
          <ArrowUpRight aria-hidden="true" size={13} />
        </Link>
      </div>
      <p className="mb-4 text-[11px] text-zinc-500 dark:text-zinc-400">
        {partial
          ? `이번 주 ${current.days}일째 · 지난주 같은 요일까지와 비교`
          : "한 주 전체 · 지난주와 비교"}
      </p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        <Stat
          label="운동한 날"
          value={`${current.workoutDays}일`}
          delta={deltas.workoutDays}
          unit="일"
        />
        <Stat
          label="운동 시간"
          value={formatMinutes(current.workoutMinutes)}
          delta={deltas.workoutMinutes}
          unit="분"
        />
        <Stat
          label="총 볼륨"
          value={`${current.volumeKg.toLocaleString()}kg`}
          delta={deltas.volumeKg}
          unit="kg"
        />
        <Stat
          label="식단 기록"
          value={`${Math.round(current.dietRate * 100)}%`}
          delta={deltas.dietRate}
          unit="%p"
        />
        {current.runMeters > 0 || deltas.runMeters.diff !== 0 ? (
          <Stat
            label="러닝"
            value={formatDistance(current.runMeters)}
            delta={deltas.runMeters}
            unit="m"
          />
        ) : null}
        {current.steps > 0 || deltas.steps.diff !== 0 ? (
          <Stat
            label="걸음"
            value={current.steps.toLocaleString()}
            delta={deltas.steps}
            unit="걸음"
          />
        ) : null}
      </div>

      {topParts.length > 0 ? (
        <div className="mt-4 border-t border-[var(--line)] pt-3">
          <p className="mb-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            부위 분포 (볼륨 기준)
          </p>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
            {topParts.map((p) => (
              <span
                key={p.part}
                className={PART_BAR[p.part]}
                style={{ width: `${Math.max(2, Math.round(p.ratio * 100))}%` }}
              />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {topParts.map((p) => (
              <li
                key={p.part}
                className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300"
              >
                <span
                  className={`h-2 w-2 rounded-full ${PART_BAR[p.part]}`}
                  aria-hidden="true"
                />
                {p.label} {Math.round(p.ratio * 100)}%
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** 부위별 막대 색 — 라벨과 같은 순서로 구분만 되면 된다. */
const PART_BAR: Record<string, string> = {
  chest: "bg-rose-400",
  back: "bg-sky-400",
  shoulder: "bg-amber-400",
  arm: "bg-violet-400",
  lower: "bg-emerald-400",
  core: "bg-teal-400",
};
