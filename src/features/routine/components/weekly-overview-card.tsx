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
 * 홈과 운동탭이 **같은 컴포넌트**를 쓴다 — 화면마다 다른 숫자를 말하지 않게.
 *
 * 비교 기준은 그대로다: 진행 중인 주는 **지난주 같은 요일까지**와 견준다(집계 쪽 규칙).
 * 다만 그 설명 문장은 화면에서 뺐다 — 숫자 옆 변화량(+1일)만 남긴다
 * (2026-09-15 "글씨가 너무 많아, 간결하게").
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

/**
 * 변화량 한 토막 — 늘었으면 숫자 **아래** 작은 브랜드색 줄, 그 외엔 안 그린다(0·감소는 잔소리라 숨김).
 * 숫자 옆에 붙이면 "4,800kg +4,800kg" 처럼 좁은 폰에서 잘렸다.
 */
function DeltaText({ delta, unit }: { delta: Delta; unit: string }) {
  if (delta.diff <= 0) return null;
  return (
    <span className="block truncate text-xs font-medium text-brand">
      +{delta.diff.toLocaleString()}
      {unit}
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
      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="truncate text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
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

  return (
    <section data-testid="weekly-report" className="app-card px-3 py-2.5">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">이번 주</h2>
        {active ? (
          <Link
            href="/settings/progress"
            aria-label="성장 그래프"
            className="-mr-1 ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition active:bg-zinc-100 dark:active:bg-white/[0.06]"
          >
            <ChevronRight aria-hidden="true" size={18} />
          </Link>
        ) : null}
      </div>

      {active && report ? (
        <div className="mt-1 grid grid-cols-3 gap-2">
          <Stat
            label="운동한 날"
            value={`${report.current.workoutDays}일`}
            delta={report.deltas.workoutDays}
            unit="일"
          />
          <Stat
            label="시간"
            value={formatMinutes(report.current.workoutMinutes)}
            delta={report.deltas.workoutMinutes}
            unit="분"
          />
          <Stat
            label="볼륨"
            value={`${report.current.volumeKg.toLocaleString()}kg`}
            delta={report.deltas.volumeKg}
            unit="kg"
          />
        </div>
      ) : null}

      {showTraining ? (
        <Link
          href="/settings/score"
          data-testid="weekly-training-summary"
          data-week-sets={weekSets}
          className={`block transition active:opacity-60 ${active ? "mt-2 border-t border-[var(--line)] pt-2" : "mt-1"}`}
        >
          <span className="flex items-center gap-2 text-sm">
            <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {weekSets}세트
            </span>
            {untouched.length > 0 ? (
              <span className="truncate text-warn">
                {untouched.map((r) => r.label).join("·")} 0세트
              </span>
            ) : null}
            <ChevronRight aria-hidden="true" size={16} className="ml-auto shrink-0 text-zinc-400" />
          </span>

          {/* 부위 칸 — 진하기만으로도 "빈 곳"이 보인다. */}
          <ul className="mt-2.5 grid grid-cols-6 gap-1.5">
            {regions.map((r) => (
              <li
                key={r.region}
                data-testid={`summary-region-${r.region}`}
                data-status={r.status}
                className="min-w-0 text-center"
                title={`${r.label} ${r.sets}세트 · ${VOLUME_LABEL[r.status]} (권장 ${WEEKLY_SET_MIN}~${WEEKLY_SET_MAX})`}
              >
                <span className={`block h-1.5 w-full rounded-full ${REGION_BAR[r.status]}`} />
                <span className="mt-1 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {r.label}
                </span>
              </li>
            ))}
          </ul>
        </Link>
      ) : null}
    </section>
  );
}
