import Link from "next/link";
import { AlertTriangle, Check, Dumbbell, Utensils } from "lucide-react";

import {
  adherencePct,
  attentionOf,
  daysSinceWorkout,
  trainerSummary,
  weightDelta,
  type TrainerMember,
} from "@/features/groups/trainer-board";

/** 이번 주 상태 한 줄 — 목표가 없으면 "목표 미설정"(0% 로 속이지 않는다). */
function AdherenceBadge({ m }: { m: TrainerMember }) {
  const pct = adherencePct(m);
  if (pct === null) {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        목표 미설정
      </span>
    );
  }
  const tone =
    pct >= 80
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : pct >= 50
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${tone}`}>
      {pct}%
    </span>
  );
}

export function TrainerBoardView({
  groupId,
  groupName,
  weekFrom,
  weekTo,
  today,
  members,
}: {
  groupId: string;
  groupName: string;
  weekFrom: string;
  weekTo: string;
  today: string;
  members: TrainerMember[];
}) {
  const summary = trainerSummary(members, today);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
          {groupName} · 회원 관리
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {weekFrom.slice(5)} ~ {weekTo.slice(5)} 이번 주
        </p>
      </header>

      {/* 요약 — 트레이너가 이 화면을 여는 이유는 "오늘 누구에게 연락할까" 다. */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "담당 회원", value: summary.total, tone: "text-zinc-900 dark:text-zinc-100" },
          {
            label: "챙길 회원",
            value: summary.needsAttention,
            tone:
              summary.needsAttention > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-zinc-900 dark:text-zinc-100",
          },
          { label: "오늘 운동", value: summary.workedToday, tone: "text-emerald-600 dark:text-emerald-400" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-zinc-200 bg-white p-3 text-center dark:border-zinc-700 dark:bg-zinc-800"
          >
            <p className={`text-xl font-bold tabular-nums ${s.tone}`}>{s.value}</p>
            <p className="mt-0.5 text-[11px] font-bold text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      {members.length === 0 ? (
        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-6 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          아직 담당 회원이 없어요. 그룹 초대 링크를 회원에게 보내면 여기에 나타나요.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="trainer-members">
          {members.map((m) => {
            const flags = attentionOf(m, today);
            const since = daysSinceWorkout(m, today);
            const delta = weightDelta(m);
            return (
              <li
                key={m.userId}
                data-testid="trainer-member"
                data-user={m.userId}
                className={`rounded-2xl border bg-white p-4 dark:bg-zinc-800 ${
                  flags.length > 0
                    ? "border-rose-200 dark:border-rose-900/50"
                    : "border-zinc-200 dark:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-950 dark:text-zinc-100">
                    {m.name}
                  </p>
                  <AdherenceBadge m={m} />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                  <span className="inline-flex items-center gap-1">
                    <Dumbbell aria-hidden="true" size={12} className="text-zinc-400" />
                    운동 {m.workoutDays}일
                    {m.targetDays > 0 ? ` / ${m.targetDays}일` : ""}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Utensils aria-hidden="true" size={12} className="text-zinc-400" />
                    식단 {m.dietDays}일
                  </span>
                  {since !== null ? (
                    <span className="tabular-nums">
                      {since === 0 ? "오늘 운동함" : `${since}일 전 운동`}
                    </span>
                  ) : null}
                  {delta !== null ? (
                    <span className="tabular-nums">
                      체중 {delta > 0 ? "+" : ""}
                      {delta}kg
                    </span>
                  ) : null}
                </div>

                {flags.length > 0 ? (
                  <ul className="mt-2.5 space-y-1">
                    {flags.map((f) => (
                      <li
                        key={f.label}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                      >
                        <AlertTriangle aria-hidden="true" size={11} />
                        {f.label}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Check aria-hidden="true" size={12} />잘 하고 있어요
                  </p>
                )}

                {/* 그룹원 상세(그날 운동·식단)는 이미 있는 화면을 그대로 쓴다. */}
                <Link
                  href={`/groups/${groupId}?member=${m.userId}`}
                  className="mt-3 inline-flex h-8 items-center rounded-lg border border-zinc-300 px-3 text-[11px] font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  기록 자세히 보기
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
