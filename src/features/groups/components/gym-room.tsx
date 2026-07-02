"use client";

import { useState } from "react";
import { Flame } from "lucide-react";

import type { RankedMember } from "@/features/groups/ranking";
import { wolfScale } from "@/features/groups/gym";
import { WolfCharacter } from "@/features/groups/components/wolf-character";

// 헬스장 배경 소품(벽면에 정적으로 배치).
const GEAR = ["🏋️", "🚴", "🏃", "🤸", "🥊", "🪑"];

/**
 * 헬스장 씬 — 그룹원들이 각자 늑대 캐릭터로 돌아다닌다(가끔 방향 바꿔 걷기).
 * 캐릭터를 누르면 위에 닉네임 + 오늘 운동 칼로리(+Lv)가 나온다. 처음이면 Lv0.
 */
export function GymRoom({ members }: { members: RankedMember[] }) {
  const [selId, setSelId] = useState<string | null>(members[0]?.userId ?? null);
  const sel = members.find((m) => m.userId === selId) ?? members[0] ?? null;

  return (
    <div className="mb-4">
      {/* 선택 정보 */}
      <div className="mb-1 flex min-h-[2.25rem] items-center justify-center rounded-xl bg-zinc-100 px-3 py-1.5 dark:bg-zinc-800/60">
        {sel ? (
          <p className="flex items-center gap-2 text-sm">
            <span className="font-extrabold text-zinc-900 dark:text-zinc-100">
              {sel.name}
              {sel.isMe ? (
                <span className="ml-1 text-[10px] font-bold text-emerald-600">나</span>
              ) : null}
            </span>
            <span className="rounded-full bg-violet-500 px-1.5 text-[10px] font-bold text-white">
              Lv.{sel.level}
            </span>
            <span className="flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400">
              <Flame aria-hidden="true" size={13} /> 오늘 {sel.todayBurned.toLocaleString()}kcal
            </span>
          </p>
        ) : (
          <p className="text-xs text-zinc-400">아직 그룹원이 없어요.</p>
        )}
      </div>

      {/* 헬스장 룸 */}
      <div className="relative h-48 overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-b from-sky-100 to-zinc-100 shadow-inner dark:border-zinc-800 dark:from-sky-950/40 dark:to-zinc-900">
        {/* 바닥 */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-amber-200/70 dark:bg-amber-900/40" />
        {/* 벽면 헬스 기구(정적 소품) */}
        <div className="pointer-events-none absolute inset-x-2 top-2 flex justify-between opacity-60">
          {GEAR.map((g, i) => (
            <span key={i} className="text-2xl">
              {g}
            </span>
          ))}
        </div>

        {/* 돌아다니는 늑대들 */}
        {members.map((m, i) => {
          const scale = wolfScale(m.level);
          const lane = i % 3; // 0~2 깊이감
          const bottom = 6 + lane * 20; // %
          const dur = 7 + ((i * 37) % 9); // 7~15s 제각각
          const delay = -((i * 53) % 11); // 시작 위치 분산
          const active = m.userId === selId;
          return (
            <button
              key={m.userId}
              type="button"
              onClick={() => setSelId(m.userId)}
              aria-label={`${m.name} 정보 보기`}
              className="wolf-wander absolute flex flex-col items-center"
              style={{
                bottom: `${bottom}%`,
                animationDuration: `${dur}s`,
                animationDelay: `${delay}s`,
                zIndex: 10 + lane,
              }}
            >
              <span
                className={`wolf-idle inline-block leading-none ${
                  active ? "drop-shadow-[0_0_6px_rgba(139,92,246,0.9)]" : ""
                }`}
              >
                <WolfCharacter size={Math.round(40 * scale)} level={m.level} />
              </span>
              <span
                className={`-mt-0.5 rounded-full px-1 text-[8px] font-bold leading-tight ${
                  active
                    ? "bg-violet-600 text-white"
                    : "bg-white/80 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300"
                }`}
              >
                {m.name.length > 4 ? `${m.name.slice(0, 4)}…` : m.name} · Lv{m.level}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
