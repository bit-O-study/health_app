"use client";

import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { createWorkoutSessionId } from "@/features/workout-timer/session-id";
import { formatRunClock, formatRunDuration, formatRunKm } from "../run-format";
import { INTERVAL_EXAMPLE, intervalProgress, intervalSummary, intervalTotalSec, readIntervalCheckpoint, validIntervalPlan, type IntervalCheckpoint, type IntervalPlan, type RunInterval } from "../interval-plan";
import { saveIntervalRunAction } from "../interval-actions";

const button = "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold disabled:opacity-40";
const primary = button + " border-transparent bg-brand text-white dark:text-zinc-950";
const kindLabel = (s: RunInterval) => s.kind === "walk" ? "걷기" : "달리기";
function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("interval-checkpoint", onChange);
  return () => { window.removeEventListener("storage", onChange); window.removeEventListener("interval-checkpoint", onChange); };
}
function stored(key: string) { try { return localStorage.getItem(key); } catch { return null; } }

export function IntervalRunner({ userId }: { userId: string }) {
  const key = "helssu:running-interval:" + userId;
  const checkpointText = useSyncExternalStore(subscribeStorage, () => stored(key), () => null);
  const restored = readIntervalCheckpoint(checkpointText);
  const [plan, setPlan] = useState<IntervalPlan>(INTERVAL_EXAMPLE);
  const [session, setSession] = useState<IntervalCheckpoint | null>(null);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sound, setSound] = useState(true);
  const [error, setError] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const lastTick = useRef(0);
  const announced = useRef("");
  const active = session ? intervalProgress(session.plan, session.elapsedMs / 1000) : null;
  const summary = session ? intervalSummary(session.plan, session.elapsedMs / 1000) : null;
  const completed = finished || !!active?.done;

  function persist(value: IntervalCheckpoint | null) {
    try {
      if (value) localStorage.setItem(key, JSON.stringify(value));
      else localStorage.removeItem(key);
      window.dispatchEvent(new Event("interval-checkpoint"));
    } catch { /* The workout still works when browser storage is unavailable. */ }
  }
  useEffect(() => {
    if (!session || saved) return;
    try { localStorage.setItem(key, JSON.stringify(session)); } catch { /* Optional recovery. */ }
  }, [session, saved, key]);
  useEffect(() => {
    if (!running || completed) return;
    lastTick.current = Date.now();
    const tick = setInterval(() => {
      const now = Date.now();
      const delta = Math.max(0, now - lastTick.current);
      lastTick.current = now;
      setSession(previous => previous ? { ...previous, elapsedMs: Math.min(intervalTotalSec(previous.plan) * 1000, previous.elapsedMs + delta) } : previous);
    }, 250);
    return () => clearInterval(tick);
  }, [running, completed]);
  const announcementKey = active ? active.done ? "done" : active.repeat + ":" + active.index : "";
  const announcement = active ? active.done ? "구간 운동을 마쳤어요." : `${kindLabel(active.step)}. 속도 ${active.step.speedKmh} 킬로미터, 경사 ${active.step.incline} 퍼센트로 바꿔 주세요.` : "";
  useEffect(() => {
    if (!running || !announcementKey || announced.current === announcementKey) return;
    announced.current = announcementKey;
    if (sound) {
      try {
        navigator.vibrate?.([150, 80, 150]);
        if ("speechSynthesis" in window) {
          const voice = new SpeechSynthesisUtterance(announcement); voice.lang = "ko-KR";
          window.speechSynthesis.cancel(); window.speechSynthesis.speak(voice);
        }
      } catch { /* Visible guidance remains available when sound is blocked. */ }
    }
  }, [announcementKey, announcement, running, sound]);
  useEffect(() => () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);
  useEffect(() => {
    if (!session || saved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [session, saved]);

  function update(index: number, patch: Partial<RunInterval>) {
    setPlan(p => ({ ...p, intervals: p.intervals.map((s, i) => i === index ? { ...s, ...patch } : s) }));
  }
  function move(index: number, direction: number) {
    setPlan(p => { const intervals = [...p.intervals]; [intervals[index], intervals[index + direction]] = [intervals[index + direction], intervals[index]]; return { ...p, intervals }; });
  }
  function start() {
    if (!validIntervalPlan(plan)) { setError("구간은 15~3,600초, 속도는 1~20km/h, 경사는 0~15%, 전체 운동은 4시간 이내로 설정해 주세요."); return; }
    const next = { id: createWorkoutSessionId(), startedAt: new Date().toISOString(), elapsedMs: 0, plan };
    setError(""); setSession(next); persist(next); setRunning(true); setFinished(false); setSaved(false); announced.current = "";
  }
  function pause() {
    const delta = Math.max(0, Date.now() - lastTick.current);
    setSession(p => p ? { ...p, elapsedMs: Math.min(intervalTotalSec(p.plan) * 1000, p.elapsedMs + delta) } : p);
    setRunning(false);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }
  async function save() {
    if (!session || saving || saved) return;
    setSaving(true); setError("");
    try {
      const result = await saveIntervalRunAction({
        clientSessionId: session.id, startedAt: session.startedAt, endedAt: new Date().toISOString(),
        elapsedSec: Math.floor(session.elapsedMs / 1000), plan: session.plan,
      });
      if (!result.ok) { setError(result.error ?? "저장하지 못했어요."); return; }
      setSaved(true); persist(null);
    } catch { setError("연결을 확인하고 다시 저장해 주세요. 운동 기록은 이 화면에 보관돼 있어요."); }
    finally { setSaving(false); }
  }
  return <div className="space-y-4 pb-6">
    <p className="text-sm text-muted">구간 안내에 맞춰 러닝머신 속도와 경사도를 직접 조절해 주세요. 화면을 켜 두면 전환 안내를 받을 수 있어요.</p>
    {!session ? <>
      {restored ? <section className="app-card space-y-3 p-4" aria-label="중단한 구간 운동">
        <h2 className="font-semibold">중단한 구간 운동이 있어요</h2>
        <p className="text-sm text-muted">{formatRunDuration(restored.elapsedMs / 1000)} 진행 · 일시정지 상태로 복원해요.</p>
        <div className="flex flex-wrap gap-2">
          <button className={primary} onClick={() => { setSession(restored); setPlan(restored.plan); setRunning(false); setFinished(false); setSaved(false); setError(""); }}>이어하기</button>
          <button className={button} onClick={() => setConfirmEnd(true)}>기록 버리기</button>
        </div>
      </section> : null}
      <section className="space-y-3" aria-label="구간 구성">
        <div className="flex items-center justify-between"><h2 className="text-base font-semibold">내 구간 구성</h2><span className="text-sm text-muted">총 {formatRunDuration(intervalTotalSec(plan))}</span></div>
        <p className="text-xs text-muted">예시 구성이에요. 원하는 시간과 강도로 바꿔 주세요. 같은 구성을 반복할 수 있어요.</p>
        {plan.intervals.map((step, index) => <section key={index} className="app-card space-y-3 p-4" aria-label={`${index + 1}번 구간`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{index + 1}번 구간</h3>
            <div className="flex gap-1">
              <button className={button} disabled={index === 0} aria-label={`${index + 1}번 구간 위로`} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
              <button className={button} disabled={index === plan.intervals.length - 1} aria-label={`${index + 1}번 구간 아래로`} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
              <button className={button} disabled={plan.intervals.length === 1} aria-label={`${index + 1}번 구간 삭제`} onClick={() => setPlan(p => ({ ...p, intervals: p.intervals.filter((_, i) => i !== index) }))}><Trash2 size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">운동<select className="app-field mt-1 min-h-11 w-full rounded-xl border px-2" value={step.kind} onChange={e => update(index, { kind: e.target.value as RunInterval["kind"] })}><option value="walk">걷기</option><option value="run">달리기</option></select></label>
            <label className="text-sm">시간(초)<input type="number" min={15} max={3600} step={15} className="app-field mt-1 min-h-11 w-full rounded-xl border px-2" value={step.durationSec} onChange={e => update(index, { durationSec: Number(e.target.value) })} /></label>
            <label className="text-sm">속도(km/h)<input type="number" min={1} max={20} step={0.1} className="app-field mt-1 min-h-11 w-full rounded-xl border px-2" value={step.speedKmh} onChange={e => update(index, { speedKmh: Number(e.target.value) })} /></label>
            <label className="text-sm">경사(%)<input type="number" min={0} max={15} step={0.5} className="app-field mt-1 min-h-11 w-full rounded-xl border px-2" value={step.incline} onChange={e => update(index, { incline: Number(e.target.value) })} /></label>
          </div>
        </section>)}
        <button className={button + " w-full"} disabled={plan.intervals.length >= 12} onClick={() => setPlan(p => ({ ...p, intervals: [...p.intervals, { kind: "walk", durationSec: 60, speedKmh: 5, incline: 0 }] }))}><Plus size={18} />구간 추가</button>
        <label className="flex items-center justify-between gap-3 text-sm">전체 구성 반복 횟수<input type="number" min={1} max={20} className="app-field min-h-11 w-24 rounded-xl border px-3" value={plan.repeats} onChange={e => setPlan(p => ({ ...p, repeats: Number(e.target.value) }))} /></label>
      </section>
      <button className={primary + " w-full"} disabled={!!restored} onClick={start}>구간 운동 시작</button>
    </> : active && summary ? <>
      <section className="app-card space-y-4 p-5" aria-label="구간 진행">
        <div className="flex justify-between gap-3 text-sm text-muted"><span>{active.repeat}/{session.plan.repeats}회 반복</span><span>{active.index + 1}/{session.plan.intervals.length}구간</span></div>
        <p className="text-sm font-semibold text-brand" role="status">{saved ? "런닝 기록에 저장했어요" : completed ? "구간 운동 종료" : running ? "운동 중" : "일시정지"}</p>
        <h2 className="text-[28px] font-bold">{completed ? "수고하셨어요" : kindLabel(active.step)}</h2>
        {!completed ? <><p className="text-[28px] font-bold tabular-nums" aria-label="현재 구간 남은 시간">{formatRunClock(active.remainingSec)}</p>
          <dl className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-brand-soft p-4"><dt className="text-sm text-muted">속도</dt><dd className="text-xl font-bold text-brand">{active.step.speedKmh} km/h</dd></div><div className="rounded-xl bg-brand-soft p-4"><dt className="text-sm text-muted">경사</dt><dd className="text-xl font-bold text-brand">{active.step.incline}%</dd></div></dl>
          <p className="text-sm text-muted" aria-label="다음 구간">{active.next ? `다음: ${kindLabel(active.next)} · ${active.next.speedKmh}km/h · 경사 ${active.next.incline}%` : "마지막 구간이에요."}</p></> : null}
        <progress aria-label="전체 운동 진행률" max={active.totalSec} value={active.elapsed} className="h-2 w-full accent-[var(--brand)]" />
        <p className="text-sm text-muted">진행 {formatRunClock(active.elapsed)} / {formatRunClock(active.totalSec)} · 예상 {formatRunKm(summary.distanceM)}km</p>
        <p className="text-xs text-muted">거리는 설정한 속도와 진행 시간으로 계산한 추정값이에요. 일시정지 시간은 제외돼요.</p>
      </section>
      {!completed ? <div className="flex gap-2"><button className={primary + " flex-1"} onClick={() => { if (running) pause(); else { lastTick.current = Date.now(); setRunning(true); } }}>{running ? "일시정지" : "계속하기"}</button><button className={button} onClick={() => { if (running) pause(); setConfirmEnd(true); }}>운동 끝내기</button></div> : !saved ? <button className={primary + " w-full"} disabled={saving || session.elapsedMs < 60000} onClick={() => void save()}>{saving ? "저장 중…" : "런닝 기록 저장"}</button> : <Link href="/routine/running-records" className={primary + " w-full"}>런닝 기록 보기</Link>}
      {completed && session.elapsedMs < 60000 ? <p className="text-sm text-muted">1분 미만 운동은 저장되지 않아요.</p> : null}
      {completed && !saving ? <button className={button + " w-full"} onClick={() => { if (!saved && session.elapsedMs >= 60000) setConfirmEnd(true); else { persist(null); setSession(null); setRunning(false); setFinished(false); } }}>새 구간 운동 만들기</button> : null}
    </> : null}
    <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={sound} onChange={e => setSound(e.target.checked)} />구간 전환 음성·진동 알림</label>
    {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    <ConfirmDialog open={confirmEnd} title={session && !completed ? "여기까지 운동할까요?" : "저장하지 않은 기록을 버릴까요?"} message={session && !completed ? "지금까지 진행한 시간을 저장할 수 있어요." : "버린 기록은 복구할 수 없어요."} confirmLabel={session && !completed ? "끝내기" : "버리기"} onCancel={() => setConfirmEnd(false)} onConfirm={() => { setConfirmEnd(false); if (session && !completed) { setFinished(true); setRunning(false); } else { persist(null); setSession(null); setRunning(false); setFinished(false); } }} />
  </div>;
}
