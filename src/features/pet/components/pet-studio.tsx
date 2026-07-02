"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil } from "lucide-react";

import { PetRoom } from "@/features/pet/components/pet-room";
import {
  ROOM_CATS,
  itemsByCat,
  type RoomCat,
} from "@/features/pet/catalog";
import { petStage } from "@/features/pet/level";
import {
  buyItemAction,
  equipRoomAction,
  setPetNameAction,
  toggleDecorAction,
} from "@/features/pet/actions";
import type { PetView } from "@/features/pet/data-access";

export function PetStudio({ pet }: { pet: PetView }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cat, setCat] = useState<RoomCat>("wall");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pet.name);
  const [msg, setMsg] = useState<string | null>(null);

  const stage = petStage(pet.level.level);
  const owned = new Set(pet.owned);
  const decor = new Set(
    Array.isArray(pet.equipped.decor) ? (pet.equipped.decor as string[]) : [],
  );

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else setMsg(r.error ?? "실패했어요.");
    });
  };

  function saveName() {
    setMsg(null);
    start(async () => {
      const r = await setPetNameAction(name);
      if (r.ok) {
        setEditing(false);
        router.refresh();
      } else setMsg(r.error);
    });
  }

  return (
    <div className="space-y-4">
      {/* 방 무대 */}
      <div className="rounded-2xl border border-zinc-200 p-2 shadow-sm dark:border-zinc-800">
        <div className="h-52 w-full">
          <PetRoom equipped={pet.equipped} level={pet.level.level} size="lg" />
        </div>
      </div>

      {/* 늑대 정보 */}
      <div className="text-center">
        {editing ? (
          <div className="mx-auto flex max-w-[16rem] items-center gap-1">
            <input
              aria-label="늑대 이름"
              value={name}
              maxLength={12}
              onChange={(e) => setName(e.target.value)}
              placeholder="늑대 이름 (12자)"
              className="h-9 flex-1 rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
            <button
              type="button"
              onClick={saveName}
              disabled={pending}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white disabled:opacity-50"
            >
              {pending ? (
                <Loader2 aria-hidden="true" size={15} className="animate-spin" />
              ) : (
                <Check aria-hidden="true" size={15} />
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setName(pet.name);
              setEditing(true);
            }}
            className="inline-flex items-center gap-1 text-lg font-extrabold text-zinc-900 dark:text-zinc-100"
          >
            {pet.name || "늑대 이름 짓기"}
            <Pencil aria-hidden="true" size={14} className="text-zinc-400" />
          </button>
        )}
        <p className="mt-0.5 text-sm font-bold text-violet-600 dark:text-violet-300">
          Lv.{pet.level.level} · {stage.title}
        </p>
        <div className="mx-auto mt-1.5 h-2 w-48 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-950/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-500"
            style={{ width: `${pet.level.pct}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">
          다음 Lv까지 운동 {pet.level.need - pet.level.intoLevel}회 · 총 {pet.totalWorkouts}회
        </p>
        <p className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          🪙 {pet.points.toLocaleString()} P
        </p>
      </div>

      {msg ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {msg}
        </p>
      ) : null}

      {/* 상점 카테고리 */}
      <div className="flex gap-1.5">
        {ROOM_CATS.map((c) => (
          <button
            key={c.cat}
            type="button"
            onClick={() => setCat(c.cat)}
            className={`h-8 flex-1 rounded-lg text-xs font-bold transition ${
              cat === c.cat
                ? "bg-violet-600 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 아이템 그리드 */}
      <div className="grid grid-cols-3 gap-2">
        {itemsByCat(cat).map((it) => {
          const has = owned.has(it.id) || it.price === 0;
          const active =
            cat === "decor" ? decor.has(it.id) : pet.equipped[cat] === it.id;
          return (
            <div
              key={it.id}
              className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center ${
                active
                  ? "border-violet-400 bg-violet-50 dark:border-violet-500 dark:bg-violet-950/30"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              <span className="text-2xl">{it.emoji}</span>
              <span className="truncate text-[11px] font-bold text-zinc-800 dark:text-zinc-100">
                {it.name}
              </span>
              {!has ? (
                <button
                  type="button"
                  onClick={() => run(() => buyItemAction(it.id))}
                  disabled={pending}
                  className="w-full rounded-lg bg-amber-500 py-1 text-[10px] font-black text-white transition hover:bg-amber-400 disabled:opacity-50"
                >
                  🪙 {it.price}P
                </button>
              ) : cat === "decor" ? (
                <button
                  type="button"
                  onClick={() => run(() => toggleDecorAction(it.id))}
                  disabled={pending}
                  className={`w-full rounded-lg py-1 text-[10px] font-black disabled:opacity-50 ${
                    active
                      ? "bg-violet-600 text-white"
                      : "border border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-300"
                  }`}
                >
                  {active ? "치우기" : "놓기"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => run(() => equipRoomAction(cat, it.id))}
                  disabled={pending || active}
                  className={`w-full rounded-lg py-1 text-[10px] font-black disabled:opacity-60 ${
                    active
                      ? "bg-violet-600 text-white"
                      : "border border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-300"
                  }`}
                >
                  {active ? "적용중" : "적용"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
