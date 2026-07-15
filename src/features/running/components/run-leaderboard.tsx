"use client";

import { useEffect, useRef, useState } from "react";

import {
  formatMeters,
  pickRunLeaderboard,
  type RunRankMember,
} from "@/features/running/leaderboard";
import {
  getGroupRunLeaderboardAction,
  type GroupRunLeaderboard,
} from "@/features/running/run-distance-actions";

const ROW_H = 30; // px — 한 줄 높이(스르륵 이동 계산용)

/**
 * 실내 러닝 우측 상단 — 내 그룹의 '오늘 달린 거리' 순위.
 * 최대 4위 + 내 순위(내가 5등 이상이면 5번째 줄). 순위가 바뀌면 줄이 스르륵 이동한다.
 * getSessionMeters(): 지금 세션에서 달린 거리(m). 내 실시간 순위에 더해진다.
 */
export function RunLeaderboard({
  getSessionMeters,
  top,
}: {
  getSessionMeters: () => number;
  /** 우측 상단 top 위치(CSS). 야외처럼 상단 HUD 와 겹칠 땐 더 아래로. */
  top?: string;
}) {
  const [board, setBoard] = useState<GroupRunLeaderboard | null>(null);
  const [live, setLive] = useState(0);
  const sessionRef = useRef(getSessionMeters);
  sessionRef.current = getSessionMeters;

  // 그룹 순위 데이터 로드 + 15초마다 갱신(다른 사람도 달릴 수 있으니).
  useEffect(() => {
    let alive = true;
    const load = () =>
      getGroupRunLeaderboardAction().then((b) => {
        if (alive) setBoard(b);
      });
    void load();
    const id = window.setInterval(load, 15000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  // 내 세션 거리 1초마다 반영(실시간 순위 역전).
  useEffect(() => {
    const id = window.setInterval(() => setLive(sessionRef.current()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!board || board.members.length < 2) return null;

  // 내 거리 = 저장된 오늘 누적 + 이번 세션 실시간.
  const members: RunRankMember[] = board.members.map((m) =>
    m.userId === board.myUserId ? { ...m, meters: m.meters + live } : m,
  );
  const rows = pickRunLeaderboard(members, board.myUserId);

  return (
    <div
      className="pointer-events-none absolute right-3 z-20 w-40"
      style={{ top: top ?? "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
    >
      <p className="mb-1 text-right text-[10px] font-bold uppercase tracking-wide text-white/80 drop-shadow">
        🏃 {board.groupName} 오늘 순위
      </p>
      <div className="relative" style={{ height: rows.length * ROW_H }}>
        {rows.map((r, i) => (
          <div
            key={r.userId}
            className={`absolute inset-x-0 flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold shadow backdrop-blur transition-[top] duration-500 ease-out ${
              r.isMe
                ? "bg-emerald-500/90 text-white ring-2 ring-white/70"
                : "bg-black/45 text-white"
            }`}
            style={{ top: i * ROW_H }}
          >
            <span
              className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                r.rank === 1
                  ? "bg-yellow-400 text-black"
                  : r.rank === 2
                    ? "bg-zinc-300 text-black"
                    : r.rank === 3
                      ? "bg-amber-600 text-white"
                      : "bg-white/25 text-white"
              }`}
            >
              {r.rank}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {r.isMe ? "나" : r.name}
            </span>
            <span className="shrink-0 tabular-nums">{formatMeters(r.meters)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
