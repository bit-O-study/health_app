import Link from "next/link";
import { MemberStatistics } from "@/features/trainer/components/member-statistics";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { DAY_BLOCKS, isDayBlockId, seoulYmd } from "@/features/routine/data";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { getMemberReport, getMemberTodayPlan } from "@/features/trainer/member-report-data";
import { reportRange, summarizeMember, todayPlanState, type ReportPeriod } from "@/features/trainer/member-report";
import { MemberPrescription, MemberTodayPrescription } from "@/features/trainer/components/member-prescription";
import { EQUIPMENT_LABELS, type EquipmentId } from "@/features/routine/exercise-catalog-labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "회원 통계 · 운동 처방" };
const periods: { id: ReportPeriod; label: string }[] = [{ id: "week", label: "주간" }, { id: "month", label: "월간" }, { id: "year", label: "연간" }];
export default async function MemberManagementPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; date?: string; view?: string; scope?: string }>;
}) {
  if (!await getCurrentUser()) redirect("/login");
  const { id } = await params;
  const db = await createSupabaseServerClient();
  const { data: connection } = await db.from("pt_links").select("member_id").eq("id", id).eq("trainer_id", (await getCurrentUser())!.id).eq("active", true).maybeSingle();
  if (!connection) notFound();
  const memberId = connection.member_id;
  const query = await searchParams;
  const view = query.view === "stats" ? "stats" : "prescription";
  const scope = query.scope === "today" ? "today" : "routine";
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
  const url = `/trainer/members/${id}`;
  const shift = (day: string, delta: number) => {
    const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + delta); return d.toISOString().slice(0, 10);
  };
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
    <Link href={`/trainer`} className="text-sm text-brand">← 회원 관리</Link>
    <header><h1 className="text-xl font-bold">{data.name} 님 관리</h1><p className="mt-1 text-sm text-zinc-500">운동 통계와 운동 처방을 한곳에서 확인하세요.</p></header>
    <nav aria-label="회원 관리 화면" className="grid grid-cols-2 gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800">{[{id:"prescription",label:"운동 처방"},{id:"stats",label:"운동 통계"}].map(item => <Link key={item.id} scroll={false} href={`${url}?view=${item.id}`} aria-current={view === item.id ? "page" : undefined} className={`rounded-xl px-4 py-3 text-center text-sm font-semibold ${view === item.id ? "bg-white text-foreground shadow-sm dark:bg-zinc-950" : "text-muted"}`}>{item.label}</Link>)}</nav>
    {view === "stats" ? <div className="space-y-5">
    <nav aria-label="통계 기간" className="flex gap-2">{periods.map(p => <Link key={p.id} href={`${url}?view=stats&period=${p.id}&date=${date}`} aria-current={period === p.id ? "page" : undefined} className={`rounded-lg px-4 py-2 text-sm font-semibold ${period === p.id ? "bg-brand text-white dark:text-zinc-950" : "bg-zinc-100 dark:bg-zinc-800"}`}>{p.label}</Link>)}</nav>
    <form className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="view" value="stats" />
      <input type="hidden" name="period" value={period} />
      <label className="text-sm">기준 날짜<input type="date" name="date" defaultValue={date} key={date} required className="ml-2 rounded-lg border border-zinc-300 bg-transparent p-2 dark:border-zinc-700" /></label>
      <button type="submit" className="rounded-lg border px-3 py-2 text-sm">조회</button>
    </form>
    <div className="flex items-center justify-between gap-2 text-sm">
      <Link aria-label="이전 기간" href={`${url}?view=stats&period=${period}&date=${shift(range.from, -1)}`}>← 이전</Link>
      <p>{range.from} ~ {range.to}</p>
      <Link aria-label="다음 기간" href={`${url}?view=stats&period=${period}&date=${shift(range.to, 1)}`}>다음 →</Link>
    </div>
    <MemberStatistics stats={stats} sharing={sharing} period={period} />
    </div> : <div className="space-y-5">
      <nav aria-label="처방 적용 범위" className="flex gap-2">{[{id:"routine",label:"영구 루틴"},{id:"today",label:"오늘만"}].map(item => <Link key={item.id} scroll={false} href={`${url}?scope=${item.id}`} aria-current={scope === item.id ? "page" : undefined} className={`min-h-11 rounded-full border px-5 py-3 text-sm font-semibold ${scope === item.id ? "border-brand bg-brand text-white dark:text-zinc-950" : "border-line text-muted"}`}>{item.label}</Link>)}</nav>
    {sharing.prescription ? <>
      {scope === "today" ? <MemberTodayPrescription connectionId={id} memberId={memberId} memberName={data.name} dateLabel={todayLabel} rows={todayRows} notice={today.notice} /> :
      <MemberPrescription connectionId={id} memberId={memberId} memberName={data.name} exercises={rows} />}
    </> : <p className="text-sm">회원이 운동 처방을 허용하지 않았어요. 회원 계정의 설정 → 트레이너 연결에서 운동 처방 허용을 켜고 저장하면 처방할 수 있어요.</p>}
    </div>}
  </main>;
}
