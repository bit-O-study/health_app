"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Share2 } from "lucide-react";

import { shareRoutineDayAction } from "@/features/routine-share/actions";
import {
  MAX_CAPTION,
  MAX_TITLE,
  validateShareText,
} from "@/features/routine-share/share";
import type { Visibility } from "@/features/community/feed";

/**
 * 현재 루틴(/routine)의 일차를 커뮤니티 › 루틴에 추천글로 올린다.
 * 올리는 건 **복사(스냅샷)** 라, 나중에 내 루틴을 고쳐도 올린 글은 안 바뀐다.
 */
export function ShareDayButton({
  dayIndex,
  defaultTitle,
  groups,
  label = "소개하기",
}: {
  dayIndex: number;
  /** "1일차 · 등" 같은 기본 제목(사용자가 고칠 수 있음). */
  defaultTitle: string;
  groups: { id: string; name: string }[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full border border-emerald-300 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
      >
        <Share2 aria-hidden="true" size={12} />
        {label}
      </button>
      {open ? (
        <ShareDaySheet
          dayIndex={dayIndex}
          defaultTitle={defaultTitle}
          groups={groups}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function ShareDaySheet({
  dayIndex,
  defaultTitle,
  groups,
  onClose,
}: {
  dayIndex: number;
  defaultTitle: string;
  groups: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [caption, setCaption] = useState("");
  const [includeWeight, setIncludeWeight] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [groupId, setGroupId] = useState<string>(groups[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    const bad = validateShareText(title, caption);
    if (bad) {
      setError(bad);
      return;
    }
    start(async () => {
      const res = await shareRoutineDayAction({
        dayIndex,
        title,
        caption,
        includeWeight,
        visibility,
        groupId: visibility === "public" ? null : groupId || null,
      });
      if (res.ok) setDone(true);
      else setError(res.error);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl dark:bg-zinc-900 sm:rounded-2xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Check aria-hidden="true" size={24} />
            </span>
            <p className="text-base font-bold text-zinc-950 dark:text-zinc-50">
              소개글을 올렸어요
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              커뮤니티 › <strong>루틴</strong> 에서 볼 수 있어요.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-1 h-11 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white"
            >
              확인
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
              이 일차를 소개하기
            </h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              운동 순서·세트·횟수·메모가 그대로 올라가요. 올린 뒤 루틴을 고쳐도 이 글은
              바뀌지 않아요.
            </p>

            <label className="mt-4 block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              제목
              <input
                value={title}
                maxLength={MAX_TITLE}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError(null);
                }}
                disabled={pending}
                className="mt-1 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
              />
            </label>

            <label className="mt-3 block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              한마디 (선택)
              <textarea
                value={caption}
                maxLength={MAX_CAPTION}
                rows={2}
                placeholder="예: 초보자도 따라 할 수 있게 순서를 짰어요"
                onChange={(e) => {
                  setCaption(e.target.value);
                  setError(null);
                }}
                disabled={pending}
                className="mt-1 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
              />
            </label>

            <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={includeWeight}
                onChange={(e) => setIncludeWeight(e.target.checked)}
                disabled={pending}
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
              />
              <span>
                <strong>내 무게도 같이 올리기</strong>
                <span className="block text-zinc-500 dark:text-zinc-400">
                  기본은 안 올려요 — 무게는 사람마다 달라서, 받는 쪽이 자기 무게로 시작하는 게 안전해요.
                </span>
              </span>
            </label>

            <div className="mt-3">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                공개 범위
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Seg
                  active={visibility === "public"}
                  onClick={() => setVisibility("public")}
                >
                  전체 공개
                </Seg>
                <Seg
                  active={visibility === "group"}
                  disabled={groups.length === 0}
                  onClick={() => setVisibility("group")}
                >
                  그룹만
                </Seg>
              </div>
              {visibility === "group" && groups.length > 0 ? (
                <select
                  aria-label="공개할 그룹"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  disabled={pending}
                  className="mt-2 h-10 w-full rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            {error ? (
              <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="h-11 flex-1 rounded-xl border border-zinc-300 bg-white text-sm font-bold text-zinc-700 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-60"
              >
                {pending ? (
                  <Loader2 aria-hidden="true" size={16} className="animate-spin" />
                ) : (
                  <Share2 aria-hidden="true" size={16} />
                )}
                올리기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Seg({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-9 rounded-full border px-3 text-xs font-bold transition disabled:opacity-40 ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-zinc-300 bg-white text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}
