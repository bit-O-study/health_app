import type { GroupWidePledge } from "../group-pledge";
import { STATUS_LABEL, STATUS_TONE } from "./pledge-labels";

export function GroupWidePledgeCard({ pledge }: { pledge: GroupWidePledge }) {
  const failed = pledge.members.filter((m) => m.status === "failed");
  return <article className="app-card space-y-3 p-4" data-testid="group-wide-pledge">
    <div><span className="text-xs font-semibold text-brand">그룹 전체 다짐 · 참여 {pledge.members.length}명</span><h3 className="break-words text-sm font-bold">{pledge.title}</h3><p className="text-xs text-zinc-500">{pledge.startDate} ~ {pledge.endDate}</p></div>
    <p className="text-sm">{[pledge.workoutDays && `주 ${pledge.workoutDays}일 운동`, pledge.mealsPerDay && `매일 ${pledge.mealsPerDay}끼 식단 기록`].filter(Boolean).join(" · ")}</p>
    {failed.length > 0 ? <p className="rounded-lg bg-red-50 p-2 text-sm text-danger dark:bg-red-950/30" data-testid="pledge-failed-members">실패 명단: {failed.map((m) => `${m.name} (${m.failedWeek}주차)`).join(", ")}</p> : null}
    <ul className="space-y-2">{pledge.members.map((m) => <li key={m.userId} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 break-all">{m.name}</span><span className={`shrink-0 rounded-full px-2 py-1 text-xs ${STATUS_TONE[m.status]}`}>{STATUS_LABEL[m.status]}</span></li>)}</ul>
  </article>;
}
