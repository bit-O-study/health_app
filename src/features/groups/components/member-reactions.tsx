"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { toggleReactionAction } from "@/features/groups/group-actions";
import {
  REACTION_EMOJIS,
  type ReactionCount,
} from "@/features/groups/reactions";

/**
 * 멤버의 '오늘 기록'에 대한 응원 리액션 줄 — 이모지 토글 버튼(누른 건 강조, 개수 표시).
 * 내 카드(me)엔 표시하지 않는다(자기 응원 방지).
 */
export function MemberReactions({
  groupId,
  toUser,
  counts,
  readOnly = false,
}: {
  groupId: string;
  toUser: string;
  counts: ReactionCount[];
  /** 내 카드 — 받은 응원만 표시하고 누를 수 없음. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const byEmoji = new Map(counts.map((c) => [c.emoji, c]));

  function toggle(emoji: string) {
    start(async () => {
      const res = await toggleReactionAction(groupId, toUser, emoji);
      if (res.ok) router.refresh();
    });
  }

  // 내 카드: 받은 응원(개수>0)만 정적 칩으로. 없으면 아무것도 안 그림.
  if (readOnly) {
    if (counts.length === 0) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {counts.map((c) => (
          <span
            key={c.emoji}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <span>{c.emoji}</span>
            <span className="tabular-nums">{c.count}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {REACTION_EMOJIS.map((emoji) => {
        const c = byEmoji.get(emoji);
        const mine = c?.mine ?? false;
        const count = c?.count ?? 0;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            disabled={pending}
            aria-pressed={mine}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold transition disabled:opacity-50 ${
              mine
                ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-zinc-200 bg-white text-zinc-500 hover:border-emerald-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 ? <span className="tabular-nums">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
