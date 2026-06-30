"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";

import { updateNicknameAction } from "@/features/profile/actions";

/** 마이페이지 닉네임 표시 + 인라인 편집. 비우면 이름으로 폴백. */
export function NicknameEditor({ initial }: { initial: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setErr(null);
    start(async () => {
      const res = await updateNicknameAction(value);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(initial);
          setErr(null);
          setEditing(true);
        }}
        className="mt-2 inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
      >
        <Pencil aria-hidden="true" size={12} />
        {initial ? "닉네임 수정" : "닉네임 설정"}
      </button>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={value}
          maxLength={20}
          onChange={(e) => setValue(e.target.value)}
          placeholder="닉네임 (미설정 시 이름)"
          aria-label="닉네임"
          className="h-9 w-44 rounded-lg border border-zinc-300 bg-white px-2.5 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="button"
          aria-label="저장"
          onClick={save}
          disabled={pending}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 aria-hidden="true" size={15} className="animate-spin" />
          ) : (
            <Check aria-hidden="true" size={15} />
          )}
        </button>
        <button
          type="button"
          aria-label="취소"
          onClick={() => setEditing(false)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <X aria-hidden="true" size={15} />
        </button>
      </div>
      {err ? <p className="mt-1 text-[11px] text-red-500">{err}</p> : null}
    </div>
  );
}
