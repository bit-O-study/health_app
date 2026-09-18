"use client";

import { useState, useTransition } from "react";
import { Loader2, Video, VideoOff } from "lucide-react";

import { setHideExerciseVideosAction } from "@/features/profile/actions";

/**
 * 개인설정: '운동영상 안 보기' 토글.
 * 켜면 운동 시작 시 영상 가이드 대신 타이머(중지/시작/저장)만 표시한다.
 * 목록 한 줄(아이콘 · 제목 · 스위치) — 설명 문장은 뺐다(2026-09-16 8단계).
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
    <div className="app-row">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300">
        {hide ? (
          <VideoOff aria-hidden="true" size={16} />
        ) : (
          <Video aria-hidden="true" size={16} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base text-zinc-900 dark:text-zinc-100">
          운동영상 안 보기
        </span>
        {error ? (
          <span className="block text-xs text-danger">{error}</span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={hide}
        aria-label="운동영상 안 보기"
        disabled={pending}
        onClick={toggle}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
          hide ? "bg-brand" : "bg-zinc-300 dark:bg-zinc-600"
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
  );
}
