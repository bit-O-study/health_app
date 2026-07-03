"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";

import type { GroupSummary } from "@/features/groups/data-access";

/**
 * 상단 그룹 전환 — 화면 폭에 맞게 줄바꿈되는 작은 칩. (가로 스크롤 없음)
 * 탭하면 즉시 스피너(전환이 느려도 '먹통'처럼 안 보이게) 후 그 그룹으로 이동.
 */
export function GroupSwitcher({
  groups,
  currentId,
}: {
  groups: GroupSummary[];
  currentId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<string | null>(null);

  function go(id: string) {
    if (id === currentId || pending) return;
    setTarget(id);
    start(() => router.push(`/groups?g=${id}`));
  }

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      {groups.map((g) => {
        const active = g.id === currentId;
        const loading = pending && target === g.id;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => go(g.id)}
            aria-current={active ? "true" : undefined}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-medium transition-colors ${
              active
                ? "bg-white/70 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
                : "text-amber-950/55 hover:bg-black/5 hover:text-amber-950/80 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-200"
            }`}
          >
            {loading ? (
              <Loader2 aria-hidden="true" size={13} className="animate-spin" />
            ) : null}
            {g.name}
            <span className="text-[10px] font-semibold text-amber-950/40 dark:text-zinc-500">
              {g.memberCount}
            </span>
          </button>
        );
      })}
      <Link
        href="/groups/manage"
        aria-label="그룹 만들기/참여"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-amber-950/25 text-amber-950/45 transition hover:border-emerald-500 hover:text-emerald-600 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-emerald-400 dark:hover:text-emerald-400"
      >
        <Plus aria-hidden="true" size={14} />
      </Link>
    </div>
  );
}
