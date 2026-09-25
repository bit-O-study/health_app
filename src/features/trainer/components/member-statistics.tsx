import { MemberTrend } from "./member-trend";
import type { MemberReportData, ReportPeriod, summarizeMember } from "../member-report";

export function MemberStatistics({ stats, sharing, period }: {
  stats: ReturnType<typeof summarizeMember>;
  sharing: MemberReportData["sharing"];
  period: ReportPeriod;
}) {
  const n = (value: number) => value.toLocaleString("ko-KR");

  const metrics = [
    ["운동한 날", sharing.workout ? `${stats.workoutDays}일` : "비공개"],
    ["운동 시간", sharing.workout ? `${n(stats.minutes)}분` : "비공개"],
    ["완료 세트", sharing.workout ? `${n(stats.sets)}세트` : "비공개"],
    ["총 볼륨", sharing.workout ? `${n(stats.volume)}kg` : "비공개"],
    ["식단 기록", sharing.diet ? `${stats.dietDays}일` : "비공개"],
    ["체중 변화", !sharing.body ? "비공개" : stats.weightDelta === null ? "기록 부족" : `${stats.weightDelta > 0 ? "+" : ""}${stats.weightDelta}kg`],
  ];
  return <div className="space-y-5">
    <section aria-labelledby="summary-title" className="space-y-3">
      <h2 id="summary-title" className="text-lg font-bold">통계 요약</h2>
      <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-brand/5 p-5 sm:p-6">
        <p className="text-sm text-muted">선택한 기간의 운동</p>
        <p className="text-xl font-bold leading-snug">{!sharing.workout ? "운동 기록이 비공개예요" : stats.workoutDays === 0 ? "아직 완료한 운동이 없어요" : `${stats.workoutDays}일 동안 ${n(stats.sets)}세트를 완료했어요`}</p>
        <p className="text-sm text-muted">{sharing.workout ? `총 운동 시간 ${n(stats.minutes)}분` : "회원이 공유를 켜면 통계를 확인할 수 있어요."}</p>
      </div>
      <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-zinc-50 dark:bg-zinc-900 sm:grid-cols-3">{metrics.map(([label, value]) => <div key={label} className="min-w-0 border-b border-line p-4 odd:border-r sm:border-r sm:p-5">
        <dt className="text-sm text-muted">{label}</dt><dd className="mt-2 break-words text-xl font-bold tabular-nums">{value}</dd>
      </div>)}</dl>
    </section>
    {sharing.workout && <MemberTrend key={stats.series[0]?.label + period} series={stats.series} period={period} />}
    <details className="text-sm text-muted"><summary className="cursor-pointer py-2">통계 집계 기준</summary><p className="pt-2 leading-6">한국 시간 기준으로 완료한 근력·준비·마무리 운동의 날짜를 중복 없이 집계해요. 시간은 저장된 운동 시간, 볼륨은 완료 시점의 세트별 중량 기준이에요. 맨몸 운동의 볼륨은 0kg이며 체중 변화는 기간 내 첫 기록과 마지막 기록을 비교해요.</p></details>
  </div>;
}
