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
          className="w-full rounded-[10px] bg-zinc-100 p-3 text-base leading-6 outline-none focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08] dark:text-zinc-100"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs tabular-nums text-zinc-400">
            {body.trim().length} / {MAX_COMMENT_LEN}
          </span>
          <button
            type="button"
            data-testid="comment-submit"
            disabled={pending || body.trim().length === 0}
            onClick={submit}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-semibold text-white dark:text-zinc-950 app-press disabled:opacity-50"
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
        <p data-testid="comment-message" className="text-xs text-danger">
          {msg}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="app-card p-3 text-sm text-zinc-500 dark:text-zinc-400">
          아직 남긴 코멘트가 없어요.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="comment-list">
          {items.map((c) => (
            <li
              key={c.id}
              className="app-card p-3"
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
                  className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-danger disabled:opacity-50 dark:hover:bg-white/[0.06]"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </button>
              </div>
              <p className="mt-1.5 text-xs text-zinc-400">
                {commentDateLabel(c.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
