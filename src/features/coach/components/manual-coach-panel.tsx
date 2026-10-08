"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCw, Send } from "lucide-react";

import { requestManualCoach } from "../manual-actions";
import { WorkoutReviewCard } from "./workout-review-card";
import type { CoachReview } from "../workout-review";
import {
  COACH_MINUTES,
  DEFAULT_COACH_PREFERENCES,
  COACH_KINDS,
  COACH_KIND_LABELS,
  type CoachPreferences,
  type CoachKind,
  type CoachRequest,
} from "../manual-model";

/** 탭·칩에 쓰는 짧은 이름(2026-10-05 화면 정리 — 버튼 글자가 길어 줄이 넘쳤다). 질문에 붙는 긴 이름은 모델 쪽 그대로. */
const KIND_SHORT: Record<CoachKind, string> = {
  recommendation: "오늘 추천",
  "habit-report": "주간 리포트",
  consultation: "상담",
};
const KIND_HINT: Record<CoachKind, string> = {
  recommendation: "하루 한 번 · 조건에 맞춰 운영자가 오늘 운동을 골라 드려요.",
  "habit-report": "한 주에 한 번 · 최근 기록으로 운동 습관을 정리해 드려요.",
  consultation: "하루 20건까지 · 운동 고민을 남기면 운영자가 확인 후 답해요.",
};
const EQUIPMENT_SHORT: Record<CoachPreferences["equipment"], string> = { gym: "헬스장", dumbbells: "덤벨만", bodyweight: "맨몸" };
const PURPOSE_SHORT: Record<CoachPreferences["purpose"], string> = { today: "오늘 구성", alternative: "대체 운동", plateau: "정체 점검" };

