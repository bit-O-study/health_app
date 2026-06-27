"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut, Trash2 } from "lucide-react";

import {
  deleteGroupAction,
  leaveGroupAction,
} from "@/features/groups/group-actions";

export function GroupControls({
  groupId,
  inviteToken,
  isOwner,
}: {
  groupId: string;
  inviteToken: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = `${window.location.origin}/groups/join/${inviteToken}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("초대 링크를 복사하세요", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function leave() {
    if (!window.confirm("그룹에서 나가시겠어요?")) return;
    start(async () => {
      await leaveGroupAction(groupId);
      router.push("/groups");
    });
  }

  function remove() {
    if (!window.confirm("그룹을 삭제하면 되돌릴 수 없어요. 삭제할까요?")) return;
    start(async () => {
      await deleteGroupAction(groupId);
      router.push("/groups");
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={copyLink}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-base font-bold text-white transition hover:bg-emerald-500"
      >
        {copied ? (
          <>
            <Check aria-hidden="true" size={18} /> 복사됨!
          </>
        ) : (
          <>
            <Copy aria-hidden="true" size={18} /> 초대 링크 복사
          </>
        )}
      </button>

      {isOwner ? (
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-300 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950/40"
        >
          <Trash2 aria-hidden="true" size={16} /> 그룹 삭제
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={leave}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <LogOut aria-hidden="true" size={16} /> 그룹 나가기
        </button>
      )}
    </div>
  );
}
