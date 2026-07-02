"use client";

import { useState } from "react";

import type { RankedMember } from "@/features/groups/ranking";
import { wolfScale } from "@/features/groups/gym";
import { WolfCharacter } from "@/features/groups/components/wolf-character";

/**
 * 2D 헬스장(전체화면) — 그룹원들이 각자 귀여운 늑대로 계속 걸어다닌다.
 * public/gym/gym.png 배경 이미지가 있으면 그걸로 고퀄 배경, 없으면 CSS 헬스장.
 */
export function GymRoom({ members }: { members: RankedMember[] }) {
  const [bgOk, setBgOk] = useState(true);
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* ── 벽 ── */}
      <div className="absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-sky-100 to-indigo-50 dark:from-sky-950/50 dark:to-zinc-900">
        {/* 창문 */}
        <div className="absolute left-4 top-6 h-20 w-28 rounded-lg border-4 border-white/85 bg-gradient-to-b from-sky-300 to-sky-100 shadow-sm">
          <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/80" />
          <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-white/80" />
        </div>
        {/* 거울 */}
        <div className="absolute right-4 top-6 h-24 w-16 rounded-xl border-4 border-zinc-200/80 bg-gradient-to-br from-white/80 to-sky-100/60 shadow-sm dark:border-zinc-600/70" />
        {/* 벽시계 */}
        <div className="absolute left-1/2 top-4 h-8 w-8 -translate-x-1/2 rounded-full border-2 border-zinc-300 bg-white/90 dark:border-zinc-600 dark:bg-zinc-800">
          <div className="absolute left-1/2 top-1/2 h-2 w-0.5 -translate-x-1/2 -translate-y-full bg-zinc-500" />
          <div className="absolute left-1/2 top-1/2 h-0.5 w-2 -translate-y-1/2 bg-zinc-500" />
        </div>
        {/* 동기부여 포스터 */}
        <div className="absolute left-[38%] top-8 flex h-16 w-14 flex-col items-center justify-center gap-1 rounded-md bg-emerald-500/90 p-1 shadow-sm">
          <span className="text-lg">💪</span>
          <span className="h-1 w-9 rounded bg-white/80" />
          <span className="h-1 w-7 rounded bg-white/70" />
        </div>
        {/* 벽 봉(풀업바) */}
        <div className="absolute right-[26%] top-7 h-1.5 w-16 rounded bg-zinc-400/80" />
      </div>

      {/* ── 바닥 ── */}
      <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-b from-amber-200 to-amber-300 dark:from-amber-900/50 dark:to-amber-950/60">
        {/* 매트 */}
        <div className="absolute left-1/2 top-2 h-10 w-40 -translate-x-1/2 rounded-2xl bg-rose-400/40" />

        {/* 러닝머신(왼쪽) */}
        <div className="absolute bottom-2 left-3">
          <div className="h-6 w-16 rounded-md bg-zinc-700" />
          <div className="ml-11 -mt-9 h-9 w-4 rounded-t-md bg-zinc-500" />
        </div>

        {/* 덤벨 한 쌍(가운데 오른쪽) */}
        <div className="absolute bottom-3 right-24 flex items-center">
          <span className="h-4 w-4 rounded-full bg-zinc-800" />
          <span className="h-1.5 w-5 bg-zinc-500" />
          <span className="h-4 w-4 rounded-full bg-zinc-800" />
        </div>

        {/* 원판 랙(오른쪽) */}
        <div className="absolute bottom-2 right-4 flex items-end gap-1">
          <span className="h-8 w-2 rounded bg-zinc-600" />
          <span className="h-6 w-6 rounded-full border-4 border-emerald-600 bg-emerald-500" />
          <span className="h-5 w-5 rounded-full border-4 border-sky-600 bg-sky-500" />
        </div>

        {/* 화분(왼쪽 코너) */}
        <div className="absolute bottom-2 left-24">
          <div className="mx-auto h-4 w-5 rounded-b-md bg-orange-400" />
          <div className="-mt-6 text-xl leading-none">🌿</div>
        </div>
      </div>

      {/* 고퀄 배경 이미지(있으면 CSS 헬스장을 덮는다) */}
      {bgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/gym/gym.png"
          alt=""
          onError={() => setBgOk(false)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      {/* ── 늑대들(계속 배회) ── */}
      {members.map((m, i) => {
        const scale = wolfScale(m.level);
        const lane = i % 3;
        const bottom = 6 + lane * 11; // 바닥 위 깊이(%)
        const dur = 6 + ((i * 31) % 6); // 6~11s (또렷하게 이동)
        const delay = -((i * 47) % 11);
        return (
          <div
            key={m.userId}
            className="wolf-wander absolute flex flex-col items-center"
            style={{
              bottom: `${bottom}%`,
              animationDuration: `${dur}s`,
              animationDelay: `${delay}s`,
              zIndex: 10 + lane,
            }}
          >
            <span className="wolf-idle inline-block">
              <WolfCharacter size={Math.round(74 * scale)} level={m.level} />
            </span>
            <span className="-mt-1 whitespace-nowrap rounded-full bg-white/85 px-1.5 text-[9px] font-bold text-zinc-600 shadow-sm dark:bg-zinc-800/85 dark:text-zinc-300">
              {m.name.length > 5 ? `${m.name.slice(0, 5)}…` : m.name} · Lv{m.level}
            </span>
          </div>
        );
      })}
    </div>
  );
}
