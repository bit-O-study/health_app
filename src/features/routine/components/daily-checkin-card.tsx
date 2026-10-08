"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartPulse, Loader2 } from "lucide-react";

import { lightenTodayAction, saveCheckinAction } from "@/features/routine/checkin-actions";
import {
  CHECKIN_QUESTIONS,
  PAIN_LABEL,
  adviceFor,
  isCheckin,
  type Checkin,
  type Level,
} from "@/features/routine/checkin";
import type { BodyPart } from "@/features/routine/exercise-catalog-labels";
import { swapPainExercisesTodayAction } from "@/features/lite/pain-swap-actions";
import type { PainSwapPreview } from "@/features/lite/pain-swap-data";

const lightKey = (ymd: string) => `jimkkun.checkin-lightened.${ymd}`;

/**
 * 오늘 컨디션(무료, 2026-09-30) — 운동 전에 3번 탭. 안 좋으면 [오늘만 세트 줄이기]를 권한다.
 * 아픈 부위(설정)가 오늘 운동에 있으면 같이 알린다. 줄이기는 오늘 계획에서만(루틴 불변).
 */
export function DailyCheckinCard({
  today,
  initial,
  painConflicts,
  painSwap = null,
  onSaved,
}: {
  today: string;
  initial: Checkin | null;
  painConflicts: { part: BodyPart; count: number }[];
  /** 아픈 부위 대체(라이트 2단계, 2026-10-02) — 라이트면 짝 미리보기 + 바꾸기, 무료면 안내 한 줄. */
  painSwap?: PainSwapPreview | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Partial<Checkin>>(initial ?? {});
  const [saved, setSaved] = useState<Checkin | null>(initial);
  const [editing, setEditing] = useState(initial === null);
  const [step, setStep] = useState(0);
  const [lightened, setLightened] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem(lightKey(today)) === "1") setLightened(true);
    } catch {
      /* 기기 보관을 못 읽어도 괜찮다 */
    }
  }, [today]);

  function choose(key: keyof Checkin, value: Level) {
    setPicked(current => ({ ...current, [key]: value }));
    setMsg(null);
  }

  function save() {
    if (!isCheckin(picked)) return;
    const checkin = picked;
    setMsg(null);
    start(async () => {
      const result = await saveCheckinAction(checkin);
      if (!result.ok) return setMsg(result.error);
      setSaved(checkin);
      setEditing(false);
      onSaved?.();
    });
  }

  function lighten() {
    setMsg(null);
    start(async () => {
      const r = await lightenTodayAction();
      if (!r.ok) return setMsg(r.error);
      setLightened(true);
      try {
        window.localStorage.setItem(lightKey(today), "1");
      } catch {
        /* 보관 실패 */
      }
      setMsg(r.changed > 0 ? `오늘 운동 ${r.changed}개의 세트를 하나씩 줄였어요.` : "줄일 세트가 없어요.");
      // 서버가 다시 그린 오늘 운동 목록을 바로 보이게.
      window.location.reload();
    });
  }

  const advice = saved ? adviceFor(saved) : null;

  return (
    <section className="app-card space-y-2 p-3" data-testid="daily-checkin" data-advice={advice?.kind ?? ""}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <HeartPulse aria-hidden="true" size={16} className="text-brand" />
          오늘 컨디션
        </h2>
        {saved && !editing ? (
          <button type="button" onClick={() => { setPicked(saved ?? {}); setStep(0); setEditing(true); }} className="text-xs font-semibold text-brand">
            다시 고르기
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-4">
          <ol className="flex gap-2 text-xs text-zinc-500" aria-label="컨디션 체크 진행">
            {['수면', '근육통', '기운', '확인'].map((label, index) => (
              <li key={label} aria-current={step === index ? 'step' : undefined} className={`flex-1 border-t-2 pt-2 ${step >= index ? 'border-brand text-brand' : 'border-zinc-200 dark:border-zinc-700'}`}>{index + 1}. {label}</li>
            ))}
          </ol>
          <div aria-live="polite" className="sr-only">{step < 3 ? CHECKIN_QUESTIONS[step].label : '선택한 컨디션 확인'}</div>
          {step < 3 ? CHECKIN_QUESTIONS.filter((_, index) => index === step).map(q => (
            <div key={q.key} role="group" aria-label={q.label} className="space-y-3">
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{q.label}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">지금 몸 상태에 가장 가까운 답을 골라 주세요.</p>
              <div className="grid gap-2">
                {q.options.map((label, index) => {
                  const value = (index + 1) as Level;
                  const selected = picked[q.key] === value;
                  return <button key={label} type="button" aria-pressed={selected} disabled={pending} onClick={() => choose(q.key, value)} className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-semibold ${selected ? 'border-brand bg-brand/10 text-brand' : 'border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200'}`}>{label}<span aria-hidden="true" className="float-right">{selected ? '✓' : '○'}</span></button>;
                })}
              </div>
            </div>
          )) : isCheckin(picked) ? (
            <div className="space-y-3" data-testid="checkin-review">
              <h3 className="text-lg font-semibold">오늘은 이렇게 느끼고 있어요</h3>
              <dl className="space-y-2 text-sm">{CHECKIN_QUESTIONS.map(q => <div key={q.key} className="flex items-center justify-between gap-3"><dt className="text-zinc-500">{q.label}</dt><dd className="font-semibold">{q.options[picked[q.key]! - 1]}</dd></div>)}</dl>
              <p className="rounded-xl bg-brand/10 p-3 text-sm text-zinc-800 dark:text-zinc-100">{adviceFor(picked).text}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">저장만으로 운동량이 바뀌지는 않아요. 저장 후 오늘 운동만 조절할 수 있어요.</p>
            </div>
          ) : null}
          <div className="flex gap-2">
            {step > 0 ? <button type="button" disabled={pending} onClick={() => setStep(step - 1)} className="min-h-11 rounded-full border border-zinc-200 px-5 text-sm font-semibold dark:border-zinc-700">이전</button> : null}
            {step < 3 ? <button type="button" disabled={!picked[CHECKIN_QUESTIONS[step].key] || pending} onClick={() => setStep(step + 1)} className="min-h-11 flex-1 rounded-full bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40 dark:text-zinc-950">{step === 2 ? '선택 내용 확인' : '다음'}</button> : <button type="button" disabled={pending || !isCheckin(picked)} onClick={save} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40 dark:text-zinc-950">{pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}{pending ? '저장 중…' : '컨디션 저장'}</button>}
          </div>
        </div>
      ) : advice ? (
        <div className="space-y-2" role="status">
          <p className="text-xs font-semibold text-brand">오늘 컨디션을 저장했어요</p>
          <p className="text-sm text-zinc-800 dark:text-zinc-100" data-testid="daily-checkin-advice">{advice.text}</p>
        </div>
      ) : null}

      {!editing && advice?.kind === "light" && !lightened ? (
        <button
          type="button"
          data-testid="daily-checkin-lighten"
          onClick={lighten}
          disabled={pending}
          className="app-press inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-brand text-sm font-semibold text-brand disabled:opacity-50"
        >
          {pending ? <Loader2 aria-hidden="true" size={14} className="animate-spin" /> : null}
          오늘만 세트 하나씩 줄이기
        </button>
      ) : null}
      {lightened && advice?.kind === "light" ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">오늘은 세트를 줄였어요.<br />내일은 원래 루틴 그대로예요.</p>
      ) : null}

      {painConflicts.length ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-zinc-800 dark:text-zinc-100" data-testid="daily-pain">
          {painConflicts.map((c) => `${PAIN_LABEL[c.part]} 운동 ${c.count}개`).join(", ")}가 오늘 있어요. 아프다고 하셨으니
          가볍게 하거나 건너뛰세요.{" "}
          <Link href="/settings/pain" className="font-semibold text-brand">
            아픈 부위 바꾸기
          </Link>
        </p>
      ) : null}
      {painConflicts.length && painSwap ? (
        painSwap.full ? (
          painSwap.pairs.length ? (
            <div className="space-y-2 rounded-lg border border-line p-2.5" data-testid="pain-swap">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">오늘만 이렇게 바꿀 수 있어요</p>
              <ul className="space-y-1 text-sm text-zinc-800 dark:text-zinc-100">
                {painSwap.pairs.map((p) => (
                  <li key={p.fromId}>
                    <span className="text-zinc-500 line-through">{p.fromName}</span> → <b>{p.toName}</b>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await swapPainExercisesTodayAction();
                    setMsg(r.ok ? `오늘만 ${r.swapped}개 바꿨어요. 내 루틴은 그대로예요.` : r.error);
                    if (r.ok) router.refresh();
                  })
                }
                className="app-press inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-sm font-semibold text-white disabled:opacity-50 dark:text-zinc-950"
              >
                {pending ? <Loader2 aria-hidden="true" size={14} className="animate-spin" /> : null}
                오늘만 다른 운동으로 바꾸기
              </button>
            </div>
          ) : null
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400" data-testid="pain-swap-locked">
            라이트에서는 아픈 부위 운동을 오늘만 다른 운동으로 바로 바꿀 수 있어요.{" "}
            <Link href="/settings/subscription" className="font-semibold text-brand">
              라이트 알아보기
            </Link>
          </p>
        )
      ) : null}

      {msg ? <p role="status" className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{msg}</p> : null}
    </section>
  );
}
