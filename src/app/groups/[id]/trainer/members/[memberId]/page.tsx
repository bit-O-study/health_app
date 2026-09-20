import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { DAY_BLOCKS, isDayBlockId, seoulYmd } from "@/features/routine/data";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { getMemberReport, getMemberTodayPlan } from "@/features/groups/member-report-data";
import { reportRange, summarizeMember, todayPlanState, type ReportPeriod } from "@/features/groups/member-report";
import { MemberPrescription, MemberTodayPrescription } from "@/features/groups/components/member-prescription";
import { EQUIPMENT_LABELS, type EquipmentId } from "@/features/routine/exercise-catalog-labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "회원 통계 · 운동 처방" };
const periods: { id: ReportPeriod; label: string }[] = [{ id: "week", label: "주간" }, { id: "month", label: "월간" }, { id: "year", label: "연간" }];
export default async function MemberManagementPage({ params, searchParams }: {
  params: Promise<{ id: string; memberId: string }>;
  searchParams: Promise<{ period?: string; date?: string }>;
}) {
  if (!await getCurrentUser()) redirect("/login");
  const { id, memberId } = await params;
  const query = await searchParams;
  const period = periods.find(p => p.id === query.period)?.id ?? "week";
  let date = typeof query.date === "string" ? query.date : seoulYmd();
  let range;
  try { range = reportRange(period, date); } catch { date = seoulYmd(); range = reportRange(period, date); }
  // 오늘 처방은 리포트와 독립이라 같은 물결에 실어 보낸다(왕복 1회 절약).
  const [data, todayPlan] = await Promise.all([
    getMemberReport(id, memberId, range.from, range.to),
    getMemberTodayPlan(id, memberId),
  ]);
  if (!data) notFound();
  const sharing = data.sharing;
  const stats = summarizeMember(data, period, range.from, range.to);
  const url = `/groups/${id}/trainer/members/${memberId}`;
  const shift = (day: string, delta: number) => {
    const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + delta); return d.toISOString().slice(0, 10);
  };
  const n = (value: number) => value.toLocaleString("ko-KR");
  const maxVolume = Math.max(1, ...stats.series.map(s => s.volume));
  // 카탈로그 이름·기구 선택지 — 영구 루틴 행과 오늘 행이 **같은 규칙**으로 붙인다.
  const decorate = (row: { exercise_id: string; equipment: string }) => {
    const catalog = getCatalogExercise(row.exercise_id);
    const equipment = row.equipment as EquipmentId;
    const choices = catalog?.equipments.map(e => e.equipment) ?? [];
    if (equipment in EQUIPMENT_LABELS && !choices.includes(equipment)) choices.push(equipment);
    return { name: catalog?.name ?? row.exercise_id, equipments: choices };
  };
  const rows = data.exercises.map(row => ({
    ...row, ...decorate(row),
    dayLabel: row.day_index === null ? "공통 운동" : `${row.day_index + 1}일차`,
  }));
  const today = todayPlanState(sharing.prescription ? todayPlan : null);
  const todayDate = todayPlan?.date ?? seoulYmd();
  const [, todayMm, todayDd] = todayDate.split("-");
  const todayLabel = `오늘(${Number(todayMm)}월 ${Number(todayDd)}일)`;
  const todayRows = (todayPlan?.rows ?? []).map(row => ({
    ...row, ...decorate(row),
    focusLabel: isDayBlockId(row.focus) ? DAY_BLOCKS[row.focus].label : row.focus,
  }));
  return <main className="app-page app-container space-y-6">
    <Link href={`/groups/${id}/trainer`} className="text-sm text-emerald-600">← 회원 관리</Link>
    <header><h1 className="text-xl font-bold">{data.name} 님 관리</h1><p className="mt-1 text-sm text-zinc-500">운동 통계와 운동 처방을 한곳에서 확인하세요.</p></header>
    <nav aria-label="통계 기간" className="flex gap-2">{periods.map(p => <Link key={p.id} href={`${url}?period=${p.id}&date=${date}`} aria-current={period === p.id ? "page" : undefined} className={`rounded-lg px-4 py-2 text-sm font-semibold ${period === p.id ? "bg-emerald-600 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}>{p.label}</Link>)}</nav>
    <form className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="period" value={period} />
      <label className="text-sm">기준 날짜<input type="date" name="date" defaultValue={date} key={date} required className="ml-2 rounded-lg border border-zinc-300 bg-transparent p-2 dark:border-zinc-700" /></label>
      <button type="submit" className="rounded-lg border px-3 py-2 text-sm">조회</button>
    </form>
    <div className="flex items-center justify-between gap-2 text-sm">
      <Link aria-label="이전 기간" href={`${url}?period=${period}&date=${shift(range.from, -1)}`}>← 이전</Link>
      <p>{range.from} ~ {range.to}</p>
      <Link aria-label="다음 기간" href={`${url}?period=${period}&date=${shift(range.to, 1)}`}>다음 →</Link>
    </div>
    <section aria-labelledby="summary-title" className="space-y-3">
      <h2 id="summary-title" className="text-lg font-bold">통계 요약</h2>
      <p className="text-sm leading-6">{!sharing.workout ? "회원이 운동 기록을 비공개로 설정했어요." : stats.workoutDays === 0 ? "선택한 기간에 완료한 운동 기록이 없어요." : `선택한 기간에 ${stats.workoutDays}일 운동하고 ${n(stats.sets)}세트를 완료했어요.`} {sharing.diet ? `식단은 ${stats.dietDays}일 기록했어요.` : "식단 기록은 비공개예요."}{!sharing.body ? " 체중 기록은 비공개예요." : stats.weightDelta !== null ? ` 체중은 기간 내 첫 기록 대비 ${stats.weightDelta > 0 ? "+" : ""}${stats.weightDelta}kg 변했어요.` : " 체중 변화를 보려면 기간 내 기록이 2개 이상 필요해요."}</p>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">{[
        ["운동한 날", sharing.workout ? `${stats.workoutDays}일` : "비공개"], ["운동 시간", sharing.workout ? `${n(stats.minutes)}분` : "비공개"], ["완료 세트", sharing.workout ? `${n(stats.sets)}세트` : "비공개"],
        ["총 볼륨", sharing.workout ? `${n(stats.volume)}kg` : "비공개"], ["식단 기록", sharing.diet ? `${stats.dietDays}일` : "비공개"], ["체중 변화", !sharing.body ? "비공개" : stats.weightDelta === null ? "기록 부족" : `${stats.weightDelta > 0 ? "+" : ""}${stats.weightDelta}kg`],
      ].map(([label,value]) => <div key={label} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700"><dt className="text-xs text-zinc-500">{label}</dt><dd className="mt-1 text-lg font-bold">{value}</dd></div>)}</dl>
      <p className="text-xs text-zinc-500">한국 시간 기준. 완료한 근력·준비·마무리 운동의 날짜를 중복 없이 집계합니다. 시간은 저장된 운동 시간, 볼륨은 완료 시점의 세트별 중량 기록 기준이며 맨몸 운동은 0kg입니다.</p>
    </section>
    {sharing.workout && <section aria-labelledby="trend-title" className="space-y-3">
      <h2 id="trend-title" className="text-lg font-bold">{period === "year" ? "월별" : "일별"} 운동 추이</h2>
      <div className="overflow-x-auto"><table className="w-full text-right text-xs"><caption className="sr-only">선택 기간의 운동일, 완료 세트, 운동 시간과 총 볼륨</caption><thead><tr className="border-b"><th className="p-2 text-left" scope="col">기간</th><th scope="col">운동일</th><th scope="col">세트</th><th scope="col">분</th><th className="min-w-24" scope="col">볼륨(kg)</th></tr></thead><tbody>{stats.series.map(s => <tr key={s.label} className="border-b border-zinc-100 dark:border-zinc-800"><th scope="row" className="p-2 text-left font-normal">{s.label.slice(5)}</th><td>{s.workoutDays}</td><td>{s.sets}</td><td>{s.minutes}</td><td className="py-2 pl-3">{n(s.volume)}<div aria-hidden="true" className="mt-1 h-1 bg-emerald-500" style={{ width: `${s.volume / maxVolume * 100}%` }} /></td></tr>)}</tbody></table></div>
    </section>}
    <div className="flex flex-wrap gap-3 text-sm font-semibold text-emerald-600">{sharing.prescription && <Link href={`/groups/${id}/trainer/assign/${memberId}`}>루틴 배정</Link>}<Link href={`/groups/${id}/trainer/comment/${memberId}`}>코멘트 · 처방 변경 내역</Link><Link href={`/groups/${id}/member/${memberId}`}>일별 상세 기록</Link></div>
    {sharing.prescription ? <>
      <MemberTodayPrescription groupId={id} memberId={memberId} memberName={data.name} dateLabel={todayLabel} rows={todayRows} notice={today.notice} />
      <MemberPrescription groupId={id} memberId={memberId} memberName={data.name} exercises={rows} />
    </> : <p className="text-sm">회원이 운동 처방을 허용하지 않았어요.</p>}
  </main>;
}
