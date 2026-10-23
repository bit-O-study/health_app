"use client";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { overtakes, type CompetitionSnapshot } from "./competition";

export function useCompetition(groupId: string | null, initial: CompetitionSnapshot | null = null) {
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [event, setEvent] = useState<{ id: number; text: string; promoted: boolean } | null>(null);
  const previous = useRef(initial);
  useEffect(() => {
    let disposed = false, busy = false, refreshAgain = false;
    let dismiss: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const db = createSupabaseBrowserClient();
    async function refresh() {
      if (disposed || document.hidden) return;
      if (busy) { refreshAgain = true; return; }
      busy = true;
      try {
        const response = await fetch(`/api/groups/ranking${groupId ? `?g=${encodeURIComponent(groupId)}` : ""}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          if (response.status === 403) { previous.current = null; setSnapshot(null); }
          throw new Error("갱신하지 못했어요. 연결되면 자동으로 다시 확인해요.");
        }
        const next = await response.json() as CompetitionSnapshot;
        if (disposed) return;
        const before = previous.current;
        if (before && before.groupId === next.groupId) {
          const oldMe = before.members.find(m => m.isMe), me = next.members.find(m => m.isMe);
          const gain = me && oldMe && before.today === next.today ? me.today.total - oldMe.today.total : 0;
          const promoted = !!(me?.league && oldMe?.league && me.league.index > oldMe.league.index);
          const demoted = !!(me?.league && oldMe?.league && me.league.index < oldMe.league.index);
          const passes = overtakes(before, next);
          const parts = [
            promoted ? `${me!.league!.icon} ${me!.league!.name} 리그 승급!` : "",
            demoted ? `${me!.league!.name} 리그로 변경됐어요. 이번 주 다시 도전해요!` : "",
            gain > 0 ? `운동 점수 +${gain}점!` : "",
            ...passes.slice(0, 3).map(p => `${p.winner.name} 님이 ${p.passed.map(m => m.name).join(", ")} 님을 추월해 ${p.winner.rank}위!`),
          ].filter(Boolean);
          if (parts.length) {
            setEvent({ id: Date.now(), text: parts.join(" "), promoted });
            clearTimeout(dismiss);
            dismiss = setTimeout(() => setEvent(null), 8000);
          }
        }
        previous.current = next; setSnapshot(next); setError("");
      } catch {
        if (!disposed) setError("갱신하지 못했어요. 연결되면 자동으로 다시 확인해요.");
      } finally {
        busy = false;
        if (refreshAgain && !disposed) { refreshAgain = false; void refresh(); }
      }
    }
    // Recompute on authorized database events. Polling also repairs missed/offline events and week rollovers.
    // Each effect owns its channel: Strict Mode cleanup must not remove a reused subscription.
    const channel = db.channel(`competition:${groupId ?? "self"}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "exercise_completions" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "conditioning_completions" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, () => void refresh());
    // Bind the authenticated session before joining; an anonymous subscription cannot pass record RLS.
    void db.auth.getSession().then(async ({ data }) => {
      if (disposed || !data.session) return;
      await db.realtime.setAuth(data.session.access_token);
      if (!disposed) channel.subscribe(status => { if (!disposed) setConnected(status === "SUBSCRIBED"); });
    }).catch(() => { if (!disposed) setConnected(false); });
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    const onVisible = () => void refresh();
    window.addEventListener("online", onVisible);
    window.addEventListener("workout-score-refresh", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true; controller.abort(); clearInterval(timer); clearTimeout(dismiss);
      window.removeEventListener("online", onVisible); document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("workout-score-refresh", onVisible);
      void db.removeChannel(channel);
    };
  }, [groupId]);
  return { snapshot, error, event, connected };
}
