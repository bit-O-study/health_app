import type { ReactNode } from "react";
import Link from "next/link";
import { Info, Lock } from "lucide-react";

import { PageHeader } from "@/components/page-header";

/**
 * 맞춤 운동 공통 틀(2026-10-06 UI 개편) — 머리글 · 결론 한 줄 · 잠금 카드.
 *
 * 하단 탭 4개(오늘 추천 · 내 몸 균형 · 성장 · 리포트)는 런처 하단바가 그린다(`apps.ts`).
 * 화면마다 맨 위에 **한 문장 결론**을 둔다 — 숫자는 그 근거로 아래에.
 */
export function FitHeader({
  title,
  full,
  styleText,
  experienceLabel,
  cold,
}: {
  title: string;
  full: boolean;
  styleText: string;
  experienceLabel: string;
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
      <div className="app-container flex items-center justify-between gap-2 pb-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {styleText} · {experienceLabel}{" "}
          <Link href="/settings/fit" className="font-semibold text-brand" data-testid="fit-style-change">
            목표 바꾸기
          </Link>
        </span>
        <details className="group relative" data-testid="fit-how">
          <summary className="flex cursor-pointer list-none items-center gap-1 font-semibold text-zinc-500 dark:text-zinc-400">
            <Info aria-hidden="true" size={13} /> 계산 방법
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-[var(--line)] bg-white p-3 text-xs leading-5 text-zinc-600 shadow-lg dark:bg-zinc-900 dark:text-zinc-300">
            지난 7일 운동 기록으로 세부 근육 25개가 받은 자극(세트)을 셉니다. 가입 때 고른 몸 목표·경력에 맞춘 주간
            목표와 비교해, 모자란 곳을 가장 많이 채우는 운동을 고릅니다. 아픈 부위와 내 헬스장에 없는 기구는 뺍니다.
          </div>
        </details>
      </div>
      {cold ? (
        <p className="app-container pb-2 text-xs text-zinc-500 dark:text-zinc-400" data-testid="fit-cold">
          이번 주 기록이 아직 없어 가입 때 고른 목표 비율로 추천해요. 운동할수록 내 기록에 맞춰져요.
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
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{what} · 라이트에서 볼 수 있어요</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">월 990원</p>
      <Link href="/settings/subscription" className="inline-block text-sm font-semibold text-brand">
        라이트 알아보기 →
      </Link>
    </section>
  );
}

/** 몸 목표 스타일 → 짧은 말. */
export function styleTextOf(style: string): string {
  return style === "female" ? "하체 위주" : style === "male" ? "상체 위주 · V자" : "고르게";
}
