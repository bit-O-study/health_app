import { Logo } from "@/features/brand/logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getTrainerLinks, hasTrainerPass } from "@/features/trainer/data";
import { TrainerForm } from "@/features/trainer/forms";
import { MemberTrendCard } from "@/features/trainer/components/member-trend-card";
import { memberTrend, sortDroppedFirst, type TrainerTrendRow, type TrendPeriod } from "@/features/trainer/trends";
import { seoulYmd } from "@/features/routine/data";
export const dynamic = "force-dynamic";
/**
 * 트레이너 대시보드 — 회원 초대 + 담당 회원 주별/월별 변화(2026-10-07).
 * 이번 기간 vs 지난 기간(같은 일수), 줄어든 회원을 맨 위로. 공유 안 한 칸은 '비공개'.
 */
export default async function TrainerPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  if (!(await getCurrentUser())) redirect("/login?redirect=/trainer");
  if (!(await hasTrainerPass())) redirect("/settings/trainer-pass");
  const period: TrendPeriod = (await searchParams).period === "month" ? "month" : "week";
  const db = await createSupabaseServerClient();
  const [links, { data, error }] = await Promise.all([getTrainerLinks(true), db.rpc("pt_trainer_trends")]);
  if (error) throw new Error("회원 현황을 불러오지 못했어요.");
  const today = seoulYmd();
  const rows = new Map(((data ?? []) as TrainerTrendRow[]).map(r => [r.link, r]));
  const cards = sortDroppedFirst(links.map(link => ({
    link,
    trend: memberTrend(rows.get(link.id) ?? { link: link.id, workout: null, diet: null, body: null }, period, today),
  })).map(c => ({ ...c, dropped: c.trend.dropped })));
  const dropped = cards.filter(c => c.dropped).length;
  const tab = (p: TrendPeriod, label: string) => <Link href={p === "week" ? "/trainer" : "/trainer?period=month"} role="tab" aria-selected={period === p} className={`rounded-full px-3 py-1 font-semibold ${period === p ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50" : "text-muted"}`}>{label}</Link>;
  return <main className="app-container space-y-6 py-6"><div className="flex items-center justify-between"><div><Link href="/home" aria-label="헬쑤 홈" className="inline-flex min-h-11 items-center"><Logo size={40} wordClassName="text-2xl" /></Link><h1 className="sr-only">헬스 트레이너</h1></div><Link href="/settings/trainer-pass" className="text-sm text-brand">이용권 관리</Link></div>
    <section className="app-card space-y-4 p-5"><h2 className="font-semibold">회원 초대</h2>
      <p className="text-sm text-muted">회원이 초대 링크에서 공유 범위를 정하고 수락하면 연결돼요.</p>
      <TrainerForm intent="invite" label="초대 보내기">
        <label className="block text-sm">회원 휴대폰 번호<input type="tel" name="phone" required className="mt-1 min-h-11 w-full rounded-xl border border-line px-3" /></label>
        <label className="block text-sm">발송 방법<select name="channel" className="mt-1 min-h-11 w-full rounded-xl border border-line px-3"><option value="ATA">카카오 알림톡</option><option value="LMS">문자</option></select></label>
      </TrainerForm>
    </section>
    <section className="space-y-3" data-testid="trainer-trends" data-period={period}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">담당 회원 · {links.length}명</h2>
        <div role="tablist" aria-label="기간" className="inline-flex rounded-full bg-zinc-100 p-0.5 text-xs dark:bg-white/[0.08]">{tab("week", "주별")}{tab("month", "월별")}</div></div>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
        {period === "week" ? "이번 주 vs 지난주" : "이번 달 vs 지난달"} 같은 날짜까지 · 회원이 허용한 정보만 표시해요.
        {dropped > 0 ? <span className="rounded-full bg-danger/10 px-2 py-0.5 font-semibold text-danger" data-testid="dropped-count">줄어든 회원 {dropped}명</span> : null}
      </p>
      {!links.length ? <p className="app-card p-5 text-sm">아직 초대를 수락한 회원이 없어요.</p>
        : <div className="app-card divide-y divide-line p-5">{cards.map(({ link, trend }) => <MemberTrendCard key={link.id} linkId={link.id} name={link.member_name} trend={trend} period={period} prescription={link.allow_prescription} />)}</div>}
    </section>
  </main>;
}
