"use client";
import { usePathname } from "next/navigation";
import { useCompetition } from "../use-competition";
import { TierCard } from "./competition-board";
function ActiveWorkoutPoints() {
  const { snapshot, event, error } = useCompetition(null);
  const me = snapshot?.members.find(m => m.isMe);
  return <section className="app-container my-3 space-y-2" aria-label="운동 점수">
    {me && <details className="app-card p-3"><summary className="cursor-pointer text-sm font-semibold">오늘 {me.today.total}점 · {me.league ? `${me.league.icon} ${me.league.name} 리그` : `${me.lifetime.total} XP`} · 내 성장 보기</summary><div className="mt-3"><TierCard member={me} /></div></details>}
    {error && <p className="text-xs text-muted">운동 점수 연결을 다시 확인하고 있어요.</p>}
    {event && <div key={event.id} role="status" aria-live="polite" className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[200] mx-auto max-w-md rounded-2xl bg-brand p-4 text-center font-bold text-white shadow-xl motion-safe:animate-pulse dark:text-zinc-950">{event.text}</div>}
  </section>;
}
export function WorkoutPoints() {
  const pathname = usePathname();
  return pathname === "/routine" ? <ActiveWorkoutPoints /> : null;
}
