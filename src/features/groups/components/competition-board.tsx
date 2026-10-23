"use client";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { Trophy } from "lucide-react";
import { useCompetition } from "../use-competition";
import { TIERS, leagueZone, type CompetitionSnapshot, type Competitor } from "../competition";

export function TierCard({ member }: { member: Competitor }) {
  return <section className="rounded-2xl border border-brand/30 bg-brand-soft p-4" aria-label="내 운동 티어">
    <p className="text-sm text-muted">{member.leagueGroupName ?? "그룹"} · 내 리그</p>
    <div className="mt-1 flex items-center justify-between gap-3"><strong className="text-xl">{member.league ? `${member.league.icon} ${member.league.name}` : "리그 참여 전"}</strong><span className="font-bold tabular-nums">{member.lifetime.total.toLocaleString()} XP</span></div>
    <p className="mt-2 text-sm">이번 주 {member.week.total}점 · 누적 XP는 강등돼도 유지됩니다.</p>
    {member.league?.lastWeek && <p className="mt-2 rounded-xl bg-white/50 p-2 text-sm text-zinc-900">지난주 결과: {member.league.lastResult === "promotion" ? "🎉 승급했어요!" : member.league.lastResult === "demotion" ? "리그가 내려갔어요. 이번 주 다시 도전해요." : "현재 리그 잔류"}</p>}
  </section>;
}
export function CompetitionBoard({ initial }: { initial: CompetitionSnapshot }) {
  const { snapshot, error, event, connected } = useCompetition(initial.groupId, initial);
  const list = useRef<HTMLOListElement>(null);
  const positions = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const next = new Map<string, number>();
    for (const row of list.current?.querySelectorAll<HTMLElement>("[data-user-id]") ?? []) {
      const id = row.dataset.userId!, y = row.offsetTop, old = positions.current.get(id);
      if (old !== undefined && old !== y && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        row.animate([{ transform: `translateY(${old - y}px)`, backgroundColor: "#d1fae5" }, { transform: "translateY(0)" }], { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
      next.set(id, y);
    }
    positions.current = next;
  }, [snapshot]);
  const me = snapshot?.members.find(m => m.isMe);
  return <div className="space-y-4">
    <p className="text-sm text-muted">{snapshot?.weekFrom ?? initial.weekFrom} 시작 · 마감까지 {7 - Math.floor((Date.parse(snapshot?.today ?? initial.today) - Date.parse(snapshot?.weekFrom ?? initial.weekFrom)) / 86400000)}일 · 월요일 00시(한국시간) 정산</p>
    <p data-testid="ranking-connection" className="text-xs text-muted">{connected ? "실시간 연결됨" : "실시간 연결 중"} · 연결이 지연되면 5초마다 다시 확인</p>
    {error && <p role="alert" className="rounded-xl bg-amber-100 p-3 text-sm text-amber-950">{error}</p>}
    <div role="status" aria-live="polite" aria-atomic="true">
      {event && <div key={event.id} className="rounded-2xl bg-brand p-4 font-bold text-white motion-safe:animate-pulse dark:text-zinc-950">🏆 {event.text}</div>}
    </div>
    {me && <TierCard member={me} />}
    {me && snapshot && <p className="rounded-xl border border-line p-3 text-sm font-semibold">현재 {({ promotion: "🚀 승급권", demotion: "⬇ 강등권", stay: "🛡 잔류권", placement: "🌱 가입 주 보호 · 다음 주부터 정식 경쟁" })[leagueZone(me, snapshot.members, snapshot.weekFrom)]} · 주간 마감 때 확정</p>}
    <ol ref={list} className="relative space-y-3" aria-label="그룹 운동 점수 순위">
      {snapshot?.members.map(m => <li key={m.userId} data-user-id={m.userId} className={`app-card overflow-hidden border p-4 transition-colors motion-reduce:transition-none ${m.isMe ? "border-brand" : "border-line"}`}>
        <div className="flex min-w-0 items-center gap-3"><span className="shrink-0 text-xl font-bold text-brand">{m.week.total ? `${m.rank}위` : "—"}</span><div className="min-w-0 flex-1"><h2 className="truncate font-bold">{m.name}{m.isMe ? " · 나" : ""}</h2><p className="text-sm text-muted">{m.league?.icon} {m.league?.name} · {({ promotion: "승급권", demotion: "강등권", stay: "잔류권", placement: "보호" })[leagueZone(m, snapshot.members, snapshot.weekFrom)]}</p></div><strong className="shrink-0 tabular-nums">{m.week.total.toLocaleString()}점</strong></div>
        <details className="mt-3 border-t border-line pt-2"><summary className="min-h-9 cursor-pointer text-sm text-brand">운동 점수 상세</summary>
          <dl className="grid grid-cols-2 gap-2 text-sm"><dt>완료 세트</dt><dd className="text-right">{m.week.sets}점</dd><dt>반복 수행</dt><dd className="text-right">{m.week.reps}점</dd><dt>컨디셔닝 시간</dt><dd className="text-right">{m.week.conditioning}점</dd><dt>운동일 보너스</dt><dd className="text-right">{m.week.attendance}점</dd><dt>누적 경험치</dt><dd className="text-right">{m.lifetime.total.toLocaleString()} XP</dd></dl>
        </details>
      </li>)}
    </ol>
    <details className="app-card p-4"><summary className="cursor-pointer font-semibold">점수와 티어는 어떻게 올라가나요?</summary>
      <div className="mt-3 space-y-2 text-sm text-muted"><p>완료한 근력 세트당 4점(하루 최대 120점), 총 반복 5회당 1점(최대 60점), 컨디셔닝 1분당 2점(최대 120점), 운동한 날 20점. 하루 최대 320점입니다.</p>
        <p>세트별 기록이 있으면 실제 반복수를 사용합니다. 무게·체중으로 점수를 더 주지 않습니다. 기록이 없는 항목, 진행 중·휴식·미래 기록은 제외합니다.</p>
        <p>같은 점수는 공동 순위입니다. 매주 월요일 00시(한국시간)에 주간 점수를 새로 시작합니다. 리그는 그룹별로 운영하며 정식 참여자 3명부터 상위·하위 20%(올림, 최소 1명)가 한 단계 승급·강등됩니다. 경계에 걸친 동점자는 잔류하고, 한 주 0점인 정식 참여자는 강등됩니다. 루키 아래로는 내려가지 않습니다.</p>
        <p>중간 가입자는 다음 주 월요일부터 정식 경쟁합니다. 종료된 주의 결과는 다음 조회 때 한 번만 확정·저장됩니다. 확정 후 과거 기록을 수정해도 리그 결과는 바뀌지 않습니다. 누적 XP와 현재 주간 점수는 완료 취소·삭제를 반영합니다.</p>
        <p>{TIERS.map(t => `${t.icon} ${t.name}`).join(" → ")}</p>
        <p>앱에 기록한 활동을 응원하는 점수이며 체력 측정치는 아닙니다. 충분히 쉬면서 꾸준히 쌓아 보세요.</p>
      </div>
    </details>
    <Link href="/routine" className="inline-flex min-h-11 items-center gap-2 text-brand"><Trophy size={18} />오늘 운동하고 점수 쌓기</Link>
  </div>;
}
