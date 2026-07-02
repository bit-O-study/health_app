"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Coins,
  Loader2,
  Pencil,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";

import type { GroupPet } from "@/features/groups/data-access";
import type { RankedMember } from "@/features/groups/ranking";
import { wolfScale } from "@/features/groups/gym";
import {
  COSMETIC_SLOTS,
  cosmetic,
  cosmeticsBySlot,
  type CosmeticSlot,
} from "@/features/groups/cosmetics";
import {
  buyPetItemAction,
  depositCoinsAction,
  equipPetItemAction,
  setGroupPetNameAction,
} from "@/features/groups/group-actions";
import { SpriteWolf } from "@/features/groups/components/sprite-wolf";
import { GymScene } from "@/features/groups/components/gym-scene";

/**
 * 올팜식 그룹 헬스장 — 중앙에 그룹 공유 늑대(크게), 코인을 원하는 만큼 넣어서(투입) 키운다.
 * 넣은 코인이 다음 레벨 비용을 채우면 자동 레벨업. 오른쪽엔 이번주 소모 kcal 순위.
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
  const [depositOpen, setDepositOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [showShop, setShowShop] = useState(false);
  const [shopSlot, setShopSlot] = useState<CosmeticSlot>("hat");

  const owned = new Set(pet.owned);
  function buy(id: string) {
    setMsg(null);
    start(async () => {
      const r = await buyPetItemAction(groupId, id);
      if (r.ok) router.refresh();
      else setMsg(r.error);
    });
  }
  function equip(slot: CosmeticSlot, id: string | null) {
    start(async () => {
      const r = await equipPetItemAction(groupId, slot, id);
      if (r.ok) router.refresh();
      else setMsg(r.error);
    });
  }

  const petSize = Math.round(190 * wolfScale(pet.level));
  const pct = Math.min(100, Math.round((pet.progress / Math.max(1, pet.nextCost)) * 100));
  const suggested = Math.max(0, Math.min(pet.coins, pet.nextCost - pet.progress));

  function deposit(amt: number) {
    setMsg(null);
    start(async () => {
      const r = await depositCoinsAction(groupId, amt);
      if (r.ok) {
        setDepositOpen(false);
        setAmount("");
        router.refresh();
      } else setMsg(r.error);
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

      {/* ── 오른쪽: 늑대에 쓴 코인 + 이름버튼 + 이번주 소모 kcal 순위 ── */}
      <div className="absolute right-1 top-11 z-30 w-[150px]">
        <div className="mb-1 flex items-center justify-end gap-1">
          <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[12px] font-black text-white shadow">
            🪙 쓴 {pet.coinsSpent.toLocaleString()}
          </span>
          <button
            type="button"
            onClick={() => {
              setName(pet.name);
              setEditing((v) => !v);
            }}
            className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[11px] font-bold text-zinc-700 shadow dark:bg-zinc-800/90 dark:text-zinc-200"
          >
            <Pencil size={10} /> 이름
          </button>
        </div>

        {editing ? (
          <div className="mb-1 flex items-center gap-1">
            <input
              aria-label="늑대 이름"
              value={name}
              maxLength={12}
              onChange={(e) => setName(e.target.value)}
              placeholder="늑대 이름"
              className="h-7 min-w-0 flex-1 rounded border border-zinc-300 px-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
            />
            <button
              type="button"
              onClick={saveName}
              disabled={pending}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded bg-emerald-600 text-white"
            >
              <Check size={13} />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setShowShop(true)}
          className="mb-1 flex w-full items-center justify-center gap-1 rounded-full bg-fuchsia-600 px-2 py-1 text-[12px] font-black text-white shadow transition hover:bg-fuchsia-500"
        >
          <ShoppingBag size={13} /> 상점
        </button>

        <div className="max-h-[40vh] space-y-0.5 overflow-y-auto rounded-lg bg-white/40 p-1.5 backdrop-blur-sm dark:bg-zinc-900/40">
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
        <span className="flex items-center gap-1 rounded-full bg-black/45 px-3 py-1 text-base font-extrabold text-white backdrop-blur">
          {pet.name || "우리 늑대"}
          <span className="rounded-full bg-violet-500 px-1.5 text-[11px] font-bold">
            Lv.{pet.level}
          </span>
        </span>
        <div className="flex flex-col items-center">
          <div
            className="relative"
            style={{ width: petSize * 1.14, height: petSize }}
          >
            <div className="absolute inset-0 flex items-end justify-center">
              <SpriteWolf size={petSize} />
            </div>
            {/* 앞모습 강아지: 귀 맨위, 눈≈세로48%, 목≈62% — 각 부위에 맞춤(가로 가운데) */}
            {pet.equipped.hat ? (
              <span
                className="absolute left-1/2 -translate-x-1/2 leading-none"
                style={{ top: "9%", fontSize: petSize * 0.3 }}
              >
                {cosmetic(pet.equipped.hat)?.emoji}
              </span>
            ) : null}
            {pet.equipped.face ? (
              <span
                className="absolute left-1/2 -translate-x-1/2 leading-none"
                style={{ top: "43%", fontSize: petSize * 0.24 }}
              >
                {cosmetic(pet.equipped.face)?.emoji}
              </span>
            ) : null}
            {pet.equipped.neck ? (
              <span
                className="absolute left-1/2 -translate-x-1/2 leading-none"
                style={{ top: "54%", fontSize: petSize * 0.2 }}
              >
                {cosmetic(pet.equipped.neck)?.emoji}
              </span>
            ) : null}
          </div>
          <span
            className="mt-[-6px] rounded-[100%] bg-black/25 blur-[2px]"
            style={{ width: petSize * 0.6, height: petSize * 0.12 }}
          />
        </div>
      </div>

      {msg ? (
        <p className="absolute inset-x-0 bottom-32 z-40 mx-auto w-fit rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 shadow dark:bg-red-950/70 dark:text-red-300">
          {msg}
        </p>
      ) : null}

      {/* ── 하단: 성장바 + 코인 넣기 ── */}
      <div className="absolute inset-x-0 bottom-0 z-30 p-3">
        <div className="rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur dark:bg-zinc-900/95">
          <div className="mb-1 flex items-center justify-between text-xs font-bold">
            <span className="text-zinc-700 dark:text-zinc-200">
              Lv.{pet.level} → Lv.{pet.level + 1}
            </span>
            <span className="tabular-nums text-amber-600 dark:text-amber-400">
              🪙 {pet.progress.toLocaleString()} / {pet.nextCost.toLocaleString()}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>

          {depositOpen ? (
            <div className="mt-2 flex items-center gap-1.5">
              <input
                aria-label="넣을 코인"
                type="number"
                inputMode="numeric"
                min={1}
                max={pet.coins}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`최대 ${pet.coins}`}
                className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-300 px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              />
              <button
                type="button"
                onClick={() => setAmount(String(pet.coins))}
                className="h-10 shrink-0 rounded-lg bg-zinc-200 px-2 text-xs font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200"
              >
                전부
              </button>
              <button
                type="button"
                onClick={() => deposit(Number(amount))}
                disabled={pending || !amount}
                className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 text-sm font-black text-white shadow disabled:opacity-60"
              >
                {pending ? <Loader2 size={15} className="animate-spin" /> : null}
                넣기
              </button>
              <button
                type="button"
                onClick={() => {
                  setDepositOpen(false);
                  setAmount("");
                  setMsg(null);
                }}
                disabled={pending}
                className="h-10 shrink-0 rounded-lg border border-zinc-300 px-2 text-xs font-bold text-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAmount(suggested > 0 ? String(suggested) : "");
                setDepositOpen(true);
              }}
              disabled={pet.coins <= 0}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-black text-white shadow transition hover:brightness-110 disabled:opacity-60"
            >
              🪙 코인 넣기 (보유 {pet.coins.toLocaleString()})
            </button>
          )}
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

      {/* 상점 모달 — 코인으로 꾸미기 구매/착용 */}
      {showShop ? (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowShop(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-white p-3 shadow-xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                <ShoppingBag size={15} /> 상점
                <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-[11px] font-black text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  🪙 {pet.coins.toLocaleString()}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowShop(false)}
                aria-label="닫기"
                className="text-zinc-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-2 flex gap-1">
              {COSMETIC_SLOTS.map((s) => (
                <button
                  key={s.slot}
                  type="button"
                  onClick={() => setShopSlot(s.slot)}
                  className={`h-8 flex-1 rounded-lg text-xs font-bold transition ${
                    shopSlot === s.slot
                      ? "bg-fuchsia-600 text-white"
                      : "border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {pet.equipped[shopSlot] ? (
                <button
                  type="button"
                  onClick={() => equip(shopSlot, null)}
                  disabled={pending}
                  className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-zinc-300 p-2 text-[11px] font-bold text-zinc-500 disabled:opacity-50 dark:border-zinc-700"
                >
                  <span className="text-2xl">🚫</span>
                  벗기
                </button>
              ) : null}
              {cosmeticsBySlot(shopSlot).map((it) => {
                const has = owned.has(it.id);
                const on = pet.equipped[shopSlot] === it.id;
                return (
                  <div
                    key={it.id}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center ${
                      on
                        ? "border-fuchsia-400 bg-fuchsia-50 dark:border-fuchsia-500 dark:bg-fuchsia-950/30"
                        : "border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <span className="text-2xl">{it.emoji}</span>
                    <span className="truncate text-[11px] font-bold text-zinc-800 dark:text-zinc-100">
                      {it.name}
                    </span>
                    {!has ? (
                      <button
                        type="button"
                        onClick={() => buy(it.id)}
                        disabled={pending}
                        className="w-full rounded-lg bg-amber-500 py-1 text-[10px] font-black text-white disabled:opacity-50"
                      >
                        🪙 {it.price}
                      </button>
                    ) : on ? (
                      <button
                        type="button"
                        onClick={() => equip(shopSlot, null)}
                        disabled={pending}
                        className="w-full rounded-lg bg-fuchsia-600 py-1 text-[10px] font-black text-white disabled:opacity-50"
                      >
                        착용중
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => equip(shopSlot, it.id)}
                        disabled={pending}
                        className="w-full rounded-lg border border-fuchsia-300 py-1 text-[10px] font-black text-fuchsia-700 disabled:opacity-50 dark:border-fuchsia-700 dark:text-fuchsia-300"
                      >
                        착용
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
