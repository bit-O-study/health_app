import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

/**
 * 촘촘한 공통 UI 조각 — 2026-09-15 "전체적으로 컴팩트하게 완전히 바꿔 달라".
 * 모든 탭이 같은 조각으로 그려져야 한 앱처럼 보인다(화면마다 카드를 새로 만들지 않는다).
 *
 * - Section: 작은 회색 라벨(+오른쪽 링크) 아래에 내용
 * - List: 한 장짜리 그룹 목록(줄 구분선)
 * - Row: 목록 한 줄(아이콘 · 제목/보조 · 오른쪽 값 · ›)
 * - Tile: 숫자 하나가 주인공인 작은 칸(2칸·3칸 격자에 쓴다)
 *
 * 서버 컴포넌트 — 상태 없음.
 */

export function Section({
  label,
  action,
  children,
  className = "",
  testId,
}: {
  label?: string;
  /** 라벨 오른쪽 작은 링크 */
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section className={className} data-testid={testId}>
      {label || action ? (
        <div className="flex items-baseline justify-between">
          {label ? <h2 className="app-section-label">{label}</h2> : <span />}
          {action ? (
            <Link href={action.href} className="mb-1.5 px-1 text-sm font-medium text-brand">
              {action.label}
            </Link>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function List({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`app-list ${className}`}>{children}</div>;
}

export function Row({
  href,
  icon: Icon,
  iconTone = "text-zinc-600 dark:text-zinc-300",
  title,
  detail,
  value,
  chevron = true,
  ariaLabel,
}: {
  href?: string;
  icon?: LucideIcon;
  iconTone?: string;
  title: ReactNode;
  detail?: ReactNode;
  value?: ReactNode;
  chevron?: boolean;
  ariaLabel?: string;
}) {
  const inner = (
    <>
      {Icon ? (
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-white/[0.08] ${iconTone}`}>
          <Icon aria-hidden="true" size={16} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base leading-5 text-zinc-900 dark:text-zinc-100">{title}</span>
        {detail ? (
          <span className="block truncate text-xs leading-4 text-zinc-500 dark:text-zinc-400">{detail}</span>
        ) : null}
      </span>
      {value ? (
        <span className="shrink-0 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">{value}</span>
      ) : null}
      {href && chevron ? <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-zinc-400" /> : null}
    </>
  );
  return href ? (
    <Link href={href} aria-label={ariaLabel} className="app-row transition active:bg-zinc-100 dark:active:bg-white/[0.06]">
      {inner}
    </Link>
  ) : (
    <div className="app-row">{inner}</div>
  );
}

export function Tile({
  href,
  label,
  labelTone = "text-zinc-500 dark:text-zinc-400",
  value,
  unit,
  sub,
  ariaLabel,
  children,
}: {
  href?: string;
  label: ReactNode;
  labelTone?: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  ariaLabel?: string;
  children?: ReactNode;
}) {
  const inner = (
    <>
      <span className={`block truncate text-xs font-semibold ${labelTone}`}>{label}</span>
      <span className="mt-0.5 block truncate text-xl font-bold tabular-nums leading-7 text-zinc-950 dark:text-zinc-50">
        {value}
        {unit ? <span className="ml-0.5 text-xs font-medium text-zinc-400">{unit}</span> : null}
      </span>
      {sub ? <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{sub}</span> : null}
      {children}
    </>
  );
  const cls = "app-card block min-w-0 px-3 py-2.5";
  return href ? (
    <Link href={href} aria-label={ariaLabel} className={`${cls} app-press`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
