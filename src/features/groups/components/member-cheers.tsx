"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircleHeart, Send } from "lucide-react";

import { setCheerAction } from "@/features/groups/group-actions";
import { CHEER_MAX } from "@/features/groups/cheers";
import type { CheerView } from "@/features/groups/data-access";

/**
 * 멤버의 '오늘 기록'에 남긴 응원 문구(≤10자) 목록 + (남 카드) 내 응원 입력/수정.
 * 내 카드(readOnly)엔 받은 응원만 보여준다.
 */
export function MemberCheers({
  groupId,
  toUser,
  cheers,
  readOnly = false,
}: {
  groupId: string;
  toUser: string;
  cheers: CheerView[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const mine = cheers.find((c) => c.mine);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(mine?.message ?? "");

  function submit() {
    start(async () => {
      const res = await setCheerAction(groupId, toUser, msg);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-2 space-y-1.5">
      {cheers.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {cheers.map((c) => (
            <span
              key={c.fromUser}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                c.mine
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              <span className="text-zinc-400">{c.fromName}</span>
              {c.message}
            </span>
          ))}
        </div>
      ) : null}

      {readOnly ? null : open ? (
        <div className="flex items-center gap-1">
          <input
            aria-label="응원 문구"
            type="text"
            maxLength={CHEER_MAX}
            placeholder={`응원 한마디 (${CHEER_MAX}자)`}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            disabled={pending}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="h-8 flex-1 rounded-md border border-zinc-300 bg-white px-2 text-xs dark:border-zinc-600 dark:bg-zinc-800"
          />
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            aria-label="응원 남기기"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 aria-hidden="true" size={14} className="animate-spin" />
            ) : (
              <Send aria-hidden="true" size={14} />
            )}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
        >
          <MessageCircleHeart aria-hidden="true" size={12} />
          {mine ? "응원 수정" : "응원 남기기"}
        </button>
      )}
    </div>
  );
}
