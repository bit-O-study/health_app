"use client";

import {
  AGE_GROUPS,
  BODY_STYLE_OPTIONS,
  SESSION_MINUTES,
  type AgeGroup,
  type BodyStyleChoice,
  type SessionMinutes,
} from "@/features/profile/survey-extra";

/**
 * 설문 3문항 칩 — 가입 설문과 설정(맞춤 운동 설정)이 같이 쓴다. 각 질문은 탭 한 번.
 */
export function SurveyExtraFields({
  ageGroup,
  bodyStyle,
  sessionMinutes,
  onChange,
}: {
  ageGroup: AgeGroup | null;
  bodyStyle: BodyStyleChoice | null;
  sessionMinutes: SessionMinutes | null;
  onChange: (patch: { ageGroup?: AgeGroup; bodyStyle?: BodyStyleChoice; sessionMinutes?: SessionMinutes }) => void;
}) {
  const chip = (on: boolean) =>
    `min-h-11 rounded-xl px-3 text-sm font-semibold ${
      on ? "bg-brand text-white dark:text-zinc-950" : "bg-zinc-100 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
    }`;
  return (
    <div className="space-y-5">
      <div role="group" aria-label="나이대" className="space-y-2">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">나이대</p>
        <div className="grid grid-cols-3 gap-2">
          {AGE_GROUPS.map((g) => (
            <button key={g.id} type="button" aria-pressed={ageGroup === g.id} onClick={() => onChange({ ageGroup: g.id })} className={chip(ageGroup === g.id)}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div role="group" aria-label="몸 목표 스타일" className="space-y-2">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">어떤 몸을 만들고 싶나요?</p>
        <div className="space-y-2">
          {BODY_STYLE_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={bodyStyle === o.id}
              onClick={() => onChange({ bodyStyle: o.id })}
              className={`flex w-full flex-col items-start py-2 text-left ${chip(bodyStyle === o.id)}`}
            >
              <span>{o.label}</span>
              <span className={`text-xs font-normal ${bodyStyle === o.id ? "opacity-90" : "text-zinc-500 dark:text-zinc-400"}`}>{o.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div role="group" aria-label="1회 운동 시간" className="space-y-2">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">한 번에 운동하는 시간</p>
        <div className="grid grid-cols-3 gap-2">
          {SESSION_MINUTES.map((m) => (
            <button key={m.id} type="button" aria-pressed={sessionMinutes === m.id} onClick={() => onChange({ sessionMinutes: m.id })} className={chip(sessionMinutes === m.id)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
