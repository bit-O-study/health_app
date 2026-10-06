"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Pencil, Trash2, UsersRound } from "lucide-react";

import { deletePledgeAction } from "@/features/commitments/pledge-actions";
import { FAIL_REASON_LABEL, failReasons } from "@/features/commitments/evaluation";
import { STATUS_LABEL, STATUS_TONE } from "@/features/commitments/components/pledge-labels";
import type { PledgeView } from "@/features/commitments/pledge-data";

const sign = (v: number) => (v > 0 ? `+${v}` : `${v}`);

/** 다짐 리스트 — 진행 중·시작 전 / 성공 / 실패로 묶어 보여 준다. */
export function PledgeList({ pledges, groupNames }: { pledges: PledgeView[]; groupNames: Record<string, string> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (pledges.length === 0) {
    return (
      <div className="app-card space-y-2 p-4 text-center" data-testid="pledge-empty">
        <p className="text-sm text-zinc-500">아직 다짐이 없어요</p>
        <Link href="/commitments/new" className="inline-flex h-10 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white dark:text-zinc-950">
          다짐 만들기
        </Link>
      </div>
    );
  }

  function remove(id: string) {
    if (!window.confirm("이 다짐을 지울까요? 기록은 지워지지 않아요.")) return;
    start(async () => {
      const res = await deletePledgeAction(id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  const groups: { title: string; items: PledgeView[] }[] = [
    { title: "진행 중", items: pledges.filter((p) => p.eval.status === "active" || p.eval.status === "upcoming") },
    { title: "성공", items: pledges.filter((p) => p.eval.status === "success") },
    { title: "실패", items: pledges.filter((p) => p.eval.status === "failed") },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5" data-testid="pledge-list">
      {groups.map((g) => (
        <section key={g.title} className="space-y-2">
          <h2 className="text-xs font-semibold text-zinc-500">{g.title}</h2>
          <ul className="space-y-2">
            {g.items.map((p) => {
              const st = p.eval.status;
              const reasons = p.eval.failedBlock ? failReasons(p.eval.failedBlock) : [];
              return (
                <li key={p.id} className="app-card p-4" data-testid="pledge-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_TONE[st]}`} data-testid="pledge-status">
                          {STATUS_LABEL[st]}
                        </span>
                        {p.direction === "reverse" ? <span className="text-xs text-zinc-400">목표로 만든 다짐</span> : null}
                      </p>
                      <p className="mt-1 text-base font-semibold leading-5">{p.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                        <CalendarClock aria-hidden="true" size={11} />
                        {p.startDate} ~ {p.endDate}
                        {st === "active" ? ` · ${p.week}/${p.totalWeeks}주차` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Link
                        href={`/commitments/${p.id}/edit`}
                        aria-label="다짐 편집"
                        className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/[0.08]"
                      >
                        <Pencil aria-hidden="true" size={14} />
                      </Link>
                      <button
                        type="button"
                        aria-label="다짐 삭제"
                        onClick={() => remove(p.id)}
                        disabled={pending}
                        className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                      >
                        <Trash2 aria-hidden="true" size={14} />
                      </button>
                    </div>
                  </div>

                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {p.lines.map((l) => (
                      <li key={l} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-200">
                        {l}
                      </li>
                    ))}
                  </ul>

                  {st === "failed" && p.eval.failedBlock ? (
                    <p className="mt-2 text-xs font-semibold text-danger" data-testid="fail-reason">
                      {p.eval.failedBlock.index + 1}주차에 실패 — {reasons.map((r) => FAIL_REASON_LABEL[r]).join(", ")}
                    </p>
                  ) : null}

                  {p.predicted && (p.predicted.weightKg !== null || p.predicted.muscleKg !== null) ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      예상:{" "}
                      {[
                        p.predicted.weightKg !== null ? `체중 ${sign(p.predicted.weightKg)}kg` : null,
                        p.predicted.fatKg !== null ? `체지방 ${sign(p.predicted.fatKg)}kg` : null,
                        p.predicted.muscleKg !== null ? `골격근 ${sign(p.predicted.muscleKg)}kg` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}

                  {p.sharedGroupIds.length > 0 ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                      <UsersRound aria-hidden="true" size={11} />
                      {p.sharedGroupIds.map((g) => groupNames[g] ?? "그룹").join(", ")}에 공유 중
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
