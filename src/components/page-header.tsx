import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

import { BackLink } from "@/components/back-link";

/**
 * 탭 화면 공통 머리글 — 아이폰 **큰 제목** 구조(2026-09-15 구조 재설계).
 * (선택) 뒤로 줄 / 큰 제목 + (선택) 오른쪽 버튼 한 줄. 홈·운동탭과 같은 모양이다.
 * 뒤로가 없으면 위 줄을 그리지 않는다 — 빈 40px 줄이 제목을 밀어 내리던 자리(2026-09-16 촘촘하게).
 *
 * 폭은 `.app-container` 와 같은 48rem(max-w-3xl) 하나로 맞춘다 — 탭을 넘겨도 제목 위치가
 * 흔들리지 않게(2026-09-14 검수보고서 L-틀).
 */
export function PageHeader({
  title,
  back = false,
  children,
}: {
  title: string;
  /** 들어온 화면으로 되돌아가는 '뒤로' 버튼(router.back). */
  back?: boolean;
  /** 제목 줄 오른쪽 끝 버튼들. */
  children?: ReactNode;
}) {
  return (
    <header data-testid="page-header">
      <div className="mx-auto w-full max-w-3xl px-4 pt-2 sm:px-6">
        {back ? (
          <div className="flex h-9 items-center">
            <BackLink className="-ml-2 inline-flex h-9 items-center gap-0.5 rounded-full pr-2 text-base text-brand transition active:opacity-60">
              <ChevronLeft aria-hidden="true" size={22} />
              <span className="sr-only">뒤로</span>
            </BackLink>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <h1 className="app-title min-w-0 flex-1 truncate px-1">
            {title}
          </h1>
          {children ? (
            <div className="flex shrink-0 items-center gap-1">{children}</div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
