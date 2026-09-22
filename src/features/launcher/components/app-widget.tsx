import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { LAUNCHER_APPS } from "@/features/launcher/apps";

/**
 * 홈 위젯 — 앱 하나의 요약 한 줄 (2026-09-20).
 *
 * 홈이 모든 카드를 세로로 쌓던 걸 대신한다. 자세한 건 앱 안에 있고, 여기엔
 * **오늘 당장 알아야 할 한 줄**만 둔다. 위젯을 누르면 그 앱으로 바로 가므로
 * 매일 쓰는 운동·식단은 홈에서 **1탭**을 유지한다.
 */
export function AppWidget({
  appId,
  headline,
  detail,
  meta,
  progressPct,
  href,
}: {
  /** 어느 앱의 위젯인지 — 아이콘·색·이름·이동 경로를 레지스트리에서 가져온다. */
  appId: string;
  /** 큰 글씨 한 줄. */
  headline: string;
  /** 작은 설명 한 줄. */
  detail?: string;
  /** 오른쪽 위 숫자/상태. */
  meta?: string;
  /** 0~100. 주면 막대를 그린다. */
  progressPct?: number;
  /** 기본은 그 앱의 홈. */
  href?: string;
}) {
  const app = LAUNCHER_APPS.find((a) => a.id === appId);
  if (!app) return null;
  const Icon = app.icon;
  const pct = progressPct == null ? null : Math.max(0, Math.min(100, Math.round(progressPct)));

  return (
    <Link
      href={href ?? app.home}
      prefetch={false}
      aria-label={`${app.label} — ${headline}`}
      className="app-card block p-3.5 transition-transform active:scale-[0.98]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          <span
            aria-hidden="true"
            className={`flex h-5 w-5 items-center justify-center rounded-md text-white ${app.tone}`}
          >
            <Icon size={12} strokeWidth={2.2} />
          </span>
          {app.label}
        </span>
        <span className="flex items-center gap-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {meta}
          <ChevronRight aria-hidden="true" size={14} />
        </span>
      </div>

      <p className="mt-1.5 text-base font-bold leading-snug tracking-tight text-zinc-900 dark:text-zinc-100">
        {headline}
      </p>

      {pct != null ? (
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
          <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </span>
      ) : null}

      {detail ? (
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>
      ) : null}
    </Link>
  );
}
