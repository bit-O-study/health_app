"use client";

import { useState, useTransition } from "react";

import { savePainAreasAction } from "@/features/routine/checkin-actions";
import { PAIN_AREAS, PAIN_LABEL } from "@/features/routine/checkin";
import type { BodyPart } from "@/features/routine/exercise-catalog-labels";

/** 아픈 부위 고르기 — 고르고 [저장]. 다 풀면 '없음'. */
export function PainAreaPicker({ initial }: { initial: BodyPart[] }) {
  const [picked, setPicked] = useState<ReadonlySet<BodyPart>>(new Set(initial));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(p: BodyPart) {
    setMsg(null);
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });
  }

  function save() {
    start(async () => {
      const r = await savePainAreasAction([...picked]);
      setMsg(r.ok ? "저장했어요." : (r.error ?? "저장하지 못했어요."));
    });
  }

  return (
    <section className="app-card space-y-3 p-3" data-testid="pain-areas">
      <div role="group" aria-label="아픈 부위" className="grid grid-cols-2 gap-2">
        {PAIN_AREAS.map((p) => {
          const on = picked.has(p);
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(p)}
              className={`h-11 rounded-xl text-sm font-semibold ${
                on ? "bg-brand text-white dark:text-zinc-950" : "bg-zinc-100 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
              }`}
            >
              {PAIN_LABEL[p]}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="app-press h-10 w-full rounded-full bg-brand text-sm font-semibold text-white dark:text-zinc-950 disabled:opacity-50"
      >
        저장
      </button>
      {msg ? <p role="status" className="text-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">{msg}</p> : null}
    </section>
  );
}
