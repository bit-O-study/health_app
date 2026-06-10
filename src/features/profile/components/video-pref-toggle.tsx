"use client";

import { useState, useTransition } from "react";
import { Loader2, Video, VideoOff } from "lucide-react";

import { setHideExerciseVideosAction } from "@/features/profile/actions";

/**
 * 개인설정: '운동영상 안 보기' 토글.
 * 켜면 운동 시작 시 영상 가이드 대신 타이머(중지/시작/저장)만 표시한다.
 */
export function VideoPrefToggle({ initialHide }: { initialHide: boolean }) {
  const [hide, setHide] = useState(initialHide);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !hide;
    setHide(next); // 낙관적 반영
    setError(null);
    start(async () => {
      const res = await setHideExerciseVideosAction(next);
      if (!res.ok) {
        setHide(!next); // 롤백
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
          {hide ? (
            <VideoOff aria-hidden="true" size={22} />
          ) : (
            <Video aria-hidden="true" size={22} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
            운동영상 안 보기
          </h2>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            켜면 운동 시작 시 영상 가이드 없이 타이머(중지·시작·저장)만 나옵니다.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={hide}
          aria-label="운동영상 안 보기"
          disabled={pending}
          onClick={toggle}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            hide ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-600"
          }`}
        >
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${
              hide ? "translate-x-6" : "translate-x-1"
            }`}
          >
            {pending ? (
              <Loader2
                aria-hidden="true"
                className="animate-spin text-zinc-400"
                size={12}
              />
            ) : null}
          </span>
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
