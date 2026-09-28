import { EmptyState } from "@/components/empty-state";
import { getFoodFavorites } from "./favorite-actions";
import { shortDateLabel } from "@/features/profile/body-chart-data";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getRecentFoodLogs } from "./data-access";
import { addDaysYmd, seoulYmd } from "@/features/routine/data";
import { MEAL_LABEL } from "./meal";
import { FoodFavorites } from "./components/food-favorites";

export async function DietSectionPage({ section, days = "30" }: { section: "history" | "nutrition" | "favorites"; days?: string }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const period = ["7", "30", "90"].includes(days) ? Number(days) : 30;
  const today = seoulYmd();
  const rows = await getRecentFoodLogs(addDaysYmd(today, 1 - period), addDaysYmd(today, 1), true);
  const favorites = section === "favorites" ? await getFoodFavorites() : [];
  const title = section === "favorites" ? "즐겨찾기" : "식단 기록 · 영양 분석";
  const dates = [...new Set(rows.map(row => row.date))].sort().reverse();
  const totals = rows.reduce((sum, row) => ({ kcal: sum.kcal + row.kcal, protein: sum.protein + (row.protein ?? 0), carbs: sum.carbs + (row.carbs ?? 0), fat: sum.fat + (row.fat ?? 0) }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const average = (value: number) => dates.length ? Math.round(value / dates.length) : 0;
  return <div className="app-page"><PageHeader title={title} back backHref="/diet"/><main className="app-container space-y-5">
    {section === "favorites" ? <FoodFavorites userId={user.id} recent={rows} initial={favorites}/> : <>
      <nav aria-label="식단 조회 기간" className="flex gap-2">{[7,30,90].map(value => <Link key={value} href={`?days=${value}`} aria-current={period === value ? "page" : undefined} className={`min-h-11 rounded-xl px-4 py-3 text-sm font-semibold ${period === value ? "bg-brand text-white dark:text-zinc-950" : "bg-brand-soft text-brand"}`}>{value}일</Link>)}</nav>
      {<section className="app-card space-y-4 p-5"><h3 className="font-semibold">기록한 날의 하루 평균</h3><p className="text-sm text-muted">최근 {period}일 중 {dates.length}일 기록 · 미기록일은 평균에서 제외해요.</p><dl className="grid grid-cols-2 gap-4">{[["칼로리",`${average(totals.kcal)} kcal`],["단백질",`${average(totals.protein)} g`],["탄수화물",`${average(totals.carbs)} g`],["지방",`${average(totals.fat)} g`]].map(([label,value])=><div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="text-xl font-bold">{value}</dd></div>)}</dl><p className="text-xs text-muted">영양값이 없는 음식은 해당 영양소 합계에 포함되지 않아요.</p></section>}
      <section className="app-card divide-y divide-line" aria-label="날짜별 식단">{dates.map(date => { const foods=rows.filter(row=>row.date===date); return <Link key={date} href={`/diet?d=${date}`} className="block space-y-2 p-4"><div className="flex justify-between gap-3"><h3 className="font-semibold">{shortDateLabel(date)}</h3><span className="font-semibold text-brand">{Math.round(foods.reduce((sum,row)=>sum+row.kcal,0))} kcal</span></div><p className="text-sm text-muted">{[...new Set(foods.map(row=>MEAL_LABEL[row.meal]))].join(" · ")} · {foods.length}개 음식</p></Link>; })}{!dates.length && <EmptyState title="이 기간에는 식단 기록이 없어요." href="/diet" action="식단 기록하기" />}</section>
      <Link href="/diet" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">오늘 식단 기록하기 →</Link>
    </>}
  </main></div>;
}
