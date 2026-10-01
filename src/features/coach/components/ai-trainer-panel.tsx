"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";

import {
  applyTodayPlanAction,
  generateTodayPlanAction,
  setAiConsentAction,
} from "@/features/coach/ai-trainer-actions";
import {
  TIME_OPTIONS,
  readStoredPlan,
  todayPlanStorageKey,
  type TimeBudget,
  type TodayPlan,
} from "@/features/coach/ai-trainer";
import type { ApplyMode } from "@/features/coach/ai-trainer-actions";
import { AiDisclaimer } from "@/features/coach/components/ai-disclaimer";
import { BODY_PART_LABEL } from "@/features/routine/exercise-catalog-labels";
import type { AiTier } from "@/features/coach/ai-quota";

function readPlan(key: string): TodayPlan | null {
  try {
    return readStoredPlan(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}
function writePlan(key: string, plan: TodayPlan) {
  try {
    window.localStorage.setItem(key, JSON.stringify(plan));
  } catch {
    /* 보관 실패 — 다시 열면 한 번 더 만들 뿐이다 */
  }
}

/**
 * AI 트레이너 탭 본문 — 내 상태 · 동의 · 오늘의 운동 · [적용].
 *
 * 🔴 [적용]을 눌러야만 '오늘만 운동 변경'으로 넘어간다(사용자 결정). 적용 뒤엔 오늘 운동 화면으로.
 * 만든 제안은 이 기기에 오늘 하루 보관한다 — 다시 열 때 AI 를 또 부르지 않는다(한도를 안 먹는다).
 */
export function AiTrainerPanel({
  userId,
  today,
  stateLines,
  consent: initialConsent,
  remaining: initialRemaining,
  limit,
  tier,
  initialMinutes = null,
}: {
  userId: string;
  today: string;
  stateLines: string[];
  consent: boolean;
  remaining: number;
  limit: number;
  tier: AiTier;
  /** 설문의 1회 운동 시간(2026-10-01) — 시간 칩의 처음 값. */
  initialMinutes?: TimeBudget;
}) {
  const router = useRouter();
  const key = todayPlanStorageKey(userId, today);
  const [consent, setConsent] = useState(initialConsent);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [plan, setPlan] = useState<TodayPlan | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // 시간 맞춤(2026-09-30) — "오늘 30분만". null = 제한 없음.
  const [minutes, setMinutes] = useState<TimeBudget>(initialMinutes);

  const show = (p: TodayPlan) => {
    setPlan(p);
    setPicked(new Set(p.items.map((i) => i.exerciseId)));
  };

  // 오늘 이미 만든 제안이 있으면 그대로 — 기기 보관은 렌더 뒤에만 읽을 수 있다.
  useEffect(() => {
    const saved = readPlan(key);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) show(saved);
    // 테스트 전용 입구 — AI 없이 제안을 넣어 [적용] 흐름을 확인한다. 배포 빌드엔 없다.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __jimkkunAiTrainerSeed?: (p: TodayPlan) => void }).__jimkkunAiTrainerSeed = show;
    }
  }, [key]);

  function agree() {
    setError(null);
    start(async () => {
      const r = await setAiConsentAction(true);
      if (!r.ok) return setError(r.error ?? "동의를 저장하지 못했어요.");
      setConsent(true);
      // 아래 식단·다짐 칸도 동의 상태를 다시 읽게.
      router.refresh();
    });
  }

  function generate() {
    setError(null);
    setNotice(null);
    start(async () => {
      const r = await generateTodayPlanAction(minutes);
      if (!r.ok) {
        if (r.needsConsent) setConsent(false);
        return setError(r.error);
      }
      writePlan(key, r.plan);
      show(r.plan);
      setRemaining((n) => Math.max(0, n - 1));
    });
  }

  function apply(mode: ApplyMode) {
    if (!plan) return;
    setError(null);
    const items = plan.items
      .filter((i) => picked.has(i.exerciseId))
      .map((i) => ({ exerciseId: i.exerciseId, equipment: i.equipment }));
    start(async () => {
      const r = await applyTodayPlanAction(items, mode);
      if (!r.ok) return setError(r.error);
      if (r.added === 0) return setNotice("고른 운동은 오늘 이미 하게 돼 있어요.");
      // '오늘만 운동 변경'으로 넘겼다 — 오늘 운동 화면에서 바로 확인하게 보낸다.
      router.push("/routine");
    });
  }

  const outOfQuota = remaining <= 0;

  return (
    <div className="space-y-3">
      <section className="app-card space-y-2 p-3" data-testid="ai-trainer-state">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">AI가 보는 내 상태</h2>
        {stateLines.length ? (
          <ul className="space-y-1 text-sm text-zinc-700 dark:text-zinc-200">
            {stateLines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">아직 기록이 거의 없어요. 운동·체중을 기록할수록 정확해져요.</p>
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          AI에는 이 숫자 요약만 보내요. 이름·이메일·연락처는 보내지 않아요.
        </p>
      </section>

      {!consent ? (
        <section className="app-card space-y-2 p-3" data-testid="ai-trainer-consent">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <ShieldCheck aria-hidden="true" size={18} className="text-brand" />
            AI 맞춤 추천 동의
          </h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-200">
            오늘의 운동을 짜려면 위 상태 요약(운동·체중·체성분·식단·수분 숫자)을 외부 AI(Google Gemini 등,
            국외 서버)로 보내요. 동의는 설정 › AI 이용 동의에서 언제든 철회할 수 있어요.
          </p>
          <button
            type="button"
            onClick={agree}
            disabled={pending}
            className="app-press h-10 w-full rounded-full bg-brand text-sm font-semibold text-white dark:text-zinc-950 disabled:opacity-50"
          >
            동의하고 시작하기
          </button>
        </section>
      ) : (
        <section className="app-card space-y-2 p-3">
          <div role="group" aria-label="오늘 운동 시간" className="flex gap-1.5" data-testid="ai-trainer-time">
            {TIME_OPTIONS.map((m) => (
              <button
                key={String(m)}
                type="button"
                aria-pressed={minutes === m}
                onClick={() => setMinutes(m)}
                className={`h-9 flex-1 rounded-full text-sm font-semibold ${
                  minutes === m
                    ? "bg-brand text-white dark:text-zinc-950"
                    : "bg-zinc-100 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
                }`}
              >
                {m === null ? "제한 없음" : `${m}분`}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-testid="ai-trainer-generate"
            onClick={generate}
            disabled={pending || outOfQuota}
            className="app-press inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-base font-semibold text-white dark:text-zinc-950 disabled:opacity-50"
          >
            {pending ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <Sparkles aria-hidden="true" size={16} />}
            {plan ? "오늘 운동 다시 짜 줘" : "오늘 운동 짜 줘"}
          </button>
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400" data-testid="ai-trainer-remaining">
            이번 달 {remaining}회 남았어요 (월 {limit}회)
          </p>
          {outOfQuota && tier === "free" ? (
            <Link href="/settings/subscription" className="block text-center text-sm font-semibold text-brand">
              베이직이면 매일 받아요 · 월 3,900원 →
            </Link>
          ) : null}
        </section>
      )}

      {error ? (
        <p role="alert" className="rounded-[10px] bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}

      {plan ? (
        <section className="app-card space-y-3 p-3" data-testid="ai-trainer-plan">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">오늘의 운동</h2>
          {plan.summary ? <p className="text-sm text-zinc-700 dark:text-zinc-200">{plan.summary}</p> : null}
          <ul className="space-y-2">
            {plan.items.map((it) => {
              const on = picked.has(it.exerciseId);
              return (
                <li key={it.exerciseId}>
                  <button
                    type="button"
                    aria-pressed={on}
                    data-testid={`ai-trainer-item-${it.exerciseId}`}
                    onClick={() =>
                      setPicked((s) => {
                        const n = new Set(s);
                        if (n.has(it.exerciseId)) n.delete(it.exerciseId);
                        else n.add(it.exerciseId);
                        return n;
                      })
                    }
                    className={`flex w-full items-start gap-2 rounded-xl border p-2.5 text-left ${
                      on ? "border-brand bg-brand-soft/50" : "border-line"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        on ? "bg-brand text-white dark:text-zinc-950" : "border border-line"
                      }`}
                    >
                      {on ? <Check aria-hidden="true" size={13} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {it.name}
                        <span className="ml-1.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                          {BODY_PART_LABEL[it.part]}
                        </span>
                      </span>
                      {it.reason ? (
                        <span className="block text-xs text-zinc-600 dark:text-zinc-300">{it.reason}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {plan.tip ? <p className="text-xs text-zinc-600 dark:text-zinc-300">팁: {plan.tip}</p> : null}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              data-testid="ai-trainer-replace"
              onClick={() => apply("replace")}
              disabled={pending || picked.size === 0}
              className="app-press inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-base font-semibold text-white dark:text-zinc-950 disabled:opacity-50"
            >
              {pending ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : null}
              오늘 운동을 이 {picked.size}개로 바꾸기
            </button>
            <button
              type="button"
              data-testid="ai-trainer-apply"
              onClick={() => apply("add")}
              disabled={pending || picked.size === 0}
              className="app-press inline-flex h-10 w-full items-center justify-center rounded-full border border-brand text-sm font-semibold text-brand disabled:opacity-50"
            >
              오늘 운동에 {picked.size}개 더하기
            </button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            <b>오늘만</b> 바뀌고 내 루틴은 그대로예요. 바꾸기를 고르면 오늘 원래 운동은 내일로 미뤄져요.
            무게·세트는 내 기록에 맞춰 정해져요.
          </p>
          {notice ? <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{notice}</p> : null}
          <AiDisclaimer />
        </section>
      ) : null}
    </div>
  );
}
