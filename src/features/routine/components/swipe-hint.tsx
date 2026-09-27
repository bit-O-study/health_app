"use client";

import { useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

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

  // 칩 3개 대신 회색 글자 한 줄(2026-09-15 "글씨가 너무 많아") — 닫으면 이 기기에선 다시 안 뜬다.
  return (
    <div className="mb-2 flex items-center gap-1.5 px-1 text-xs text-zinc-400 dark:text-zinc-500">
      <ArrowRight aria-hidden="true" size={12} className="shrink-0" />
      완료
      <ArrowLeft aria-hidden="true" size={12} className="ml-1.5 shrink-0" />
      오늘 안 함
      <button
        type="button"
        aria-label="안내 그만 보기"
        title="안내 그만 보기"
        onClick={dismiss}
        className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition active:bg-zinc-200/70 dark:active:bg-white/[0.08]"
      >
        <X aria-hidden="true" size={13} />
      </button>
    </div>
  );
}