function Chips<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</p>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={String(o.id)}
            type="button"
            aria-pressed={value === o.id}
            disabled={disabled}
            onClick={() => onChange(o.id)}
            className={`h-9 rounded-full px-3.5 text-sm font-semibold disabled:opacity-50 ${
              value === o.id ? "bg-brand text-white dark:text-zinc-950" : "bg-zinc-100 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 상담함(라이트 990원 혜택, 2026-10-05 병합) — 오늘 추천 · 주간 리포트 · 상담을 남기면 운영자가 답한다.
 * 구독이 끝나도 받은 답변은 그대로 보이고, 새 요청 칸만 사라진다.
 */
export function ManualCoachPanel({ rows, active, review, reviewError }: { rows: CoachRequest[]; active: boolean; review?: CoachReview | null; reviewError?: string | null }) {
  const router = useRouter();
  const [kind, setKind] = useState<CoachKind>("recommendation");
  const [question, setQuestion] = useState("");
  const [preferences, setPreferences] = useState<CoachPreferences>(DEFAULT_COACH_PREFERENCES);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const requestId = useRef<string | null>(null);
  function updatePreferences(patch: Partial<CoachPreferences>) {
    setPreferences((value) => ({ ...value, ...patch }));
    requestId.current = null;
  }
  const field = "w-full rounded-[10px] bg-zinc-100 px-3 text-base text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08] dark:text-zinc-100";

  return (
    <div className="space-y-3">
      {active && review && (
        <WorkoutReviewCard
          review={review}
          onConsult={(text) => {
            setKind("consultation");
            setQuestion(text);
            requestId.current = null;
            setMessage("아래 상담 내용을 확인하고 보내기를 눌러 주세요.");
          }}
        />
      )}
      {active && reviewError && <p role="alert" className="app-card p-4 text-sm">{reviewError}</p>}

      {active && (
        <form
          className="app-card space-y-4 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            requestId.current ??= crypto.randomUUID();
            const id = requestId.current;
            start(async () => {
              try {
                const result = await requestManualCoach(kind, question, id, kind === "recommendation" ? preferences : undefined);
                setMessage(
                  result.ok
                    ? result.existing
                      ? "이 기간엔 이미 보낸 요청이 있어요. 더 궁금한 건 상담으로 남겨 주세요."
                      : "보냈어요. 답이 오면 아래에 보여요."
                    : result.error,
                );
                if (result.ok) {
                  requestId.current = null;
                  setQuestion("");
                  router.refresh();
                }
              } catch {
                setMessage("연결이 끊겼어요. 다시 보내도 같은 요청으로 접수돼요.");
              }
            });
          }}
        >
          <div role="tablist" aria-label="요청 종류" className="grid grid-cols-3 gap-1 rounded-full bg-zinc-100 p-1 dark:bg-white/[0.06]">
            {COACH_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={kind === k}
                disabled={pending}
                onClick={() => {
                  setKind(k);
                  requestId.current = null;
                }}
                className={`h-9 rounded-full text-sm font-semibold ${
                  kind === k ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {KIND_SHORT[k]}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{KIND_HINT[kind]}</p>

          {kind === "recommendation" && (
            <div className="space-y-3">
              <Chips
                label="가능한 시간"
                value={preferences.minutes}
                options={COACH_MINUTES.map((m) => ({ id: m, label: `${m}분` }))}
                onChange={(m) => updatePreferences({ minutes: m })}
                disabled={pending}
              />
              <Chips
                label="사용할 기구"
                value={preferences.equipment}
                options={(Object.keys(EQUIPMENT_SHORT) as CoachPreferences["equipment"][]).map((k) => ({ id: k, label: EQUIPMENT_SHORT[k] }))}
                onChange={(k) => updatePreferences({ equipment: k })}
                disabled={pending}
              />
              <Chips
                label="필요한 도움"
                value={preferences.purpose}
                options={(Object.keys(PURPOSE_SHORT) as CoachPreferences["purpose"][]).map((k) => ({ id: k, label: PURPOSE_SHORT[k] }))}
                onChange={(k) => updatePreferences({ purpose: k })}
                disabled={pending}
              />
              {preferences.purpose !== "today" && (
                <input
                  aria-label="대상 운동"
                  required
                  maxLength={100}
                  className={`${field} h-11`}
                  placeholder="예: 벤치프레스 / 없는 기구"
                  value={preferences.exercise}
                  disabled={pending}
                  onChange={(e) => updatePreferences({ exercise: e.target.value })}
                />
              )}
            </div>
          )}

          <label className="block space-y-1.5" htmlFor="coach-question">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {kind === "consultation" ? "상담할 내용" : "목표·컨디션·궁금한 점(선택)"}
            </span>
            <textarea
              id="coach-question"
              rows={4}
              maxLength={1700}
              className={`${field} py-2.5`}
              value={question}
              disabled={pending}
              onChange={(e) => {
                setQuestion(e.target.value);
                requestId.current = null;
              }}
            />
          </label>
          <button
            disabled={pending}
            className="app-press inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-base font-semibold text-white disabled:opacity-50 dark:text-zinc-950"
          >
            {pending ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <Send aria-hidden="true" size={16} />}
            보내기
          </button>
          {message ? (
            <p role="status" className="text-sm text-zinc-700 dark:text-zinc-200">
              {message}
            </p>
          ) : null}
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            최근 30일 운동 기록과 운동 계획이 함께 전달돼요. 루틴은 바뀌지 않아요. 진단·치료가 아닌 운동 안내예요.
          </p>
        </form>
      )}

      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">받은 답변</h2>
        <button
          type="button"
          onClick={() => router.refresh()}
          aria-label="새로고침"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 active:bg-zinc-100 dark:active:bg-white/[0.06]"
        >
          <RotateCw aria-hidden="true" size={16} />
        </button>
      </div>
      {rows.length === 0 && <p className="app-card p-4 text-sm text-zinc-500">아직 받은 답변이 없어요.<br />보내면 여기에 쌓여요.</p>}
      {rows.map((row) => (
        <article key={row.id} className="app-card space-y-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{COACH_KIND_LABELS[row.kind]}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                row.answer ? "bg-brand-soft text-brand" : "bg-zinc-100 text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-400"
              }`}
            >
              {row.answer ? "답변 완료" : "답변 대기"}
            </span>
          </div>
          <p className="text-xs text-zinc-500">{row.for_date}</p>
          {row.question && <p className="whitespace-pre-wrap break-words text-sm text-zinc-500">{row.question}</p>}
          {row.answer && <p className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-900 dark:text-zinc-100">{row.answer}</p>}
        </article>
      ))}
    </div>
  );
}
