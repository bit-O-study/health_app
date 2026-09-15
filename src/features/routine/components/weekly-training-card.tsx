import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Scale,
  TrendingDown,
} from "lucide-react";

import {
  VOLUME_COLOR,
  VOLUME_LABEL,
  WEEKLY_FREQ_MIN,
  WEEKLY_SET_MAX,
  WEEKLY_SET_MIN,
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
  const maxCell = Math.max(1, ...cells.map((c) => c.total));

  return (
    <section
      data-testid="weekly-training-card"
      data-week-start={weekStart}
      data-week-sets={weekTotal}
      className="app-card p-6"
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
          <CalendarDays
            aria-hidden="true"
            size={16}
            className="mr-1.5 inline align-[-2px] text-brand"
          />
          이번 주 훈련
        </h2>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          {trainedDays}일 · {weekTotal}세트
        </span>
      </div>
      <p className="mb-4 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        근육군당 <strong>주당 직접 세트 {WEEKLY_SET_MIN}~{WEEKLY_SET_MAX}</strong>,{" "}
        <strong>주 {WEEKLY_FREQ_MIN}회 이상</strong>을 기준으로 봅니다. 한 운동은{" "}
        <strong>주동근 한 부위에만</strong> 셉니다 — 벤치프레스는 가슴 세트이지 삼두
        세트가 아닙니다. 화살표는 <strong>지난주 대비</strong>입니다.
      </p>

      {/* 요일 히트맵 — 쉰 날도 칸을 남긴다. 빈칸이 보여야 "어디를 안 했는지"가 읽힌다. */}
      <ol className="mb-5 grid grid-cols-7 gap-1.5" data-testid="week-heatmap">
        {cells.map((c) => {
          const isToday = c.ymd === todayYmd;
          const strength = c.total === 0 ? 0 : 0.25 + (c.total / maxCell) * 0.75;
          return (
            <li key={c.ymd} className="min-w-0">
              <div
                data-testid={`heat-${c.weekday}`}
                data-sets={c.total}
                title={`${c.ymd} · ${c.total}세트${c.topLabel ? ` · ${c.topLabel}` : ""}`}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 rounded-lg border text-center ${
                  isToday
                    ? "border-brand/40"
                    : "border-zinc-200 dark:border-zinc-700"
                }`}
                style={
                  c.total > 0 && c.topColor
                    ? { backgroundColor: `${c.topColor}${alphaHex(strength)}` }
                    : undefined
                }
              >
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  {WEEKDAY[c.weekday]}
                </span>
                {c.total > 0 ? (
                  <>
                    <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {c.total}
                    </span>
                    <span className="w-full truncate px-0.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      {c.topLabel}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-zinc-300 dark:text-zinc-600">
                    —
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* 부위별 주당 세트 */}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {regions.map((r) => (
          <li
            key={r.region}
            data-testid={`region-volume-${r.region}`}
            data-sets={r.sets}
            data-status={r.status}
            className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
          >
            <div className="flex items-center justify-between gap-1.5">
              <p className="truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {r.label}
              </p>
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold text-white"
                style={{ backgroundColor: VOLUME_COLOR[r.status] }}
              >
                {VOLUME_LABEL[r.status]}
              </span>
            </div>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold tabular-nums text-zinc-950 dark:text-zinc-100">
                {r.sets}
                <span className="ml-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  세트
                </span>
              </span>
              {/* 지난주 대비 — 숫자만 보면 늘고 있는지 줄고 있는지 알 수 없다. */}
              {r.delta.diff !== 0 ? (
                <span
                  data-testid={`region-delta-${r.region}`}
                  data-diff={r.delta.diff}
                  className={`inline-flex items-center text-xs font-bold tabular-nums ${
                    r.delta.diff > 0
                      ? "text-brand"
                      : "text-zinc-400 dark:text-zinc-500"
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
            </p>
            {/* 권장 상한을 100%로 둔 막대 — 어디쯤인지 눈으로 보이게. */}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.round((r.sets / WEEKLY_SET_MAX) * 100))}%`,
                  backgroundColor: VOLUME_COLOR[r.status],
                }}
              />
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {r.daysAgo === null
                  ? "최근 기록 없음"
                  : r.daysAgo === 0
                    ? "오늘 함"
                    : `${r.daysAgo}일 전`}
              </span>
              {r.days > 0 ? <span>· 주 {r.days}회</span> : null}
            </p>
            {/* 🔴 세트는 채웠는데 하루에 몰아친 경우. 같은 양이면 나눠 하는 쪽이 낫다는 게
                지금 문헌의 대체적 결론이라, 양과 **따로** 말해 준다. */}
            {r.crammed ? (
              <p
                data-testid={`region-crammed-${r.region}`}
                className="mt-1 flex items-start gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400"
              >
                <AlertTriangle aria-hidden="true" size={10} className="mt-0.5 shrink-0" />
                하루에 몰아침 · 주 {WEEKLY_FREQ_MIN}회로 나누면 더 좋아요
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {/* 균형 — 부위 세트가 이미 있어서 거의 공짜로 나오는 지표 둘. */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
        <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            <TrendingDown
              aria-hidden="true"
              size={14}
              className="mr-1.5 inline align-[-2px] text-amber-600 dark:text-amber-400"
            />
            무게가 안 오르는 종목
            <span className="ml-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {stalled.length}개
            </span>
          </p>
          <ul className="mt-2 space-y-1.5" data-testid="stalled-exercises">
            {stalled.map((st) => (
              <li
                key={st.exerciseId}
                data-exercise={st.exerciseId}
                data-sessions={st.sessions}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg bg-amber-50 px-2.5 py-1.5 dark:bg-amber-950/30"
              >
                <span className="rounded bg-amber-200/70 px-1 text-xs font-bold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                  {st.regionLabel}
                </span>
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {st.name}
                </span>
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  {st.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 이번 주 안 건드린 세부근육 — '몇 세트 부족'이 아니라 0인 것만 말한다(아래 주석). */}
      <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          이번 주 한 번도 안 한 세부근육
          <span className="ml-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {untouchedSubs.length}개
          </span>
        </p>
        <p className="mt-0.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          세부근육은 <strong>했는지 안 했는지</strong>만 말합니다. 운동마다 걸리는 세부근육
          수가 크게 달라(상복부 254개 ↔ 하복부 19개) 세트 수끼리 비교하면 내 훈련이 아니라
          매핑의 치우침을 보게 됩니다.
        </p>
        {untouchedSubs.length === 0 ? (
          <p className="mt-2 text-xs font-semibold text-brand">
            이번 주 모든 세부근육을 한 번 이상 건드렸습니다.
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-1.5" data-testid="untouched-subs">
            {untouchedSubs.map((s) => (
              <li
                key={s.id}
                data-sub={s.id}
                className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
              >
                {s.label}
              </li>
            ))}
          </ul>
        )}
        {/* 거들기만 한 것 — '했다'와 '안 했다' 사이. 벤치프레스만 하고 하부 대흉근을
            했다고 세면, 정작 하부를 노린 적은 없는데 채워진 것처럼 보인다. */}
        {synergistOnlySubs.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              거들기만 하고 직접 노리진 않은 곳
              <span className="ml-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {synergistOnlySubs.length}개
              </span>
            </p>
            <ul
              className="mt-1.5 flex flex-wrap gap-1.5"
              data-testid="synergist-only-subs"
            >
              {synergistOnlySubs.map((s) => (
                <li
                  key={s.id}
                  data-sub={s.id}
                  className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!viewerIsOther && untouchedSubs.length > 0 ? (
          <Link
            href="/plan/muscle"
            className="mt-3 inline-flex text-xs font-bold text-brand"
          >
            부위별로 운동 찾아보기 →
          </Link>
        ) : null}
      </div>
    </section>
  );
}

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
    <div
      data-testid={`balance-${label}`}
      data-skewed={balance.skewed}
      className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          <Scale aria-hidden="true" size={12} className="mr-1 inline align-[-2px]" />
          {label}
        </p>
        <p className="text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-200">
          {balance.a} : {balance.b}
        </p>
      </div>
      <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
        <div
          className={balance.skewed ? "bg-amber-500" : "bg-brand"}
          style={{ width: `${aPct}%` }}
        />
        <div
          className={balance.skewed ? "bg-amber-300" : "bg-brand/60"}
          style={{ width: `${100 - aPct}%` }}
        />
      </div>
      <p className="mt-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{aLabel}</span>
        <span>{bLabel}</span>
      </p>
      {balance.skewed ? (
        <p className="mt-1.5 flex items-start gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <AlertTriangle aria-hidden="true" size={11} className="mt-0.5 shrink-0" />
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** 0~1 강도를 8자리 hex 색의 알파 두 자리로. (배경색 농도용) */
function alphaHex(strength: number): string {
  const a = Math.round(Math.max(0, Math.min(1, strength)) * 255);
  return a.toString(16).padStart(2, "0");
}
