"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Target, Trophy } from "lucide-react";

import {
  clearGroupChallengeAction,
  setGroupChallengeAction,
} from "@/features/groups/group-actions";
import {
  CHALLENGE_METRICS,
  metricLabel,
  metricUnit,
  type ChallengeMetric,
  type ChallengeProgress,
} from "@/features/groups/challenge";

/** 이번 주 그룹 챌린지 — 진행률 카드 + (그룹장) 목표 설정/수정/삭제. */
export function GroupChallenge({
  groupId,
  isOwner,
  challenge,
}: {
  groupId: string;
  isOwner: boolean;
  challenge: ChallengeProgress | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<ChallengeMetric>(
    challenge?.metric ?? "kcal",
  );
  const [target, setTarget] = useState<string>(
    challenge ? String(challenge.target) : "",
  );

  function save() {
    setError(null);
    start(async () => {
      const res = await setGroupChallengeAction(groupId, metric, Number(target));
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function clear() {
    setError(null);
    start(async () => {
      const res = await clearGroupChallengeAction(groupId);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  // 챌린지도 없고 그룹장도 아니면 아무것도 안 보여준다.
  if (!challenge && !isOwner) return null;

  return (
    <section className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          <Target aria-hidden="true" size={16} className="text-emerald-600" />
          이번 주 그룹 목표
        </span>
        {isOwner ? (
          <button
            type="button"
            onClick={() => {
              setEditing((v) => !v);
              setError(null);
            }}
            className="text-xs font-semibold text-emerald-600 hover:underline"
          >
            {editing ? "닫기" : challenge ? "수정" : "목표 설정"}
          </button>
        ) : null}
      </div>

      {challenge ? (
        <div className="mt-3">
          <div className="mb-1 flex items-end justify-between">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {metricLabel(challenge.metric)}
              {challenge.done ? (
                <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                  <Trophy aria-hidden="true" size={12} /> 달성!
                </span>
              ) : null}
            </span>
            <span className="text-xs font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
              {challenge.current.toLocaleString()} /{" "}
              {challenge.target.toLocaleString()} {metricUnit(challenge.metric)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all ${
                challenge.done ? "bg-emerald-500" : "bg-emerald-400"
              }`}
              style={{ width: `${challenge.pct}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-zinc-500">
          아직 이번 주 목표가 없습니다.
          {isOwner ? " '목표 설정'으로 정해보세요." : ""}
        </p>
      )}

      {editing ? (
        <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div className="flex gap-2">
            <select
              aria-label="목표 종류"
              value={metric}
              onChange={(e) => setMetric(e.target.value as ChallengeMetric)}
              disabled={pending}
              className="h-9 flex-1 rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            >
              {CHALLENGE_METRICS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <input
              aria-label="목표 값"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="목표"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={pending}
              className="h-9 w-24 rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
          {error ? (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || target.trim() === ""}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 aria-hidden="true" size={15} className="animate-spin" />
              ) : null}
              저장
            </button>
            {challenge ? (
              <button
                type="button"
                onClick={clear}
                disabled={pending}
                className="h-9 rounded-md border border-zinc-300 px-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                삭제
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
