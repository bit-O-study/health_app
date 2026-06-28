"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

import { joinGroupByTokenAction } from "@/features/groups/group-actions";

export function JoinConfirm({
  token,
  groupName,
}: {
  token: string;
  groupName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function accept() {
    setErr(null);
    start(async () => {
      const res = await joinGroupByTokenAction(token);
      if (res.ok && res.id) {
        router.push(`/groups/${res.id}`);
        router.refresh();
      } else if (!res.ok) {
        setErr(res.error);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
        <Users aria-hidden="true" size={28} />
      </span>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">그룹 초대</p>
      <h1 className="mt-1 text-xl font-extrabold text-zinc-950 dark:text-zinc-50">
        {groupName}
      </h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
        이 그룹에 가입하시겠어요?
      </p>

      {err ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">
          {err}
        </p>
      ) : null}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => router.push("/groups")}
          className="h-11 flex-1 rounded-xl border border-zinc-300 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          거절
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={accept}
          className="h-11 flex-1 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {pending ? "가입 중…" : "확인"}
        </button>
      </div>
    </div>
  );
}
