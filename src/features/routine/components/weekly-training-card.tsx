import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";

import {
  VOLUME_LABEL,
  WEEKLY_FREQ_MIN,
  WEEKLY_SET_MAX,
  type Balance,
  type SetsDelta,
  type VolumeStatus,
} from "@/features/routine/training-volume";

/**
 * 이번 주 훈련 한눈에 — 요일×부위 히트맵 + 부위별 주당 세트 + 균형 경고.
 *
 * 🔴 **서버가 계산한 결과만 받는다.** 세부근육·부위 판정에는 운동 카탈로그(1,237개,
 * 274 KiB)가 필요한데, 그걸 여기서 import 하면 화면마다 목록이 통째로 실린다
 * (`client-catalog-weight.test.ts` 가 그걸 막는다). 그래서 이 파일은 숫자만 그린다.
 *
 * 촘촘한 한 장(2026-09-16 8단계) — 설명 문단은 빼고, 판정 색은 토큰만(적정 brand · 부족/많음 warn ·
 * 안 함 회색). 숫자·판정·data-* 는 그대로다.
 *
 * 서버 컴포넌트다 — 상태도 이벤트도 없다. 트레이너 화면과 내 점수 화면이 **같은 것**을
 * 봐야 하므로 한 컴포넌트를 둘이 쓴다.
 */

const WEEKDAY = ["월", "화", "수", "목", "금", "토", "일"];

export type WeeklyRegionRow = {
  region: string;
  label: string;
  /** 이번 주 직접 세트 수. */
  sets: number;
  status: VolumeStatus;
  /** 이번 주 이 부위를 한 날 수. 세트를 몰아쳤는지 보려면 세트와 따로 봐야 한다. */
  days: number;
  /** 세트는 채웠는데 하루에 몰아친 경우. */
  crammed: boolean;
  /** 지난주 같은 부위 세트 수. */
  prevSets: number;
  delta: SetsDelta;
  /** 마지막으로 이 부위를 한 날. null = 조회 기간 안에 없음. */
  lastYmd: string | null;
  daysAgo: number | null;
};

export type WeeklyStall = {
  exerciseId: string;
  name: string;
  regionLabel: string;
  sessions: number;
  reason: string;
};

export type WeeklyHeatCell = {
  ymd: string;
  weekday: number;
  total: number;
  /** 그 날 가장 많이 한 부위 라벨. 없으면 null. */
  topLabel: string | null;
  topColor: string | null;
};

