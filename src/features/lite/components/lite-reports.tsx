import Link from "next/link";

import { sparkPoints } from "@/features/routine/fit-growth";
import { CHECKIN_ITEM_LABEL, signed } from "@/features/lite/reports";
import type { LiteReports } from "@/features/lite/reports-data";

const KIND_CELL = {
  good: "bg-brand",
  normal: "bg-brand/40",
  light: "bg-danger/70",
} as const;

/** 기록이 없는 카드는 그리지 않는다(2026-10-06) — 맨 아래 '이렇게 기록하면' 한 장으로 모은다. */
function Card({ title, testId, empty = false, children }: { title: string; testId: string; empty?: boolean; children: React.ReactNode }) {
  if (empty) return null;
  return (
    <section className="app-card space-y-2 p-3" data-testid={testId}>
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-500 dark:text-zinc-400">{children}</p>;
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm text-zinc-800 dark:text-zinc-100">
      <span>{label}</span>
      <span className="tabular-nums">
        {value}
        {sub ? <span className="ml-1 text-xs text-zinc-500">{sub}</span> : null}
      </span>
    </div>
  );
}

const md = (ymd: string | null) => (ymd ? `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}` : "");
const fmt = (n: number) => n.toLocaleString("ko-KR");

/**
 * 라이트 리포트 4종(2026-10-02 혜택 1단계) — 맞춤 운동 › 리포트 탭, 운동 월간 리포트 아래.
 * 체성분 변화 · 컨디션 · 식단 월간 · 수분/걸음 주간. 모두 내 기록 계산(AI 없음).
 */
