import type { ReactNode } from "react";
import Link from "next/link";
import { Info, Lock } from "lucide-react";

import { PageHeader } from "@/components/page-header";

/**
 * 맞춤 운동 공통 틀(2026-10-06 UI 개편) — 머리글 · 결론 한 줄 · 잠금 카드.
 *
 * 하단 탭(한눈에 · 기록, 2026-10-07)은 런처 하단바가 그린다(`apps.ts`).
 * 화면마다 맨 위에 **한 문장 결론**을 둔다 — 숫자는 그 근거로 아래에.
 */
export function FitHeader({
  title,
  full,
  styleText,
  experienceLabel,
  daysThisWeek,
  cold,
}: {
  title: string;
  full: boolean;
  styleText: string;
  experienceLabel: string;
  /** 지난 7일 운동한 날(한눈에 화면 — 머리글 한 줄에). */
  daysThisWeek?: number;
  /** 이번 주 기록이 없어 가입 설문 목표로만 추천 중. */
  cold?: boolean;
}) {
  return (
    <>
      <PageHeader title={title}>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            full ? "bg-brand-soft text-brand" : "bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"
          }`}
          data-testid="fit-plan-badge"
        >
          {full ? "라이트" : "무료"}
        </span>
      </PageHeader>
      {/* 본문과 같은 좌우 여백, 위아래 여백은 없이 — 머리글과 본문 사이가 벌어지지 않게. */}
      <div className="app-container flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <span>
          {styleText} · {experienceLabel}
          {daysThisWeek ? ` · 이번 주 ${daysThisWeek}일` : ""}{" "}
          <Link href="/settings/fit" className="font-semibold text-brand" data-testid="fit-style-change">
            변경
          </Link>
        </span>
        <details className="group relative" data-testid="fit-how">
          <summary
            aria-label="계산 방법"
            className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.08]"
          >
            <Info aria-hidden="true" size={15} />
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-[var(--line)] bg-white p-3 text-xs leading-5 text-zinc-600 shadow-lg dark:bg-zinc-900 dark:text-zinc-300">
            지난 7일 기록 → 세부 근육 25개 세트 → 내 목표와 비교. 아픈 부위·없는 기구는 빼고 추천해요.
          </div>
        </details>
      </div>
      {cold ? (
        <p className="app-container text-xs text-zinc-500 dark:text-zinc-400" style={{ paddingTop: 4, paddingBottom: 0 }} data-testid="fit-cold">
          기록이 없어 가입 목표로 추천해요
        </p>
      ) : null}
    </>
  );
}

/** 화면 맨 위 결론 한 줄. */
export function FitHeadline({ children, sub, testId }: { children: ReactNode; sub?: ReactNode; testId?: string }) {
  return (
    <section className="app-card p-4" data-testid={testId}>
      <p className="text-lg font-bold leading-6 text-zinc-900 dark:text-zinc-100">{children}</p>
      {sub ? <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{sub}</p> : null}
    </section>
  );
}

/** 라이트 잠금 — 결론은 무료로 보여 주고, 자세한 것만 잠근다. */
export function FitLocked({ what }: { what: string }) {
  return (
    <section className="app-card space-y-2 p-4 text-center" data-testid="fit-locked">
      <Lock aria-hidden="true" size={18} className="mx-auto text-zinc-400" />
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{what}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">라이트에서 볼 수 있어요 · 월 990원</p>
      <Link href="/settings/subscription" className="inline-block text-sm font-semibold text-brand">
        라이트 보기 →
      </Link>
    </section>
  );
}

/** 몸 목표 스타일 → 짧은 말. */
export function styleTextOf(style: string): string {
  return style === "female" ? "하체 위주" : style === "male" ? "상체 위주 · V자" : "고르게";
}
