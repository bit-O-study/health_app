"use client";

import { useState, useTransition } from "react";

import { saveSurveyExtraAction } from "@/features/profile/actions";
import { SurveyExtraFields } from "@/features/profile/components/survey-extra-fields";
import type { SurveyExtra } from "@/features/profile/survey-extra";

/** 맞춤 운동 설정 폼 — 고르고 [저장]. */
export function SurveyExtraForm({ initial }: { initial: SurveyExtra }) {
  const [v, setV] = useState<SurveyExtra>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="app-card space-y-4 p-4" data-testid="survey-extra-form">
      <SurveyExtraFields
        ageGroup={v.ageGroup}
        bodyStyle={v.bodyStyle}
        sessionMinutes={v.sessionMinutes}
        onChange={(p) => {
          setMsg(null);
          setV((cur) => ({ ...cur, ...p }));
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await saveSurveyExtraAction(v);
            setMsg(r.ok ? "저장했어요." : r.error);
          })
        }
        className="app-press h-11 w-full rounded-full bg-brand text-sm font-semibold text-white dark:text-zinc-950 disabled:opacity-50"
      >
        저장
      </button>
      {msg ? <p role="status" className="text-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">{msg}</p> : null}
    </section>
  );
}
