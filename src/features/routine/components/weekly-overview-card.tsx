import Link from "next/link";
import { ChevronRight } from "lucide-react";

import {
  formatMinutes,
  hasWeeklyActivity,
  type Delta,
  type WeeklyReport,
} from "@/features/routine/weekly-report";
import {
  VOLUME_LABEL,
  WEEKLY_SET_MAX,
  WEEKLY_SET_MIN,
  type VolumeStatus,
} from "@/features/routine/training-volume";

/**
 * '이번 주' 카드 — 주간 요약(운동한 날·시간·볼륨) + 부위별 세트를 **한 장**에.
 *
 * 예전엔 "이번 주 요약"과 "이번 주 훈련"이 따로 카드 두 장이었고, 홈과 운동탭에
 * 똑같이 두 장씩 떴다. 둘 다 같은 완료 기록을 보는 이번 주 이야기라 한 카드로 합쳤다.
 * 홈과 운동탭이 **같은 컴포넌트**를 쓴다 — 화면마다 다른 숫자를 말하지 않게.
 *
 * 비교 기준은 그대로다: 진행 중인 주는 **지난주 같은 요일까지**와 견준다
 * (화요일에 "이번 주 2일 vs 지난주 7일"은 늘 폭락으로 보인다). 그 사실을 카드에 적는다.
 *
 * 서버 컴포넌트 — 숫자만 받아 그린다(카탈로그가 클라 번들에 실리지 않게).
 */

export type WeeklySummaryRegion = {
  region: string;
  label: string;
  sets: number;
  status: VolumeStatus;
};

/** 부위 막대 — 색 하나(브랜드)의 진하기로만 말한다. 안 한 부위만 주의색 테두리. */
export const REGION_BAR: Record<VolumeStatus, string> = {
  none: "border border-warn",
  low: "bg-brand/40",
  optimal: "bg-brand",
  high: "bg-brand/70",
};

/** 변화 표시 — 지난주가 0이면 비율을 말할 수 없어 '신규'로 적는다. */
function DeltaText({ delta, unit }: { delta: Delta; unit: string }) {
  if (delta.diff === 0) {
    return (
      <span className="block text-xs text-zinc-500 dark:text-zinc-400">
        지난주와 같음
      </span>
    );
  }
  const up = delta.diff > 0;
  return (
    <span
      className={`block text-xs ${up ? "text-brand" : "text-zinc-500 dark:text-zinc-400"}`}
    >
      {up ? "+" : "−"}
      {Math.abs(delta.diff).toLocaleString()}
      {unit}
      <span className="ml-1">
        {delta.pct === null ? "신규" : `${delta.pct > 0 ? "+" : ""}${delta.pct}%`}
      </span>
    </span>
  );
}

function Stat({
  label,
  value,
  delta,
  unit,
}: {
  label: string;
  value: string;
  delta: Delta;
  unit: string;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="truncate text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      <DeltaText delta={delta} unit={unit} />
    </div>
  );
}

export function WeeklyOverviewCard({
  report,
  regions,
  weekSets,
}: {
  /** 로그인 전/집계 실패면 null. */
  report: WeeklyReport | null;
  regions: WeeklySummaryRegion[];
  weekSets: number;
}) {
  const active = report ? hasWeeklyActivity(report.current) : false;
  // "전부 0세트"는 분석이 아니라 잔소리다 — 이번 주에 한 게 없으면 부위 칸은 안 그린다.
  const showTraining = weekSets > 0;
  // 이번 주에 아무 것도 없으면 빈 카드를 띄우지 않는다 — 홈이 0으로 도배된다.
  if (!active && !showTraining) return null;

  const untouched = regions.filter((r) => r.status === "none");
  const low = regions.filter((r) => r.status === "low");

  return (
    <section data-testid="weekly-report" className="app-card p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          이번 주
        </h2>
        {active ? (
          <Link
            href="/settings/progress"
            className="ml-auto inline-flex items-center text-sm text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            성장 그래프
            <ChevronRight aria-hidden="true" size={16} />
          </Link>
        ) : null}
      </div>

      {active && report ? (
        <>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {report.partial
              ? `${report.current.days}일째 · 지난주 같은 요일까지와 비교`
              : "한 주 전체 · 지난주와 비교"}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Stat
              label="운동한 날"
              value={`${report.current.workoutDays}일`}
              delta={report.deltas.workoutDays}
              unit="일"
            />
            <Stat
              label="운동 시간"
              value={formatMinutes(report.current.workoutMinutes)}
              delta={report.deltas.workoutMinutes}
              unit="분"
            />
            <Stat
              label="총 볼륨"
              value={`${report.current.volumeKg.toLocaleString()}kg`}
              delta={report.deltas.volumeKg}
              unit="kg"
            />
          </div>
          {report.current.bodyParts.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <li className="text-zinc-400 dark:text-zinc-500">볼륨 비중</li>
              {report.current.bodyParts.slice(0, 4).map((p) => (
                <li key={p.part} className="tabular-nums">
                  {p.label} {Math.round(p.ratio * 100)}%
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {showTraining ? (
        <Link
          href="/settings/score"
          data-testid="weekly-training-summary"
          data-week-sets={weekSets}
          className={`block ${active ? "mt-3 border-t border-[var(--line)] pt-3" : "mt-2"}`}
        >
          <span className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">이번 주 훈련</span>
            <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {weekSets}세트
            </span>
            <ChevronRight
              aria-hidden="true"
              size={16}
              className="ml-auto shrink-0 text-zinc-400"
            />
          </span>

          {/* 부위 칸 — 진하기만으로도 "빈 곳"이 보인다. 숫자는 그 다음이다. */}
          <ul className="mt-2 grid grid-cols-6 gap-1.5">
            {regions.map((r) => (
              <li
                key={r.region}
                data-testid={`summary-region-${r.region}`}
                data-status={r.status}
                className="min-w-0 text-center"
                title={`${r.label} ${r.sets}세트 · ${VOLUME_LABEL[r.status]} (권장 ${WEEKLY_SET_MIN}~${WEEKLY_SET_MAX})`}
              >
                <span
                  className={`block h-1.5 w-full rounded-full ${REGION_BAR[r.status]}`}
                />
                <span className="mt-1 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {r.label}
                </span>
                <span className="block text-xs font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                  {r.sets}
                </span>
              </li>
            ))}
          </ul>

          <span className="mt-2 block text-xs">
            {untouched.length > 0 ? (
              <span className="text-warn">
                {untouched.map((r) => r.label).join("·")} 0세트
              </span>
            ) : low.length > 0 ? (
              <span className="text-warn">
                {low.map((r) => r.label).join("·")} 권장량 미달
              </span>
            ) : (
              <span className="text-brand">모든 부위가 권장량 안에 있어요</span>
            )}
          </span>
        </Link>
      ) : null}
    </section>
  );
}
