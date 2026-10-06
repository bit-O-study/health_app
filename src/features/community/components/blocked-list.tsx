"use client";

import { useState, useTransition } from "react";

import { PageHeader } from "@/components/page-header";
import type { BlockedUser } from "../data-access";
import { unblockUserAction } from "../report-actions";
import { Notice, useNotice } from "./notice";

/** 차단한 사용자 — 풀면 다시 서로의 글·댓글이 보인다(커뮤니티 3단계). */
export function BlockedUserList({ initial }: { initial: BlockedUser[] }) {
  const [list, setList] = useState(initial);
  const [pending, start] = useTransition();
  const [notice, showNotice] = useNotice();

  function unblock(u: BlockedUser) {
    start(async () => {
      const r = await unblockUserAction(u.userId);
      if (r.ok) setList((cur) => cur.filter((x) => x.userId !== u.userId));
      else showNotice(r.error);
    });
  }

  return (
    <div className="app-page">
      <PageHeader title="차단한 사용자" backHref="/community/mine" back="내 글" />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6">
        <p className="mb-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          차단한 사람과는 서로의 글·댓글이 보이지 않고, 서로의 글에 댓글을 달 수 없어요. 차단은 신고 창의 ‘이 사람 차단하기’로 할 수 있어요.
        </p>
        {list.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">차단한 사용자가 없어요</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-white/[0.06]" data-testid="blocked-users">
            {list.map((u) => (
              <li key={u.userId} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 truncate text-sm font-semibold">{u.name}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => unblock(u)}
                  className="min-h-11 shrink-0 rounded-full border border-zinc-200 px-4 text-sm font-semibold disabled:opacity-60 dark:border-zinc-700"
                >
                  차단 풀기
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Notice text={notice} />
    </div>
  );
}
