"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Trash2 } from "lucide-react";

import {
  addTrainerCommentAction,
  deleteTrainerCommentAction,
} from "@/features/groups/trainer-actions";
import {
  MAX_COMMENT_LEN,
  commentDateLabel,
  type TrainerComment,
} from "@/features/groups/trainer-comment";

/** 트레이너가 회원에게 코멘트를 남기고 지난 코멘트를 본다. */
export function TrainerCommentForm({
  groupId,
  memberId,
  memberName,
  initial,
}: {
  groupId: string;
  memberId: string;
  memberName: string;
  initial: TrainerComment[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [items, setItems] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    const trimmed = body.trim();
    if (!trimmed || pending) return;
    setMsg(null);
    start(async () => {
      const res = await addTrainerCommentAction(groupId, memberId, trimmed);
      if (!res.ok) return setMsg(res.error);
      setBody("");
      // 🔴 목록은 서버 prop 으로 **초기화만** 한 로컬 상태다 — `router.refresh()` 로
      //    서버가 다시 그려도 `useState(initial)` 은 안 바뀐다. 여기서 직접 앞에 붙인다.
      setItems((list) => [{ ...res.comment, fromName: "" }, ...list]);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (pending) return;
    const prev = items;
    setItems((list) => list.filter((c) => c.id !== id)); // 낙관적
    start(async () => {
      const res = await deleteTrainerCommentAction(id, groupId, memberId);
      if (!res.ok) {
        setItems(prev);
        setMsg(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <textarea
          aria-label="코멘트"
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_COMMENT_LEN))}
          rows={4}
          placeholder={`${memberName} 님에게 남길 말 — 자세, 무게, 이번 주 목표 등`}
          className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm leading-6 outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] tabular-nums text-zinc-400">
            {body.trim().length} / {MAX_COMMENT_LEN}
          </span>
          <button
            type="button"
            data-testid="comment-submit"
            disabled={pending || body.trim().length === 0}
            onClick={submit}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 aria-hidden="true" size={14} className="animate-spin" />
            ) : (
              <Send aria-hidden="true" size={14} />
            )}
            남기기
          </button>
        </div>
      </div>

      {msg ? (
        <p data-testid="comment-message" className="text-xs text-rose-600 dark:text-rose-400">
          {msg}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          아직 남긴 코멘트가 없어요.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="comment-list">
          {items.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-100">
                  {c.body}
                </p>
                <button
                  type="button"
                  aria-label="코멘트 삭제"
                  disabled={pending}
                  onClick={() => remove(c.id)}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-zinc-700"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-400">
                {commentDateLabel(c.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
