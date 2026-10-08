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
}: {
  today: string;
  initial: Checkin | null;
  painConflicts: { part: BodyPart; count: number }[];
  /** 아픈 부위 대체(라이트 2단계, 2026-10-02) — 라이트면 짝 미리보기 + 바꾸기, 무료면 안내 한 줄. */
  painSwap?: PainSwapPreview | null;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Partial<Checkin>>(initial ?? {});
  const [saved, setSaved] = useState<Checkin | null>(initial);
  const [editing, setEditing] = useState(initial === null);
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

  function choose(key: keyof Checkin, v: Level) {
    const next = { ...picked, [key]: v };
    setPicked(next);
    if (next.sleep && next.soreness && next.energy) {
      const c = next as Checkin;
      setMsg(null);
      start(async () => {
        const r = await saveCheckinAction(c);
        if (!r.ok) return setMsg(r.error);
        setSaved(c);
        setEditing(false);
      });
    }
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
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-brand">
            다시 고르기
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-2">
          {CHECKIN_QUESTIONS.map((q) => (
            <div key={q.key} role="group" aria-label={q.label} className="space-y-1">
              <p className="text-xs text-zinc-600 dark:text-zinc-300">{q.label}</p>
              <div className="flex gap-1.5">
                {q.options.map((label, i) => {
                  const v = (i + 1) as Level;
                  const on = picked[q.key] === v;
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={on}
                      disabled={pending}
                      onClick={() => choose(q.key, v)}
                      className={`h-9 flex-1 rounded-full text-sm font-semibold ${
                        on
                          ? "bg-brand text-white dark:text-zinc-950"
                          : "bg-zinc-100 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : advice ? (
        <p className="text-sm text-zinc-800 dark:text-zinc-100" data-testid="daily-checkin-advice">
          {advice.text}
        </p>
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

      {msg ? <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{msg}</p> : null}
    </section>
  );
}