export function WeeklyTrainingCard({
  weekStart,
  todayYmd,
  cells,
  regions,
  pushPull,
  upperLower,
  untouchedSubs,
  synergistOnlySubs,
  stalled,
  /** 트레이너가 회원 화면에서 볼 때 — 2인칭 문구를 안 쓰고 링크도 감춘다. */
  viewerIsOther = false,
}: {
  weekStart: string;
  todayYmd: string;
  cells: WeeklyHeatCell[];
  regions: WeeklyRegionRow[];
  pushPull: Balance;
  upperLower: Balance;
  untouchedSubs: { id: string; label: string }[];
  synergistOnlySubs: { id: string; label: string }[];
  stalled: WeeklyStall[];
  viewerIsOther?: boolean;
}) {
  const weekTotal = regions.reduce((s, r) => s + r.sets, 0);
  const trainedDays = cells.filter((c) => c.total > 0).length;

  return (
    <section
      data-testid="weekly-training-card"
      data-week-start={weekStart}
      data-week-sets={weekTotal}
    >
      <div className="flex items-baseline gap-1.5">
        <h2 className="app-section-label">이번 주 훈련</h2>
        <span className="mb-1.5 text-xs tabular-nums text-zinc-400">
          {trainedDays}일 · {weekTotal}세트
        </span>
      </div>
      <div className="app-card space-y-3 p-3">
        {/* 요일 줄 — 쉰 날도 칸을 남긴다. 빈칸이 보여야 "어디를 안 했는지"가 읽힌다. */}
        <ol className="grid grid-cols-7 gap-1" data-testid="week-heatmap">
          {cells.map((c) => {
            const isToday = c.ymd === todayYmd;
            const trained = c.total > 0;
            return (
              <li key={c.ymd} className="min-w-0">
                <div
                  data-testid={`heat-${c.weekday}`}
                  data-sets={c.total}
                  title={`${c.ymd} · ${c.total}세트${c.topLabel ? ` · ${c.topLabel}` : ""}`}
                  className={`flex h-11 flex-col items-center justify-center rounded-[10px] text-center ${
                    trained
                      ? "bg-brand text-white dark:text-zinc-950"
                      : "bg-zinc-100 text-zinc-500 dark:bg-white/[0.06] dark:text-zinc-400"
                  } ${isToday ? "ring-2 ring-brand/40" : ""}`}
                >
                  <span className="text-xs leading-4">{WEEKDAY[c.weekday]}</span>
                  <span className="w-full truncate px-0.5 text-xs font-semibold leading-4 tabular-nums">
                    {trained ? (c.topLabel ?? c.total) : "·"}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        {/* 부위별 주당 세트 — 이름 · 세트(지난주 대비) · 판정 한 줄 + 얇은 막대 */}
        <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-[var(--line)] pt-3">
          {regions.map((r) => (
            <li
              key={r.region}
              data-testid={`region-volume-${r.region}`}
              data-sets={r.sets}
              data-status={r.status}
              className="min-w-0"
            >
              <div className="flex items-baseline gap-1.5">
                <span className="truncate text-sm text-zinc-900 dark:text-zinc-100">{r.label}</span>
                <span className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                  {r.sets}
                </span>
                {/* 지난주 대비 — 숫자만 보면 늘고 있는지 줄고 있는지 알 수 없다. */}
                {r.delta.diff !== 0 ? (
                  <span
                    data-testid={`region-delta-${r.region}`}
                    data-diff={r.delta.diff}
                    className={`inline-flex items-center text-xs tabular-nums ${
                      r.delta.diff > 0 ? "text-brand" : "text-zinc-400 dark:text-zinc-500"
                    }`}
                    title={`지난주 ${r.prevSets}세트`}
                  >
                    {r.delta.diff > 0 ? (
                      <ArrowUp aria-hidden="true" size={10} />
                    ) : (
                      <ArrowDown aria-hidden="true" size={10} />
                    )}
                    {Math.abs(r.delta.diff)}
                  </span>
                ) : null}
                <span className={`ml-auto shrink-0 text-xs font-semibold ${STATUS_TEXT[r.status]}`}>
                  {VOLUME_LABEL[r.status]}
                </span>
              </div>
              {/* 권장 상한을 100%로 둔 막대 — 어디쯤인지 눈으로 보이게. */}
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
                <div
                  className={`h-full rounded-full ${STATUS_BAR[r.status]}`}
                  style={{ width: `${Math.min(100, Math.round((r.sets / WEEKLY_SET_MAX) * 100))}%` }}
                />
              </div>
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                {r.daysAgo === null ? "기록 없음" : r.daysAgo === 0 ? "오늘" : `${r.daysAgo}일 전`}
                {r.days > 0 ? ` · 주 ${r.days}회` : null}
              </p>
              {/* 🔴 세트는 채웠는데 하루에 몰아친 경우. 같은 양이면 나눠 하는 쪽이 낫다는 게
                  지금 문헌의 대체적 결론이라, 양과 **따로** 말해 준다. */}
              {r.crammed ? (
                <p data-testid={`region-crammed-${r.region}`} className="truncate text-xs text-warn">
                  하루에 몰아침 · 주 {WEEKLY_FREQ_MIN}회로 나누기
                </p>
              ) : null}
            </li>
          ))}
        </ul>

        {/* 균형 — 부위 세트가 이미 있어서 거의 공짜로 나오는 지표 둘. */}
        <div className="space-y-2.5 border-t border-[var(--line)] pt-3">
          <BalanceRow
            label="밀기 ↔ 당기기"
            aLabel="가슴·어깨"
            bLabel="등"
            balance={pushPull}
            hint="어깨 통증은 미는 볼륨이 당기는 볼륨을 크게 넘을 때 흔합니다."
          />
          <BalanceRow
            label="상체 ↔ 하체"
            aLabel="상체"
            bLabel="하체"
            balance={upperLower}
            hint="하체는 빼먹기 쉬운데 전신 근력·대사에 가장 크게 기여합니다."
          />
        </div>

        {/* 🔴 정체를 **같은 화면에** 둔다. "삼두를 직접 노린 적 없음"(아래)과
            "벤치프레스 3주째 정체"(여기)는 같은 원인일 수 있는데, 두 화면에 흩어져
            있으면 아무도 잇지 못한다. */}
        {stalled.length > 0 ? (
          <div className="border-t border-[var(--line)] pt-3">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              무게가 안 오르는 종목
              <span className="ml-1.5 text-xs font-normal text-zinc-400">{stalled.length}개</span>
            </p>
            <ul className="mt-1.5 space-y-1" data-testid="stalled-exercises">
              {stalled.map((st) => (
                <li
                  key={st.exerciseId}
                  data-exercise={st.exerciseId}
                  data-sessions={st.sessions}
                  className="flex flex-wrap items-baseline gap-x-1.5 text-xs"
                >
                  <span className="text-zinc-500 dark:text-zinc-400">{st.regionLabel}</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{st.name}</span>
                  <span className="text-warn">{st.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* 이번 주 안 건드린 세부근육 — '몇 세트 부족'이 아니라 0인 것만 말한다.
            운동마다 걸리는 세부근육 수가 크게 달라(상복부 254개 ↔ 하복부 19개) 세트 수끼리
            비교하면 내 훈련이 아니라 매핑의 치우침을 보게 된다. */}
        <div className="border-t border-[var(--line)] pt-3">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            이번 주 안 한 세부근육
            <span className="ml-1.5 text-xs font-normal text-zinc-400">{untouchedSubs.length}개</span>
          </p>
          {untouchedSubs.length === 0 ? (
            <p className="mt-1 text-xs text-brand">모든 세부근육을 한 번 이상 했어요</p>
          ) : (
            <ul className="mt-1.5 flex flex-wrap gap-1" data-testid="untouched-subs">
              {untouchedSubs.map((s) => (
                <li
                  key={s.id}
                  data-sub={s.id}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"
                >
                  {s.label}
                </li>
              ))}
            </ul>
          )}
          {/* 거들기만 한 것 — '했다'와 '안 했다' 사이. 벤치프레스만 하고 하부 대흉근을
              했다고 세면, 정작 하부를 노린 적은 없는데 채워진 것처럼 보인다. */}
          {synergistOnlySubs.length > 0 ? (
            <div className="mt-2.5">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                거들기만 한 곳
                <span className="ml-1 text-zinc-400">{synergistOnlySubs.length}개</span>
              </p>
              <ul className="mt-1 flex flex-wrap gap-1" data-testid="synergist-only-subs">
                {synergistOnlySubs.map((s) => (
                  <li
                    key={s.id}
                    data-sub={s.id}
                    className="rounded-full border border-dashed border-zinc-300 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
                  >
                    {s.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!viewerIsOther && untouchedSubs.length > 0 ? (
            <Link href="/plan/muscle" className="mt-2 inline-flex text-xs font-semibold text-brand">
              부위별로 운동 찾아보기 →
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** 판정 글자색 — 적정만 브랜드, 부족·많음은 주의색, 안 함은 회색(빨강 배지 대신). */
const STATUS_TEXT: Record<VolumeStatus, string> = {
  none: "text-zinc-400 dark:text-zinc-500",
  low: "text-warn",
  optimal: "text-brand",
  high: "text-warn",
};
const STATUS_BAR: Record<VolumeStatus, string> = {
  none: "bg-transparent",
  low: "bg-warn",
  optimal: "bg-brand",
  high: "bg-warn",
};

function BalanceRow({
  label,
  aLabel,
  bLabel,
  balance,
  hint,
}: {
  label: string;
  aLabel: string;
  bLabel: string;
  balance: Balance;
  hint: string;
}) {
  const total = balance.a + balance.b;
  const aPct = total > 0 ? Math.round((balance.a / total) * 100) : 50;
  return (
    <div data-testid={`balance-${label}`} data-skewed={balance.skewed}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="min-w-0 truncate text-zinc-600 dark:text-zinc-300">
          {label}
          <span className="ml-1.5 text-zinc-400">
            {aLabel} : {bLabel}
          </span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {balance.a} : {balance.b}
        </span>
      </div>
      <div className="mt-1 flex h-1 w-full gap-0.5 overflow-hidden rounded-full">
        <div
          className={`rounded-full ${balance.skewed ? "bg-warn" : "bg-brand"}`}
          style={{ width: `${aPct}%` }}
        />
        <div
          className={`rounded-full ${balance.skewed ? "bg-warn/40" : "bg-brand/40"}`}
          style={{ width: `${100 - aPct}%` }}
        />
      </div>
      {balance.skewed ? <p className="mt-1 text-xs text-warn">{hint}</p> : null}
    </div>
  );
}
