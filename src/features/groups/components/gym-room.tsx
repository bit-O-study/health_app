"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Coins, Loader2, Pencil } from "lucide-react";

import type { GroupPet } from "@/features/groups/data-access";
import { wolfScale } from "@/features/groups/gym";
import {
  levelUpGroupPetAction,
  setGroupPetNameAction,
} from "@/features/groups/group-actions";
import { WalkingDog } from "@/features/groups/components/walking-dog";

/**
 * 2D 헬스장(전체화면) — 그룹 공유 늑대 1마리가 화면 안에서 위아래·좌우로 배회.
 * 그룹원 운동으로 모인 코인으로 레벨업. 이름 지정 가능.
 */
export function GymRoom({ groupId, pet }: { groupId: string; pet: GroupPet }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [bgOk, setBgOk] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pet.name);
  const [msg, setMsg] = useState<string | null>(null);

  const petSize = Math.round(120 * wolfScale(pet.level));
  const canLevel = pet.coins >= pet.nextCost;

  function levelUp() {
    setMsg(null);
    start(async () => {
      const r = await levelUpGroupPetAction(groupId);
      if (r.ok) router.refresh();
      else setMsg(r.error);
    });
  }
  function saveName() {
    start(async () => {
      const r = await setGroupPetNameAction(groupId, name);
      if (r.ok) {
        setEditing(false);
        router.refresh();
      } else setMsg(r.error);
    });
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* ── 벽 ── */}
      <div className="absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-sky-100 to-indigo-50 dark:from-sky-950/50 dark:to-zinc-900">
        <div className="absolute left-4 top-10 h-20 w-28 rounded-lg border-4 border-white/85 bg-gradient-to-b from-sky-300 to-sky-100 shadow-sm">
          <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/80" />
          <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-white/80" />
        </div>
        <div className="absolute right-4 top-10 h-24 w-16 rounded-xl border-4 border-zinc-200/80 bg-gradient-to-br from-white/80 to-sky-100/60 shadow-sm dark:border-zinc-600/70" />
      </div>
      {/* ── 바닥 ── */}
      <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-b from-amber-200 to-amber-300 dark:from-amber-900/50 dark:to-amber-950/60">
        <div className="absolute left-1/2 top-2 h-10 w-40 -translate-x-1/2 rounded-2xl bg-rose-400/40" />
        <div className="absolute bottom-3 right-24 flex items-center">
          <span className="h-4 w-4 rounded-full bg-zinc-800" />
          <span className="h-1.5 w-5 bg-zinc-500" />
          <span className="h-4 w-4 rounded-full bg-zinc-800" />
        </div>
      </div>

      {/* 고퀄 배경 이미지(있으면 CSS 헬스장을 덮음) */}
      {bgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/gym/gym.png"
          alt=""
          onError={() => setBgOk(false)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      {/* 그룹 공유 늑대(화면 안 2D 배회) */}
      <WalkingDog size={petSize} seed={pet.groupWorkouts + pet.level} />

      {/* 상단 오버레이 — 이름 / Lv / 코인 / 레벨업 */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-2">
        {/* 이름 + Lv */}
        <div className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 shadow backdrop-blur dark:bg-zinc-900/90">
          {editing ? (
            <>
              <input
                aria-label="늑대 이름"
                value={name}
                maxLength={12}
                onChange={(e) => setName(e.target.value)}
                placeholder="늑대 이름"
                className="h-6 w-24 rounded border border-zinc-300 px-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
              />
              <button
                type="button"
                onClick={saveName}
                disabled={pending}
                className="text-emerald-600"
              >
                <Check size={14} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setName(pet.name);
                setEditing(true);
              }}
              className="flex items-center gap-1 text-sm font-extrabold text-zinc-900 dark:text-zinc-100"
            >
              {pet.name || "우리 늑대"}
              <Pencil size={11} className="text-zinc-400" />
            </button>
          )}
          <span className="rounded-full bg-violet-500 px-1.5 text-[10px] font-bold text-white">
            Lv.{pet.level}
          </span>
        </div>

        {/* 코인 + 레벨업 */}
        <div className="flex items-center gap-1">
          <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            <Coins size={13} /> {pet.coins.toLocaleString()}
          </span>
          <button
            type="button"
            onClick={levelUp}
            disabled={pending || !canLevel}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow transition ${
              canLevel
                ? "bg-violet-600 text-white hover:bg-violet-500"
                : "bg-zinc-200 text-zinc-400 dark:bg-zinc-700"
            } disabled:opacity-70`}
          >
            {pending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : null}
            레벨업 {pet.nextCost}🪙
          </button>
        </div>
      </div>

      {msg ? (
        <p className="absolute inset-x-0 top-12 z-30 mx-auto w-fit rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 shadow dark:bg-red-950/60 dark:text-red-300">
          {msg}
        </p>
      ) : null}

      {/* 함께 키우는 인원 */}
      <p className="absolute bottom-1 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-zinc-500/90">
        {pet.memberCount}명이 함께 키우는 중 · 운동하면 코인 적립 🪙
      </p>
    </div>
  );
}
