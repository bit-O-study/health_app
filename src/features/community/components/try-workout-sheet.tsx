"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";

import { useBackClose } from "@/lib/platform/use-back-close";
import type { TryItem } from "../try-workout";
import { getTryWorkoutOptionsAction, tryWorkoutTodayAction } from "../try-workout-actions";

/**
 * '오늘 이 운동 해보기' 시트(커뮤니티 4-1).
 * 카드의 운동 중 고른 것을 **오늘만** 내 운동에 담는다 — 내 루틴은 그대로, 세트·무게는 내 추천값.
 * 이미 오늘 목록에 있는 운동·운동 목록에 없는 운동은 고를 수 없게 흐리게 둔다.
 */
export function TryWorkoutSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [items, setItems] = useState<TryItem[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const [pending, start] = useTransition();
  useBackClose(true, () => {
    if (!pending) onClose();
  });

  useEffect(() => {
    let alive = true;
    getTryWorkoutOptionsAction(postId).then((r) => {
      if (!alive) return;
      if (!r.ok) {
        setError(r.error);
        setItems([]);
        return;
      }
      setItems(r.items);
      setPicked(new Set(r.items.filter((it) => it.status === "ok").map((it) => it.index)));
    });
    return () => {
      alive = false;
    };
  }, [postId]);

  function toggle(i: number) {
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function submit() {
    setError(null);
    start(async () => {
      const r = await tryWorkoutTodayAction(postId, [...picked]);
      if (r.ok) setAdded(r.added);
      else setError(r.error);
    });
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    // 카드(누르면 상세로 가는 목록 줄) 안에서 열려도 클릭이 카드까지 올라가지 않게 여기서 멈춘다.
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center"
      onClick={(e) => {
        e.stopPropagation();
        if (!pending) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="오늘 운동에 담기"
        className="w-full max-w-sm rounded-t-3xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 sm:rounded-3xl sm:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-bold">오늘 운동에 담기</h3>
          <button type="button" aria-label="닫기" onClick={() => !pending && onClose()} className="rounded-full p-1 text-zinc-400">
            <X size={20} />
          </button>
        </div>

        {added !== null ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p role="status" className="text-sm font-bold text-brand">
              오늘 운동에 {added}개 담았어요
            </p>
            <Link href="/routine" className="min-h-11 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white dark:text-zinc-950">
              오늘 운동 보러 가기
            </Link>
          </div>
        ) : items === null ? (
          <p className="flex justify-center py-8 text-zinc-400">
            <Loader2 aria-label="불러오는 중" size={20} className="animate-spin" />
          </p>
        ) : (
          <>
            <ul className="flex flex-col" data-testid="try-workout-items">
              {items.map((it) => {
                const disabled = it.status !== "ok" || pending;
                const on = picked.has(it.index) && it.status === "ok";
                return (
                  <li key={it.index}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      disabled={disabled}
                      onClick={() => toggle(it.index)}
                      className="flex min-h-11 w-full items-center gap-3 border-b border-zinc-100 py-2 text-left text-sm disabled:text-zinc-400 dark:border-white/[0.06]"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          on ? "border-brand bg-brand text-white dark:text-zinc-950" : "border-zinc-300 dark:border-zinc-600"
                        }`}
                      >
                        {on ? <Check size={14} strokeWidth={3} /> : null}
                      </span>
                      <span className="min-w-0 flex-1 break-words">{it.name}</span>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {it.status === "already" ? "이미 있어요" : it.status === "unknown" ? "담을 수 없어요" : it.sets ? `${it.sets}세트` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
              세트·무게는 내 기록에 맞춰 추천해요. <b>오늘만</b> 담기고 내 루틴은 그대로예요.
            </p>
            {error ? (
              <p role="alert" className="mt-2 text-sm font-semibold text-danger">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={pending || picked.size === 0}
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-50 dark:text-zinc-950"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : null}
              {picked.size > 0 ? `${picked.size}개 오늘만 담기` : "담을 운동을 골라 주세요"}
            </button>
          </>
        )}
      </section>
    </div>,
    document.body,
  );
}
