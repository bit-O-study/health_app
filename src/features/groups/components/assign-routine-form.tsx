"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { assignRoutineDayAction } from "@/features/groups/trainer-actions";
import type { DaySlot } from "@/features/routine/data";

/**
 * 루틴 배정 — 내 일차 하나를 회원의 일차 하나로 복사한다.
 *
 * 🔴 **되돌리기 어렵다.** 회원이 그 일차에 짜 둔 운동은 지워진다. 그래서 버튼 한 번으로
 * 끝내지 않고 "누구의 무슨 요일이 어떻게 바뀌는지"를 문장으로 보여 준 뒤 확인을 받는다.
 * (회원 입장에서는 자기가 안 한 변경이라, 무엇이 바뀌었는지 말해 줄 수 있어야 한다.)
 */
export function AssignRoutineForm({
  groupId,
  memberId,
  memberName,
  mine,
  theirs,
}: {
  groupId: string;
  memberId: string;
  memberName: string;
  mine: DaySlot[];
  theirs: DaySlot[];
}) {
  const router = useRouter();
  const [from, setFrom] = useState<number | null>(mine[0]?.dayIndex ?? null);
  const [to, setTo] = useState<number | null>(theirs[0]?.dayIndex ?? null);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const fromSlot = mine.find((s) => s.dayIndex === from) ?? null;
  const toSlot = theirs.find((s) => s.dayIndex === to) ?? null;
  const ready = fromSlot !== null && toSlot !== null;

  if (mine.length === 0) {
    return (
      <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-6 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        먼저 내 루틴을 만들어야 회원에게 배정할 수 있어요.
      </p>
    );
  }
  if (theirs.length === 0) {
    return (
      <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-6 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        {memberName} 님이 아직 루틴을 만들지 않았어요. 회원이 루틴을 만든 뒤에 배정할 수
        있어요.
      </p>
    );
  }

  function submit() {
    if (!ready || pending) return;
    setMsg(null);
    start(async () => {
      const res = await assignRoutineDayAction(groupId, memberId, from!, to!);
      setConfirming(false);
      if (!res.ok) return setMsg(res.error);
      setMsg(`${memberName} 님의 ${toSlot!.label}에 운동 ${res.count}개를 배정했어요.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-zinc-500">내 루틴</span>
          <select
            aria-label="내 일차"
            value={from ?? ""}
            onChange={(e) => setFrom(Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {mine.map((s) => (
              <option key={`${s.dayIndex}-${s.focus}`} value={s.dayIndex}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <ArrowRight aria-hidden="true" size={16} className="mb-3 text-zinc-400" />
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-zinc-500">
            {memberName} 님
          </span>
          <select
            aria-label="회원 일차"
            value={to ?? ""}
            onChange={(e) => setTo(Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {theirs.map((s) => (
              <option key={`${s.dayIndex}-${s.focus}`} value={s.dayIndex}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800 dark:bg-amber-900/25 dark:text-amber-200">
        배정하면 {memberName} 님의 <strong>{toSlot?.label ?? "그 일차"}</strong>에 있던
        운동은 지워지고 내 <strong>{fromSlot?.label ?? "일차"}</strong> 운동으로 바뀌어요.
        <br />
        <strong>무게는 넘어가지 않아요</strong> — 회원이 운동하며 자기 무게를 넣어요.
      </p>

      {confirming ? (
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="assign-confirm"
            disabled={pending}
            onClick={submit}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? <Loader2 aria-hidden="true" size={15} className="animate-spin" /> : null}
            네, 배정할게요
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="h-11 rounded-xl border border-zinc-300 px-4 text-sm font-bold text-zinc-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
          >
            취소
          </button>
        </div>
      ) : (
        <button
          type="button"
          data-testid="assign-start"
          disabled={!ready || pending}
          onClick={() => setConfirming(true)}
          className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          루틴 배정하기
        </button>
      )}

      {msg ? (
        <p data-testid="assign-message" className="text-xs leading-5 text-zinc-700 dark:text-zinc-200">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
