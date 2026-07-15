"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { setGroupModeAction } from "@/features/admin/admin-actions";
import {
  GROUP_MODES,
  GROUP_MODE_HINT,
  GROUP_MODE_LABEL,
  type GroupMode,
} from "@/features/groups/group-mode";

/**
 * 관리자용 — 그룹탭 전역 모드를 둘 중 하나로 전환한다.
 *   헬스장(기존 공유펫·랭킹) / 오늘 운동 인증(3초 움짤).
 * 앱 전체 사용자에게 즉시 반영된다(전역 설정).
 */
export function GroupModeManager({ mode }: { mode: GroupMode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<GroupMode | null>(null);

  function set(next: GroupMode) {
    if (next === mode || pending) return;
    setError(null);
    setTarget(next);
    start(async () => {
      const res = await setGroupModeAction(next);
      if (res.ok) router.refresh();
      else setError(res.error);
      setTarget(null);
    });
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <div
        role="group"
        aria-label="그룹탭 모드"
        className="inline-flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-600"
      >
        {GROUP_MODES.map((m) => {
          const on = mode === m;
          const busy = pending && target === m;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              disabled={pending}
              onClick={() => set(m)}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                on
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              {busy ? (
                <Loader2 aria-hidden="true" size={12} className="animate-spin" />
              ) : null}
              {GROUP_MODE_LABEL[m]}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-zinc-500">{GROUP_MODE_HINT[mode]}</p>
    </div>
  );
}