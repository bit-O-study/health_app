"use client";

import { useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, GripVertical, X } from "lucide-react";

const KEY = "heltch.swipeHintDismissed";

/**
 * 운동 행 조작 안내 — 스와이프(완료/오늘 안 함)와 순서 변경.
 *
 * 예전엔 회색 장문 한 줄("→ 오른쪽으로 끌면 완료 · ← 왼쪽으로 끌면 오늘 안 함…")이
 * **매일 매번** 목록 위에 붙어 있었다. 한 번 익히면 그때부턴 소음이라 닫을 수 있게 하고,
 * 닫은 사실은 기기에 남긴다(localStorage — 계정 데이터가 아니라 이 기기의 습관이다).
 *
 * 읽기는 `useSyncExternalStore` — 서버 스냅샷은 '안 닫힘'이라 서버·수화 결과가 같고,
 * 수화가 끝나면 이 기기의 값으로 한 번에 맞춰진다(effect 로 setState 하지 않는다).
 */

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    // 사생활 보호 모드 등으로 접근이 막히면 그냥 계속 보여준다.
    return false;
  }
}

function dismiss() {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // 저장이 막혀도 이번 화면에선 사라진다(구독자에게 알리기만).
  }
  for (const fn of listeners) fn();
}

export function SwipeHint() {
  const hidden = useSyncExternalStore(subscribe, readDismissed, () => false);

  if (hidden) return null;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      <Chip
        icon={<ArrowRight aria-hidden="true" size={12} />}
        text="오른쪽으로 끌면 완료"
      />
      <Chip
        icon={<ArrowLeft aria-hidden="true" size={12} />}
        text="왼쪽으로 끌면 오늘 안 함"
      />
      <Chip
        icon={<GripVertical aria-hidden="true" size={12} />}
        text="순서 변경은 ‘편집하기’"
      />
      <button
        type="button"
        aria-label="안내 그만 보기"
        title="안내 그만 보기"
        onClick={dismiss}
        className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-200/70 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-700/70 dark:hover:text-zinc-300"
      >
        <X aria-hidden="true" size={13} />
      </button>
    </div>
  );
}

function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="app-field inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
      <span className="shrink-0 text-zinc-400 dark:text-zinc-500">{icon}</span>
      {text}
    </span>
  );
}
