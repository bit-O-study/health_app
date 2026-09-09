import { MessageSquareQuote } from "lucide-react";

import {
  commentDateLabel,
  type TrainerComment,
} from "@/features/groups/trainer-comment";

/**
 * 회원이 받은 트레이너 코멘트 — 오늘의 운동 화면 위쪽 카드.
 *
 * 🔴 **회원이 볼 자리가 없으면 코멘트는 없는 기능이다.** 알림은 놓치면 끝이고
 * (끌 수도 있다), 트레이너 화면은 회원이 못 본다. 운동하러 들어오는 화면에 둔다 —
 * 자세 지적은 운동 직전에 읽어야 쓸모가 있다.
 *
 * 코멘트가 없으면 **아무것도 안 그린다**(빈 카드가 자리만 먹지 않게).
 */
export function MyTrainerComments({ comments }: { comments: TrainerComment[] }) {
  if (comments.length === 0) return null;

  return (
    <section
      data-testid="my-trainer-comments"
      className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20"
    >
      <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
        <MessageSquareQuote aria-hidden="true" size={14} />
        트레이너 코멘트
      </p>
      <ul className="mt-2 space-y-2.5">
        {comments.map((c) => (
          <li key={c.id}>
            <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-100">
              {c.body}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {c.fromName} · {commentDateLabel(c.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
