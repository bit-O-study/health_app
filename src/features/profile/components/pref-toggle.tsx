"use client";

import { useState, useTransition } from "react";
import { Dumbbell, ListChecks, Loader2, Vibrate, Volume2 } from "lucide-react";

import {
  setPersonalPrefAction,
  type PersonalBoolKey,
} from "@/features/profile/actions";

/**
 * 아이콘은 키(문자열)로 받는다 — 서버 컴포넌트에서 lucide '함수'를 prop 으로 넘기면
 * RSC 경계 위반("Functions cannot be passed to Client Components")이 나기 때문.
 */
const ICONS = {
  guide: ListChecks,
  sound: Volume2,
  haptic: Vibrate,
  weight: Dumbbell,
} as const;

/**
 * 개인설정 boolean 토글(범용). 상세 가이드·휴식 소리·휴식 진동 등에 재사용.
 * 낙관적 반영 + 실패 시 롤백 + 에러 표시.
 * 목록 한 줄(아이콘 · 제목 · 스위치) — 설명 문장은 뺐다(2026-09-16 8단계).
 */
export function PrefToggle({
  prefKey,
  initial,
  title,
  icon,
}: {
  prefKey: PersonalBoolKey;
  initial: boolean;
  title: string;
  icon: keyof typeof ICONS;
}) {
  const Icon = ICONS[icon];
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !on;
    setOn(next); // 낙관적 반영
    setError(null);
    start(async () => {
      const res = await setPersonalPrefAction(prefKey, next);
      if (!res.ok) {
        setOn(!next); // 롤백
        setError(res.error);
      }
    });
  }

  return (
    <div className="app-row">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300">
        <Icon aria-hidden="true" size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base text-zinc-900 dark:text-zinc-100">
          {title}
        </span>
        {error ? (
          <span className="block text-xs text-danger">저장 실패 — {error}</span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        disabled={pending}
        onClick={toggle}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
          on ? "bg-brand" : "bg-zinc-300 dark:bg-zinc-600"
        }`}
      >
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-6" : "translate-x-1"
          }`}
        >
          {pending ? (
            <Loader2
              aria-hidden="true"
              size={12}
              className="animate-spin text-zinc-500"
            />
          ) : null}
        </span>
      </button>
    </div>
  );
}
