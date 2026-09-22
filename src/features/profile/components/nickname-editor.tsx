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
        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand transition active:opacity-60"
      >
        <Pencil aria-hidden="true" size={12} />
        {initial ? "닉네임 수정" : "닉네임 설정"}
      </button>
    );
  }

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={value}
          maxLength={20}
          onChange={(e) => setValue(e.target.value)}
          placeholder="닉네임 (미설정 시 이름)"
          aria-label="닉네임"
          className="h-9 w-44 rounded-[10px] bg-zinc-100 px-2.5 text-base outline-none focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08] dark:text-zinc-100"
        />
        <button
          type="button"
          aria-label="저장"
          onClick={save}
          disabled={pending}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand text-white dark:text-zinc-950 transition active:opacity-80 disabled:opacity-50"
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
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-zinc-500 transition active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-white/[0.06]"
        >
          <X aria-hidden="true" size={15} />
        </button>
      </div>
      {err ? <p className="mt-1 text-xs text-danger">{err}</p> : null}
    </div>
  );
}
