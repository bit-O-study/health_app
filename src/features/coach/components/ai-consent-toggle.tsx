"use client";

import { useState, useTransition } from "react";

import { setAiConsentAction } from "@/features/coach/ai-trainer-actions";

/** 동의 상태 한 줄 + 동의/철회 버튼. */
export function AiConsentToggle({ initial }: { initial: boolean }) {
  const [consent, setConsent] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle() {
    setError(null);
    const next = !consent;
    start(async () => {
      const r = await setAiConsentAction(next);
      if (!r.ok) return setError(r.error ?? "저장하지 못했어요.");
      setConsent(next);
    });
  }

  return (
    <section className="app-card space-y-2 p-3" data-testid="ai-consent-status" data-consent={consent ? "1" : "0"}>
      <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {consent ? "동의했어요" : "동의하지 않았어요"}
      </p>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`app-press h-10 w-full rounded-full text-sm font-semibold disabled:opacity-50 ${
          consent
            ? "border border-line text-zinc-700 dark:text-zinc-200"
            : "bg-brand text-white dark:text-zinc-950"
        }`}
      >
        {consent ? "동의 철회하기" : "동의하기"}
      </button>
      {error ? <p role="alert" className="text-xs font-semibold text-danger">{error}</p> : null}
    </section>
  );
}
