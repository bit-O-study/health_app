"use client";

import { useState, useTransition } from "react";

import { addSurveyCommitmentV2Action } from "@/features/commitments/actions";
import { missionLabel, type MissionSpec } from "@/features/commitments/missions";
import {
  BREAK_OPTIONS,
  INTAKE_FLOOR,
  MAX_BREAKS,
  buildMissions,
  deadlineOf,
  surveyTitleOf,
  type BreakId,
  type KnownProfile,
  type SurveyInput,
  type TimeBudget,
} from "@/features/commitments/survey";

/**
 * 다짐 설문 — 한 화면에 한 문항(2026-09-25 설계).
 *
 * 묻는 건 다섯 가지뿐이다: 기간 · 뭐가 무너지나 · 하루 시간 · 알림 시각 · 주 며칠.
 * 목표·체중·경력·주당 운동일은 **온보딩과 루틴에 이미 있어서 묻지 않는다** —
 * 같은 걸 두 번 물으면 "이 앱이 내가 쓴 걸 안 보는구나"가 된다.
 *
 * 결과 화면에서는 계산된 숫자와 **왜 그 숫자인지**를 같이 보여 주고, 끄거나 고칠 수 있다.
 */

const TIME_CHOICES: { v: TimeBudget; label: string; why: string }[] = [
  { v: 15, label: "15분", why: "짧고 굵게" },
  { v: 30, label: "30분", why: "가장 흔해요" },
  { v: 60, label: "1시간 이상", why: "여유 있음" },
];

const REMIND_CHOICES: { v: string | null; label: string; why: string }[] = [
  { v: "07:00", label: "아침", why: "7시" },
  { v: "12:00", label: "점심", why: "12시" },
  { v: "20:00", label: "저녁", why: "8시 · 추천" },
  { v: "22:00", label: "자기 전", why: "10시" },
];

const STEPS = 5;

