"use client";

import { useState, useTransition } from "react";
import { ListChecks, Loader2, Vibrate, Volume2 } from "lucide-react";

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
} as const;

/**
 * 개인설정 boolean 토글(범용). 상세 가이드·휴식 소리·휴식 진동 등에 재사용.
 * 낙관적 반영 + 실패 시 롤백 + 에러 표시.
 */
export function PrefToggle({
  prefKey,
  initial,
  title,
  description,
  icon,
}: {
  prefKey: PersonalBoolKey;
  initial: boolean;
  title: string;
  description: string;
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
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
          <Icon aria-hidden="true" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
          {error ? (
            <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
              저장 실패 — {error}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={title}
          disabled={pending}
          onClick={toggle}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            on ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-600"
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
    </div>
  );
}
