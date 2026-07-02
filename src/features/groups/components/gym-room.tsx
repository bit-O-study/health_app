"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Coins, Loader2, Pencil, Users, X } from "lucide-react";

import type { GroupPet } from "@/features/groups/data-access";
import type { RankedMember } from "@/features/groups/ranking";
import { wolfScale } from "@/features/groups/gym";
import {
  levelUpGroupPetAction,
  setGroupPetNameAction,
} from "@/features/groups/group-actions";
import { SpriteWolf } from "@/features/groups/components/sprite-wolf";
import { GymScene } from "@/features/groups/components/gym-scene";

/**
 * 올팜식 그룹 헬스장 — 중앙에 그룹 공유 늑대(크게, 러닝머신처럼 제자리 달리기),
 * 상단 코인 카운터, 하단 큰 성장 진행바 + 레벨업 버튼. 그룹원 운동으로 함께 키운다.
 */
export function GymRoom({
  groupId,
  pet,
  members,
}: {
  groupId: string;
  pet: GroupPet;
  members: RankedMember[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pet.name);
  const [msg, setMsg] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);

  const petSize = Math.round(190 * wolfScale(pet.level));
  const canLevel = pet.coins >= pet.nextCost;
  const pct = Math.min(100, Math.round((pet.coins / Math.max(1, pet.nextCost)) * 100));

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
    <div className="relative h-full w-full overflow-hidden bg-[#f7c07a] dark:bg-zinc-900">
      {/* 배경 — 플랫 카툰 헬스장(강아지 그림체 매치) */}
      <GymScene />

      {/* ── 상단: 코인 / 인원 ── */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-2">
        <span className="flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-sm font-black text-amber-950 shadow">
          <Coins size={15} /> {pet.coins.toLocaleString()}
        </span>
        <button
          type="button"
          onClick={() => setShowMembers(true)}
          className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-zinc-700 shadow transition hover:bg-white dark:bg-zinc-900/90 dark:text-zinc-200"
        >
          <Users size={14} /> {pet.memberCount}명이 함께
        </button>
      </div>

      {/* ── 오른쪽: 이번주 소모 칼로리 순위(반투명) + 늑대에 쓴 코인 ── */}
      <div className="absolute right-1 top-11 z-30 w-[150px]">
        <div className="mb-0.5 text-right text-[12px] font-black text-violet-600 drop-shadow-sm dark:text-violet-300">
          🪙 늑대에 쓴 {pet.coinsSpent.toLocaleString()}
        </div>
        <div className="max-h-[42vh] space-y-0.5 overflow-y-auto rounded-lg bg-white/40 p-1.5 backdrop-blur-sm dark:bg-zinc-900/40">
          <p className="mb-0.5 text-center text-[11px] font-bold text-zinc-500">
            이번주 소모 kcal
          </p>
          {members.map((m, i) => (
            <div
              key={m.userId}
              className="flex items-center gap-1 text-[13px] leading-tight"
            >
              <span className="w-3.5 shrink-0 text-center font-black text-zinc-500">
                {i + 1}
              </span>
              <span
                className={`min-w-0 flex-1 truncate font-bold ${
                  m.isMe
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-zinc-800 dark:text-zinc-100"
                }`}
              >
                {m.name}
              </span>
              <span className="shrink-0 font-bold text-orange-600 dark:text-orange-400">
                🔥{m.kcal.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 중앙: 이름 + 큰 캐릭터 ── */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              aria-label="늑대 이름"
              value={name}
              maxLength={12}
              onChange={(e) => setName(e.target.value)}
              placeholder="늑대 이름"
              className="h-8 w-32 rounded-lg border border-zinc-300 px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
            <button
              type="button"
              onClick={saveName}
              disabled={pending}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white"
            >
              <Check size={15} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setName(pet.name);
              setEditing(true);
            }}
            className="flex items-center gap-1 rounded-full bg-black/45 px-3 py-1 text-base font-extrabold text-white backdrop-blur"
          >
            {pet.name || "우리 늑대"}
            <span className="rounded-full bg-violet-500 px-1.5 text-[11px] font-bold">
              Lv.{pet.level}
            </span>
            <Pencil size={12} className="opacity-80" />
          </button>
        )}

        {/* 캐릭터 + 그림자(제자리 달리기 = 러닝머신 느낌) */}
        <div className="flex flex-col items-center">
          <SpriteWolf size={petSize} />
          <span
            className="mt-[-6px] rounded-[100%] bg-black/25 blur-[2px]"
            style={{ width: petSize * 0.6, height: petSize * 0.12 }}
          />
        </div>
      </div>

      {msg ? (
        <p className="absolute inset-x-0 bottom-28 z-40 mx-auto w-fit rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 shadow dark:bg-red-950/70 dark:text-red-300">
          {msg}
        </p>
      ) : null}

      {/* ── 하단: 성장바 + 레벨업 ── */}
      <div className="absolute inset-x-0 bottom-0 z-30 space-y-2 p-3">
        <div className="rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur dark:bg-zinc-900/90">
          <div className="mb-1 flex items-center justify-between text-xs font-bold">
            <span className="text-zinc-700 dark:text-zinc-200">
              Lv.{pet.level} → Lv.{pet.level + 1}
            </span>
            <span className="tabular-nums text-amber-600 dark:text-amber-400">
              🪙 {pet.coins.toLocaleString()} / {pet.nextCost.toLocaleString()}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <button
            type="button"
            onClick={levelUp}
            disabled={pending || !canLevel}
            className={`mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-black shadow transition ${
              canLevel
                ? "animate-pulse bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:brightness-110"
                : "bg-zinc-200 text-zinc-400 dark:bg-zinc-700"
            } disabled:opacity-80`}
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : null}
            {canLevel ? "🎉 레벨업 하기!" : `레벨업까지 ${pet.nextCost - pet.coins}🪙`}
          </button>
          <p className="mt-1 text-center text-[10px] text-zinc-400">
            그룹원이 운동할수록 코인이 쌓여요 · 총 운동 {pet.groupWorkouts}회
          </p>
        </div>
      </div>

      {/* 멤버 목록 모달 — 회원 누르면 그 회원 오늘 음식·운동 상세로 */}
      {showMembers ? (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowMembers(false)}
        >
          <div
            className="max-h-[80%] w-full max-w-xs overflow-y-auto rounded-2xl bg-white p-3 shadow-xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                멤버 · 눌러서 오늘 기록 보기
              </h3>
              <button
                type="button"
                onClick={() => setShowMembers(false)}
                aria-label="닫기"
                className="text-zinc-400"
              >
                <X size={18} />
              </button>
            </div>
            <ul className="space-y-1.5">
              {members.map((m, i) => (
                <li key={m.userId}>
                  <Link
                    href={`/groups/${groupId}/member/${m.userId}`}
                    className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2.5 transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
                  >
                    <span className="w-4 text-center text-sm font-black text-zinc-400">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {m.name}
                      {m.isMe ? (
                        <span className="ml-1 text-[10px] font-bold text-emerald-600">나</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs font-bold text-orange-600 dark:text-orange-400">
                      🔥{m.kcal.toLocaleString()}
                    </span>
                    <ChevronRight size={15} className="shrink-0 text-zinc-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
