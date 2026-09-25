"use client";
import { useActionState, type ReactNode } from "react";
import { trainerAction } from "./actions";
import { SHARE_FIELDS, SHARE_LABELS, type Sharing } from "./types";
export function TrainerForm({ intent, label, children }: { intent: string; label: string; children?: ReactNode }) {
  const [state, action, pending] = useActionState(trainerAction, { ok: false, message: "" });
  return <form action={action} className="space-y-3">
    <input type="hidden" name="intent" value={intent} />
    <fieldset disabled={pending} className="space-y-3 disabled:opacity-60">{children}
      <button className="min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white dark:text-zinc-950" type="submit">{pending ? "처리 중…" : label}</button>
    </fieldset>
    {state.message && <p role={state.ok ? "status" : "alert"} className="text-sm leading-6">{state.message}</p>}
    {state.link && <label className="block space-y-1 text-sm">초대 링크 (7일 유효)<input readOnly value={state.link} onFocus={event => event.target.select()} className="min-h-11 w-full rounded-lg border border-line px-2" /></label>}
  </form>;
}
export function SharingFields({ initial }: { initial?: Sharing }) {
  return <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">트레이너에게 허용할 정보</legend>
    {SHARE_FIELDS.map(key => <label key={key} className="flex min-h-11 items-center gap-3 text-sm">
      <input type="checkbox" name={key} defaultChecked={initial?.[key] ?? false} className="h-5 w-5 accent-brand" />{SHARE_LABELS[key]}
    </label>)}
  </fieldset>;
}