export function LiteReportCards({ r }: { r: LiteReports }) {
  const { body, condition, diet, dietTarget, habits } = r;
  return (
    <>
      <Card title="체성분 변화" testId="lite-report-body" empty={body.count === 0}>
        {body.count === 0 ? (
          <Empty>
            아직 측정 기록이 없어요.{" "}
            <Link href="/settings/body-composition" className="font-semibold text-brand">
              체성분 입력 →
            </Link>
          </Empty>
        ) : (
          <>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              측정 {body.count}번 · 최근 {md(body.latestDate)}
              {body.prevDate ? ` · 지난 측정 ${md(body.prevDate)}` : ""}
            </p>
            <ul className="space-y-2">
              {body.lines.map((l) => (
                <li key={l.key} className="space-y-0.5" data-testid={`lite-body-${l.key}`}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-zinc-800 dark:text-zinc-100">{l.label}</span>
                    <span className="tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                      {fmt(l.latest)}
                      {l.unit}
                      {l.sincePrev != null ? (
                        <span
                          className={`ml-1.5 text-xs font-semibold ${
                            l.better === null ? "text-zinc-500" : l.better ? "text-brand" : "text-danger"
                          }`}
                        >
                          지난번 {signed(l.sincePrev)}
                          {l.sinceFirst != null && body.count > 2 ? ` · 처음 ${signed(l.sinceFirst)}` : ""}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {l.series.length > 1 ? (
                    <svg viewBox="0 0 200 28" className="h-5 w-full" aria-hidden="true" preserveAspectRatio="none">
                      <polyline
                        points={sparkPoints(l.series, 200, 28)}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={l.better === false ? "text-danger" : "text-brand"}
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card title="컨디션 (최근 4주)" testId="lite-report-condition" empty={condition.checked === 0}>
        {condition.checked === 0 ? (
          <Empty>오늘 운동 화면에서 컨디션(잠·근육통·기운)을 누르면 여기에 쌓여요.</Empty>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1" aria-label="최근 4주 컨디션">
              {condition.days.map((d) => (
                <span
                  key={d.date}
                  title={`${md(d.date)} ${d.kind === "good" ? "좋음" : d.kind === "normal" ? "보통" : d.kind === "light" ? "안 좋음" : "기록 없음"}`}
                  className={`h-5 rounded ${d.kind ? KIND_CELL[d.kind] : "bg-zinc-100 dark:bg-white/[0.08]"}`}
                />
              ))}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              좋음 {condition.counts.good}일 · 보통 {condition.counts.normal}일 · 안 좋음 {condition.counts.light}일
            </p>
            {condition.avgVolumeGood != null && condition.avgVolumeLight != null ? (
              <p className="text-sm text-zinc-700 dark:text-zinc-200" data-testid="lite-condition-volume">
                컨디션 좋은 날 평균 <b>{fmt(condition.avgVolumeGood)}kg</b>, 안 좋은 날 <b>{fmt(condition.avgVolumeLight)}kg</b>{" "}
                들었어요.
              </p>
            ) : null}
            {condition.weakest ? (
              <p className="text-sm text-zinc-700 dark:text-zinc-200">
                가장 자주 나빴던 건 <b>{CHECKIN_ITEM_LABEL[condition.weakest]}</b>이에요.
                {condition.weakest === "sleep" ? " 잠을 챙기면 기록이 같이 올라가요." : ""}
              </p>
            ) : null}
          </>
        )}
      </Card>

      <Card title={`${Number(diet.month.slice(5))}월 식단`} testId="lite-report-diet" empty={diet.loggedDays === 0}>
        {diet.loggedDays === 0 ? (
          <Empty>이번 달 식단 기록이 아직 없어요.</Empty>
        ) : (
          <>
            <Row label="기록한 날" value={`${diet.loggedDays}일`} />
            <Row label="하루 평균" value={`${fmt(diet.avgKcal)}kcal`} sub={`목표 ${fmt(dietTarget.kcal)}`} />
            <Row label="단백질 평균" value={`${diet.avgProteinG}g`} sub={`목표 ${dietTarget.proteinG}g`} />
            <Row label="단백질 채운 날" value={`${diet.proteinHitDays}일`} sub={`/ ${diet.loggedDays}일`} />
            <Row label="칼로리 목표 ±10% 안" value={`${diet.kcalOnTargetDays}일`} />
            <Row label="탄·단·지 평균" value={`${diet.avgCarbsG} · ${diet.avgProteinG} · ${diet.avgFatG}g`} />
            {diet.proteinWorkoutDays != null && diet.proteinRestDays != null ? (
              <p className="text-sm text-zinc-700 dark:text-zinc-200">
                운동한 날 단백질 <b>{diet.proteinWorkoutDays}g</b>, 쉰 날 <b>{diet.proteinRestDays}g</b>
                {diet.proteinRestDays < dietTarget.proteinG ? " — 쉬는 날에도 근육은 회복 중이라 단백질을 채워 주세요." : "."}
              </p>
            ) : null}
            {diet.topFoods.length ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                자주 먹은 것: {diet.topFoods.map((f) => `${f.name} ${f.count}번`).join(" · ")}
              </p>
            ) : null}
          </>
        )}
      </Card>

      <Card title="수분·걸음 (최근 7일)" testId="lite-report-habits" empty={habits.water.thisWeek.days === 0 && habits.steps.thisWeek.days === 0}>
        {habits.water.thisWeek.days === 0 && habits.steps.thisWeek.days === 0 ? (
          <Empty>수분을 기록하거나 걸음 수를 연결하면 여기에 주간 리포트가 생겨요.</Empty>
        ) : (
          <>
            {[
              { label: "물", unit: "ml", s: habits.water, goal: habits.water.goalMl },
              { label: "걸음", unit: "보", s: habits.steps, goal: habits.steps.goal },
            ].map(({ label, unit, s, goal }) => (
              <div key={label} className="space-y-0.5">
                <Row
                  label={`${label} 하루 평균`}
                  value={s.thisWeek.avg == null ? "기록 없음" : `${fmt(s.thisWeek.avg)}${unit}`}
                  sub={s.lastWeek.avg == null ? undefined : `지난주 ${fmt(s.lastWeek.avg)}`}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  목표 {fmt(goal)}
                  {unit} 채운 날 {s.thisWeek.hitDays}일 / 기록 {s.thisWeek.days}일
                </p>
              </div>
            ))}
          </>
        )}
      </Card>
      <EmptyGroup
        items={[
          body.count === 0 ? { label: "체성분 입력", href: "/settings/body-composition" } : null,
          condition.checked === 0 ? { label: "컨디션 체크", href: "/routine" } : null,
          diet.loggedDays === 0 ? { label: "식단 기록", href: "/diet" } : null,
          habits.water.thisWeek.days === 0 && habits.steps.thisWeek.days === 0 ? { label: "수분·걸음", href: "/diet" } : null,
        ]}
      />
    </>
  );
}

/** 기록이 없는 리포트를 한 장으로 — 빈 카드 네 장이 이어지면 실제 내용보다 길어진다. */
function EmptyGroup({ items }: { items: ({ label: string; href: string } | null)[] }) {
  const list = items.filter((x): x is { label: string; href: string } => x !== null);
  if (list.length === 0) return null;
  return (
    <section className="app-card space-y-2 p-3" data-testid="lite-report-empty">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">기록하면 더 보여요</h2>
      <div className="flex flex-wrap gap-1.5">
        {list.map((it) => (
          <Link
            key={it.label}
            href={it.href}
            className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand"
          >
            {it.label} →
          </Link>
        ))}
      </div>
    </section>
  );
}
