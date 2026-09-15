import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

import { BackLink } from "@/components/back-link";

/**
 * 탭 화면 공통 머리글 — 제목 + (선택) 뒤로 + (선택) 오른쪽 버튼.
 *
 * 예전엔 공통 헤더(`.app-header`)를 3개 화면만 쓰고, 나머지는 화면마다 제목 크기·여백·폭이
 * 달라 탭을 넘길 때마다 내용 위치가 흔들렸다(2026-09-14 검수보고서 L-틀).
 * 폭은 `.app-container` 와 같은 48rem(max-w-3xl) 하나로 맞춘다.
 */
export function PageHeader({
  title,
  back = false,
  children,
}: {
  title: string;
  /** 들어온 화면으로 되돌아가는 '뒤로' 버튼(router.back). */
  back?: boolean;
  /** 오른쪽 끝 버튼들. */
  children?: ReactNode;
}) {
  return (
    <header className="app-header" data-testid="page-header">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-1 px-4 sm:px-6">
        {back ? (
          <BackLink className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100">
            <ChevronLeft aria-hidden="true" size={20} />
            <span className="sr-only">뒤로</span>
          </BackLink>
        ) : null}
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold text-zinc-950 dark:text-zinc-50">
          {title}
        </h1>
        {children ? (
          <div className="flex shrink-0 items-center gap-1">{children}</div>
        ) : null}
      </div>
    </header>
  );
}
