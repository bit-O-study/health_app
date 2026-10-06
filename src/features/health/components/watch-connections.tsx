"use client";

import { useState } from "react";
import { syncWatchMetric, type WatchMetric, type WatchResult } from "../watch-sync";

export function WatchConnections() {
  const [busy, setBusy] = useState<WatchMetric | null>(null);
  const [result, setResult] = useState<WatchResult | null>(null);
  const [error, setError] = useState("");
  async function sync(metric: WatchMetric) {
    setBusy(metric); setError(""); setResult(null);
    try { setResult(await syncWatchMetric(metric)); }
    catch (e) { setError(e instanceof Error ? e.message : "동기화하지 못했어요."); }
    finally { setBusy(null); }
  }
  return <section className="app-card space-y-3 p-3" data-testid="watch-connections">
    <h2 className="font-semibold">Apple Watch · Galaxy Watch</h2>
    <p className="text-sm text-zinc-600 dark:text-zinc-300">워치 기록을 휴대폰의 건강 앱에서 가져와요. 필요한 항목만 골라 허용해 주세요.</p>
    <details className="text-sm">
      <summary className="cursor-pointer py-2">워치 연결 방법</summary>
      <p className="py-1">Apple Watch: iPhone 건강 앱에 기록이 나타나는지 확인한 뒤 아래 항목을 선택하세요.</p>
      <p className="py-1">Galaxy Watch: 삼성헬스에서 워치를 동기화하고, 설정의 Health Connect에서 데이터 공유를 켜세요.</p>
      <p className="py-1 text-zinc-500">브라우저에서는 연동되지 않아요. 기록 반영에는 시간이 걸리며 실시간 심박이나 워치 원격 조작은 지원하지 않아요.</p>
    </details>
    <div className="flex flex-wrap gap-2">{([
      ["steps", "걸음 가져오기"], ["heartRate", "심박 확인"], ["workouts", "운동 기록 보기"],
    ] as const).map(([id, label]) => <button key={id} type="button" disabled={busy !== null} onClick={() => void sync(id)} className="min-h-11 rounded-xl bg-brand-soft px-3 text-sm font-semibold text-brand disabled:opacity-50">{busy === id ? "동기화 중…" : label}</button>)}</div>
    {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    {result ? <div role="status" className="space-y-2 text-sm"><p>{result.message}</p>
      {result.workouts?.length === 0 ? <p>읽을 수 있는 운동 기록이 없어요. 건강 앱의 접근 허용과 동기화를 확인해 주세요.</p> : null}
      {result.workouts ? <ul className="max-h-72 space-y-2 overflow-y-auto">{result.workouts.map((w, i) => <li key={w.start + i} className="rounded-lg bg-zinc-100 p-2 dark:bg-white/5"><p>{w.name} · {w.minutes}분</p><p className="text-xs text-zinc-500">{new Date(w.start).toLocaleString("ko-KR")} {w.source ? "· " + w.source : ""}</p></li>)}</ul> : null}
    </div> : null}
  </section>;
}
