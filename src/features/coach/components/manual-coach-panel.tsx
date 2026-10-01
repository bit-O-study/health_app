"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestManualCoach } from "../manual-actions";
import { COACH_KINDS, COACH_KIND_LABELS, type CoachKind, type CoachRequest } from "../manual-model";

export function ManualCoachPanel({ rows, active }: { rows: CoachRequest[]; active: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<CoachKind>("recommendation");
  const [question, setQuestion] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const requestId = useRef<string | null>(null);
  return <div className="space-y-4">
    <p className="text-sm text-zinc-500">추천은 하루 한 번, 습관 리포트는 주간 단위로 제공합니다. 상담은 하루 최대 20건까지 접수하며 운영자가 확인한 뒤 답변해요. 즉시 응답하지 않을 수 있어요.</p>
    {active && <form className="app-card space-y-3 p-4" onSubmit={e => {
      e.preventDefault();
      requestId.current ??= crypto.randomUUID();
      const id = requestId.current;
      start(async () => {
        try {
          const result = await requestManualCoach(kind, question, id);
          setMessage(result.ok ? "요청이 접수됐어요. 아래에서 답변을 확인해 주세요." : result.error);
          if (result.ok) { requestId.current = null; setQuestion(""); router.refresh(); }
        } catch { setMessage("연결이 끊겼어요. 다시 시도하면 같은 요청으로 접수돼요."); }
      });
    }}>
      <label className="block text-sm font-semibold" htmlFor="coach-kind">요청 종류</label>
      <select id="coach-kind" className="w-full rounded-lg border p-2 dark:bg-zinc-900" value={kind} disabled={pending} onChange={e => { setKind(e.target.value as CoachKind); requestId.current = null; }}>
        {COACH_KINDS.map(k => <option key={k} value={k}>{COACH_KIND_LABELS[k]}</option>)}
      </select>
      <label className="block text-sm" htmlFor="coach-question">목표·오늘 컨디션·궁금한 점 {kind !== "consultation" && "(선택)"}</label>
      <textarea id="coach-question" rows={4} maxLength={2000} className="w-full rounded-lg border p-3 dark:bg-zinc-900" value={question} disabled={pending} onChange={e => { setQuestion(e.target.value); requestId.current = null; }} />
      <p className="text-xs text-zinc-500">최근 30일 운동 기록을 함께 전달합니다. 추천을 받아도 기존 루틴은 바뀌지 않아요. 상담은 운동 습관에 관한 안내이며 진단·치료를 제공하지 않습니다.</p>
      <button disabled={pending} className="rounded-full bg-brand px-5 py-2 font-semibold text-white dark:text-zinc-950 disabled:opacity-50">{pending ? "접수 중…" : "요청하기"}</button>
      <p role="status" className="text-sm">{message}</p>
    </form>}
    <div className="flex items-center justify-between"><h2 className="font-semibold">내 추천·리포트·상담</h2><button onClick={() => router.refresh()} className="text-sm text-brand">새로고침</button></div>
    {rows.length === 0 && <p className="app-card p-4 text-sm text-zinc-500">아직 도착한 내용이 없어요. 요청을 남기면 이곳에서 확인할 수 있어요.</p>}
    {rows.map(row => <article key={row.id} className="app-card space-y-2 p-4">
      <div className="flex justify-between gap-2"><h3 className="font-semibold">{COACH_KIND_LABELS[row.kind]}</h3><span className="text-xs text-zinc-500">{row.answer ? "답변 완료" : "답변 대기"}</span></div>
      <p className="text-xs text-zinc-500">{row.for_date}</p>
      {row.question && <p className="whitespace-pre-wrap break-words text-sm text-zinc-500">{row.question}</p>}
      {row.answer && <p className="whitespace-pre-wrap break-words text-sm leading-7">{row.answer}</p>}
    </article>)}
  </div>;
}
