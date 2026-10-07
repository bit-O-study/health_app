import Link from "next/link";

import type { Delta, MemberTrend, TrendPeriod } from "@/features/trainer/trends";

/**
 * 트레이너 대시보드 회원 카드(2026-10-07) — 이번 기간 vs 지난 기간(같은 일수) 숫자 3개 + 최근 세트 선.
 * 회원이 공유를 끈 칸은 '비공개' 한 칸으로.
 */
export function MemberTrendCard({
  linkId,
  name,
  trend,
  period,
  prescription,
}: {
  linkId: string;
  name: string;
  trend: MemberTrend;
  period: TrendPeriod;
  prescription: boolean;
}) {
  const unit = period === "week" ? "지난주" : "지난달";
  return (
    <article className="space-y-3 py-4 first:pt-0 last:pb-0" data-testid="member-trend" data-dropped={trend.dropped ? "1" : "0"}>
      <div className="flex items-center gap-3">
        <h3 className="min-w-0 flex-1 truncate font-semibold">{name}</h3>
        {trend.spark ? <Spark values={trend.spark} dropped={trend.dropped} /> : null}
        <Link href={`/trainer/members/${linkId}`} className="app-press inline-flex h-9 shrink-0 items-center rounded-full bg-brand-soft px-4 text-sm font-semibold text-brand">
          관리
        </Link>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        {trend.days && trend.sets ? (
          <>
            <Stat label="운동한 날" value={`${trend.days.now}일`} d={trend.days} unit="" />
            <Stat label="세트" value={`${trend.sets.now}`} d={trend.sets} unit="" />
          </>
        ) : (
          <div className="col-span-2">
            <dt className="text-xs text-muted">운동</dt>
            <dd>비공개</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-muted">체중</dt>
          {trend.weight === null ? (
            <dd>비공개</dd>
          ) : trend.weight.now === null ? (
            <dd className="text-muted">기록 없음</dd>
          ) : (
            <dd>
              <span className="font-semibold tabular-nums">{trend.weight.now}kg</span>
              {trend.weight.diff !== null && trend.weight.diff !== 0 ? (
                <span className="block text-xs tabular-nums text-muted">
                  {trend.weight.diff > 0 ? "▲" : "▼"} {Math.abs(trend.weight.diff)}kg
                </span>
              ) : null}
            </dd>
          )}
        </div>
      </dl>
      <p className="text-xs text-muted">
        식단 기록{" "}
        {trend.diet === null ? (
          <span>비공개</span>
        ) : (
          <span className="tabular-nums">
            {trend.diet.now}일 · {unit} {trend.diet.prev}일
          </span>
        )}
        {!prescription ? " · 운동 처방은 회원의 허용을 기다리는 중" : ""}
      </p>
    </article>
  );
}

function Stat({ label, value, d, unit }: { label: string; value: string; d: Delta; unit: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd>
        <span className="font-semibold tabular-nums">{value}</span>
        <span className={`block text-xs font-semibold tabular-nums ${d.diff > 0 ? "text-brand" : d.diff < 0 ? "text-danger" : "text-muted"}`}>
          {d.diff > 0 ? `▲ ${d.diff}${unit}` : d.diff < 0 ? `▼ ${-d.diff}${unit}` : "―"}
        </span>
      </dd>
    </div>
  );
}

/** 최근 세트 선 — 끝점은 줄었으면 빨강. 모든 칸이 0이면 바닥선. */
function Spark({ values, dropped }: { values: number[]; dropped: boolean }) {
  const W = 72;
  const H = 24;
  const max = Math.max(1, ...values);
  const x = (i: number) => 2 + ((W - 4) * i) / Math.max(1, values.length - 1);
  const y = (v: number) => H - 3 - ((H - 6) * v) / max;
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-6 w-[72px] shrink-0" role="img" aria-label={`최근 세트 ${values.join(", ")}`}>
      <polyline points={pts} fill="none" className="stroke-brand" strokeWidth="1.8" />
      <circle cx={x(last)} cy={y(values[last])} r="2.6" className={dropped ? "fill-danger" : "fill-brand"} />
    </svg>
  );
}