function dateLabel(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function SurveySteps({
  me,
  defaultPerWeek,
  today,
  onDone,
}: {
  /** 온보딩·프로필에서 온 값. 설문은 이걸 다시 묻지 않는다. */
  me: KnownProfile;
  /** 주 며칠의 기본값 — 루틴의 주당 운동일. */
  defaultPerWeek: number;
  /** 오늘(YYYY-MM-DD). 다짐은 오늘 시작한다. */
  today: string;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyInput>({
    weeks: 4,
    breaks: [],
    minutes: 30,
    perWeek: Math.min(7, Math.max(1, defaultPerWeek)),
    remindAt: "20:00",
  });
  /** 결과 화면에서 끄거나 고친 미션. 설문을 다시 진행하면 새로 만든다. */
  const [draft, setDraft] = useState<(MissionSpec & { on: boolean })[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof SurveyInput>(k: K, v: SurveyInput[K]) =>
    setAnswers((a) => ({ ...a, [k]: v }));

  function goResult(next: SurveyInput) {
    setDraft(buildMissions(me, next).map((m) => ({ ...m, on: true })));
    setAnswers(next);
    setStep(STEPS);
  }

  function submit() {
    const missions = draft
      .filter((m) => m.on)
      // `on` 은 화면 상태라 저장하지 않는다.
      .map(({ on, ...m }) => (void on, m));
    if (missions.length === 0) {
      setError("미션을 하나 이상 켜 주세요.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await addSurveyCommitmentV2Action({
        answers,
        startDate: today,
        missions,
        title: surveyTitleOf(me, answers.weeks),
      });
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  /** 숫자 조절 — 단위는 미션 종류에 맞춘다(원판처럼 실제로 만들 수 있는 값). */
  function adjust(id: string, dir: 1 | -1) {
    setDraft((rows) =>
      rows.map((m) => {
        if (m.id !== id || !m.target) return m;
        const unit = m.type === "intake_max" || m.type === "no_late_snack" ? 50 : m.type === "burn_kcal" ? 10 : 5;
        const floor =
          m.type === "intake_max" || m.type === "no_late_snack"
            ? INTAKE_FLOOR[me.gender]
            : unit;
        return { ...m, target: Math.max(floor, m.target + dir * unit), why: "직접 정한 값" };
      }),
    );
  }

  const pct = Math.round(((Math.min(step, STEPS) + (step >= STEPS ? 0 : 1)) / STEPS) * 100);

  return (
    <section className="space-y-4" data-testid="commitment-survey">
      <div className="h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/[0.12]">
        <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || pending}
          className="rounded px-1 py-0.5 disabled:opacity-30"
        >
          ‹ 이전
        </button>
        <span>{step >= STEPS ? "완성" : `${step + 1} / ${STEPS}`}</span>
      </div>

      {step === 0 ? (
        <Question ask="얼마 동안 해볼까요?" hint="끝나는 날이 있어야 지켜져요">
          {([2, 4, 8] as const).map((w) => (
            <Choice
              key={w}
              label={`${w}주`}
              why={`${dateLabel(deadlineOf(today, w))}까지${w === 4 ? " · 추천" : ""}`}
              on={answers.weeks === w}
              onPick={() => {
                set("weeks", w);
                setStep(1);
              }}
            />
          ))}
        </Question>
      ) : null}

      {step === 1 ? (
        <Question
          ask="뭐가 제일 자주 무너지나요?"
          hint={`최대 ${MAX_BREAKS}개 · 이게 그대로 다짐이 돼요`}
        >
          <div className="flex flex-wrap gap-1.5">
            {BREAK_OPTIONS.map((b) => {
              const on = answers.breaks.includes(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    set(
                      "breaks",
                      on
                        ? answers.breaks.filter((x) => x !== b.id)
                        : answers.breaks.length < MAX_BREAKS
                          ? ([...answers.breaks, b.id] as BreakId[])
                          : answers.breaks,
                    )
                  }
                  className={`h-9 rounded-full px-3.5 text-sm font-semibold transition ${
                    on
                      ? "bg-brand-soft text-brand"
                      : "bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"
                  }`}
                >
                  {b.emoji} {b.label}
                </button>
              );
            })}
          </div>
          <Next
            label={answers.breaks.length ? `다음 · ${answers.breaks.length}개 선택함` : "다음"}
            onGo={() => setStep(2)}
            skip="특별히 없어요"
            onSkip={() => {
              set("breaks", []);
              setStep(2);
            }}
          />
        </Question>
      ) : null}

      {step === 2 ? (
        <Question
          ask="하루에 운동으로 쓸 수 있는 시간은요?"
          hint={`루틴은 주 ${defaultPerWeek}일로 잡혀 있어요 — 그건 다시 안 물어봐요`}
        >
          {TIME_CHOICES.map((c) => (
            <Choice
              key={c.v}
              label={c.label}
              why={c.why}
              on={answers.minutes === c.v}
              onPick={() => {
                set("minutes", c.v);
                setStep(3);
              }}
            />
          ))}
        </Question>
      ) : null}

      {step === 3 ? (
        <Question ask="언제 확인해 드릴까요?" hint="그 시각에 아직 못 한 것만 알려드려요">
          {REMIND_CHOICES.map((c) => (
            <Choice
              key={c.label}
              label={c.label}
              why={c.why}
              on={answers.remindAt === c.v}
              onPick={() => {
                set("remindAt", c.v);
                setStep(4);
              }}
            />
          ))}
          <Next
            label="다음"
            onGo={() => setStep(4)}
            skip="알림 안 받을래요"
            onSkip={() => {
              set("remindAt", null);
              setStep(4);
            }}
          />
        </Question>
      ) : null}

      {step === 4 ? (
        <Question ask="일주일에 며칠 지킬까요?" hint="매일은 아무도 못 해요">
          {[3, defaultPerWeek, 7]
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .map((d) => (
              <Choice
                key={d}
                label={`주 ${d}일`}
                why={d === defaultPerWeek ? "루틴과 같음 · 추천" : d === 7 ? "매일" : "가볍게"}
                on={answers.perWeek === d}
                onPick={() => goResult({ ...answers, perWeek: d })}
              />
            ))}
          {answers.perWeek === 7 && me.experience === "beginner" ? (
            <p className="rounded-[10px] bg-warn/10 px-3 py-2 text-xs text-warn">
              이제 막 시작하셨어요. 주 3일부터 쌓는 편이 오래 갑니다.
            </p>
          ) : null}
        </Question>
      ) : null}

      {step >= STEPS ? (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">이렇게 만들까요?</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {answers.weeks}주 · <b>주 {answers.perWeek}일</b> ·{" "}
            {answers.remindAt ? `${answers.remindAt.slice(0, 2)}시 알림` : "알림 없음"}
          </p>
          <ul className="app-list">
            {draft.map((m) => (
              <li key={m.id} className="flex items-start gap-3 px-3 py-3">
                <button
                  type="button"
                  aria-label={`${missionLabel(m)} ${m.on ? "빼기" : "넣기"}`}
                  aria-pressed={m.on}
                  onClick={() =>
                    setDraft((rows) =>
                      rows.map((r) => (r.id === m.id ? { ...r, on: !r.on } : r)),
                    )
                  }
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs ${
                    m.on
                      ? "border-brand bg-brand text-white dark:text-zinc-950"
                      : "border-zinc-300 text-transparent dark:border-zinc-600"
                  } ${m.type === "manual_check" ? "" : "border-dashed"}`}
                >
                  ✓
                </button>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-semibold ${m.on ? "" : "text-zinc-400 line-through"}`}
                  >
                    {missionLabel(m)}
                  </span>
                  {m.why ? (
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">{m.why}</span>
                  ) : null}
                  {m.on && m.target > 0 ? (
                    <span className="mt-1 flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`${missionLabel(m)} 줄이기`}
                        onClick={() => adjust(m.id!, -1)}
                        className="h-7 w-7 rounded-lg border app-field text-sm"
                      >
                        −
                      </button>
                      <span className="min-w-14 text-center text-sm font-bold tabular-nums">
                        {m.target.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        aria-label={`${missionLabel(m)} 늘리기`}
                        onClick={() => adjust(m.id!, 1)}
                        className="h-7 w-7 rounded-lg border app-field text-sm"
                      >
                        +
                      </button>
                    </span>
                  ) : null}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                    m.type === "manual_check"
                      ? "bg-warn/10 text-warn"
                      : "bg-zinc-100 text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-400"
                  }`}
                >
                  {m.type === "manual_check" ? "수동" : "자동"}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            자동은 기록에서 앱이 판정해요. 수동은 직접 체크합니다.
          </p>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            data-testid="survey-submit"
            className="app-press h-11 w-full rounded-full bg-brand text-sm font-semibold text-white disabled:opacity-50 dark:text-zinc-950"
          >
            {pending ? "만드는 중…" : "다짐 시작하기"}
          </button>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="w-full text-xs font-semibold text-zinc-500 dark:text-zinc-400"
          >
            처음부터 다시
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Question({
  ask,
  hint,
  children,
}: {
  ask: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold leading-snug">{ask}</h2>
        {hint ? (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Choice({
  label,
  why,
  on,
  onPick,
}: {
  label: string;
  why?: string;
  on: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
        on
          ? "border-brand bg-brand-soft font-bold text-brand"
          : "border-[var(--line)] bg-[var(--surface-strong)]"
      }`}
    >
      <span>{label}</span>
      {why ? <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{why}</span> : null}
    </button>
  );
}

function Next({
  label,
  onGo,
  skip,
  onSkip,
}: {
  label: string;
  onGo: () => void;
  skip: string;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-1.5 pt-1">
      <button
        type="button"
        onClick={onGo}
        className="app-press h-11 w-full rounded-full bg-brand text-sm font-semibold text-white dark:text-zinc-950"
      >
        {label}
      </button>
      <button
        type="button"
        onClick={onSkip}
        className="w-full text-xs font-semibold text-zinc-500 dark:text-zinc-400"
      >
        {skip}
      </button>
    </div>
  );
}
