import Link from "next/link";
import { ArrowUpRight, CalendarDays, Flame, Salad } from "lucide-react";
import { AppGrid } from "./app-grid";
import type { HomeDashboard } from "@/features/home/home-data";
import type { WeeklyReport } from "@/features/routine/weekly-report";
export function LauncherHome({ dashboard, weekly, showCoach, searching, today }: {
  dashboard: HomeDashboard; weekly: WeeklyReport; showCoach: boolean; searching: boolean; today: string;
}) {
  const { dietExerciseNeed: diet, macroRemaining, contributions } = dashboard;
  const minutes = contributions.find(day => day.date === today)?.minutes ?? 0;
  const cards = [
    { href: "/routine", label: "운동", Icon: Flame, color: "text-[#cf4b34]", title: minutes > 0 ? `오늘 ${minutes}분 운동했어요` : "오늘의 운동을 시작해 볼까요?", detail: `이번 주 ${weekly.current.workoutDays}일 · ${weekly.current.exerciseCount}개 운동 완료` },
    { href: "/diet", label: "식단", Icon: Salad, color: "text-[#1f8b52]", title: dashboard.hasFoodLog ? `${diet.eatenKcal.toLocaleString("ko-KR")} / ${diet.targetKcal.toLocaleString("ko-KR")} kcal` : "오늘 먹은 것을 기록해 보세요", detail: `단백질 ${macroRemaining.protein}g · 탄수화물 ${macroRemaining.carbs}g · 지방 ${macroRemaining.fat}g 남음` },
    { href: "/calendar?view=week", label: "캘린더", Icon: CalendarDays, color: "text-[#2a63bd]", title: "이번 주의 작은 기록들", detail: `운동 ${weekly.current.workoutDays}일 · 식단 ${weekly.current.dietLoggedDays}일 기록` },
  ];
  return <div className="space-y-6">
    <div><p className="text-xs text-zinc-500">{new Date(today + "T00:00:00Z").toLocaleDateString("ko-KR", { timeZone: "UTC", month: "long", day: "numeric", weekday: "long" })}</p><h1 className="mt-1 text-2xl font-bold tracking-tight">오늘도, 나를 위한 시간</h1><p className="mt-2 text-sm text-zinc-500">하고 싶은 것부터 가볍게 시작하세요.</p></div>
    <AppGrid key={searching ? "search" : "apps"} showCoach={showCoach} searching={searching} />
    <section aria-label="오늘의 요약" className="space-y-3">
      {cards.map(({href,label,Icon,color,title,detail}) => <Link key={label} href={href} aria-label={label + " 요약 열기"} className="group block rounded-[20px] border border-zinc-200/80 bg-white p-5 transition hover:border-brand dark:border-zinc-800 dark:bg-[#141c18]">
        <div className="mb-3 flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400"><span className="flex items-center gap-2"><Icon size={16} className={color} aria-hidden="true" />{label}</span><ArrowUpRight size={15} aria-hidden="true" /></div>
        <p className="text-base font-bold">{title}</p><p className="mt-2 text-xs text-zinc-500">{detail}</p>
        {label === "식단" && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-full rounded-full bg-brand" style={{ width: Math.min(100, diet.targetKcal > 0 ? diet.eatenKcal / diet.targetKcal * 100 : 0) + "%" }} /></div>}
        {label === "캘린더" && <div className="mt-3 flex gap-2" aria-label="최근 7일 운동 기록">{contributions.filter(day => day.date <= today && day.level >= 0).slice(-7).map(day => <span key={day.date} title={day.date + " · " + day.minutes + "분"} className={"flex h-7 w-7 items-center justify-center rounded-lg text-xs " + (day.minutes > 0 ? "bg-brand text-white dark:text-zinc-950" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800")}>{new Date(day.date + "T00:00:00Z").getUTCDate()}</span>)}</div>}
      </Link>)}
    </section>
  </div>;
}
