import Link from "next/link";
import { ChevronRight, Dumbbell } from "lucide-react";

import {
  VOLUME_COLOR,
  VOLUME_LABEL,
  WEEKLY_SET_MAX,
  WEEKLY_SET_MIN,
  type VolumeStatus,
} from "@/features/routine/training-volume";

/**
 * 이번 주 훈련 **한 줄 요약** — 홈·운동탭용.
 *
 * 전체 카드는 점수 화면 안에만 있어서, 거기 들어가지 않으면 "이번 주 하체를 안 했다"를
 * 영영 모른다. 그렇다고 홈에 전체 카드를 얹으면 홈이 분석 화면이 된다.
 * 그래서 **행동으로 이어지는 것만** 남긴다 — 총 세트, 0세트인 부위, 눌러서 들어갈 길.
 *
 * 서버 컴포넌트 — 숫자만 받아 그린다(카탈로그가 클라 번들에 실리지 않게).
 */

export type WeeklySummaryRegion = {
  region: string;
  label: string;
  sets: number;
  status: VolumeStatus;
};

export function WeeklyTrainingSummary({
  regions,
  weekSets,
  stalledCount = 0,
}: {
  regions: WeeklySummaryRegion[];
  weekSets: number;
  /** 무게가 안 오르는 종목 수. 0이면 안 그린다. */
  stalledCount?: number;
}) {
  // 아직 이번 주에 아무것도 안 했으면 아무 말도 안 한다 — "전부 0세트"는
  // 분석이 아니라 잔소리다. 오늘 할 운동을 권하는 건 다른 카드의 몫이다.
  if (weekSets === 0) return null;

  const untouched = regions.filter((r) => r.status === "none");
  const low = regions.filter((r) => r.status === "low");

  return (
    <Link
      href="/settings/score"
      data-testid="weekly-training-summary"
      data-week-sets={weekSets}
      className="block rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-brand dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-brand"
    >
      <div className="flex items-center gap-2">
        <p className="flex items-center gap-1.5 text-sm font-bold text-zinc-950 dark:text-zinc-100">
          <Dumbbell
            aria-hidden="true"
            size={14}
            className="text-brand"
          />
          이번 주 훈련
        </p>
        <p className="text-sm font-bold tabular-nums text-brand">
          {weekSets}세트
        </p>
        <ChevronRight
          aria-hidden="true"
          size={16}
          className="ml-auto shrink-0 text-zinc-300 dark:text-zinc-600"
        />
      </div>

      {/* 부위 칸 — 색만으로도 "빈 곳"이 보인다. 숫자는 그 다음이다. */}
      <ul className="mt-2.5 grid grid-cols-6 gap-1">
        {regions.map((r) => (
          <li
            key={r.region}
            data-testid={`summary-region-${r.region}`}
            data-status={r.status}
            className="min-w-0 text-center"
            title={`${r.label} ${r.sets}세트 · ${VOLUME_LABEL[r.status]} (권장 ${WEEKLY_SET_MIN}~${WEEKLY_SET_MAX})`}
          >
            <span className="block truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {r.label}
            </span>
            <span
              className="mt-0.5 block h-1.5 w-full rounded-full"
              style={{ backgroundColor: VOLUME_COLOR[r.status] }}
            />
            <span className="mt-0.5 block text-xs font-bold tabular-nums text-zinc-600 dark:text-zinc-300">
              {r.sets}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
        {untouched.length > 0 ? (
          <span className="text-rose-600 dark:text-rose-400">
            {untouched.map((r) => r.label).join("·")} 0세트
          </span>
        ) : low.length > 0 ? (
          <span className="text-amber-600 dark:text-amber-400">
            {low.map((r) => r.label).join("·")} 권장량 미달
          </span>
        ) : (
          <span className="text-brand">
            모든 부위가 권장량 안에 있어요
          </span>
        )}
        {stalledCount > 0 ? (
          <span className="ml-1.5 text-zinc-500 dark:text-zinc-400">
            · 무게 정체 {stalledCount}종목
          </span>
        ) : null}
      </p>
    </Link>
  );
}
