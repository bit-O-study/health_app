import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { BackLink } from "@/components/back-link";

/**
 * 탭 화면 공통 머리글 — 아이폰 **큰 제목** 구조(2026-09-15 구조 재설계).
 * (선택) 뒤로 줄 / 큰 제목 + (선택) 오른쪽 버튼 한 줄. 홈·운동탭과 같은 모양이다.
 * 뒤로가 없으면 위 줄을 그리지 않는다 — 빈 40px 줄이 제목을 밀어 내리던 자리(2026-09-16 촘촘하게).
 *
 * 하위 화면(설정 안쪽 등)도 모두 이 머리글 하나를 쓴다(2026-09-16 8단계) — 아이폰처럼
 * `‹ 설정` 식으로 돌아갈 화면 이름을 보여 줄 수 있다(`back="설정"`).
 *
 * 폭은 `.app-container` 와 같은 48rem(max-w-3xl) 하나로 맞춘다 — 탭을 넘겨도 제목 위치가
 * 흔들리지 않게(2026-09-14 검수보고서 L-틀).
 */
export function PageHeader({
  title,
  back = false,
  backHref,
  children,
}: {
  title: string;
  /**
   * 들어온 화면으로 되돌아가는 '뒤로' 버튼(router.back).
   * 문자열이면 그 글자를 화살표 옆에 보여 준다(버튼 이름도 그 글자).
   */
  back?: boolean | string;
  /** 들어온 곳과 상관없이 항상 이 경로로 돌아가야 할 때(초대 링크로 바로 들어온 화면 등). */
  backHref?: string;
  /** 제목 줄 오른쪽 끝 버튼들. */
  children?: ReactNode;
}) {
  const label = typeof back === "string" ? back : null;
  const backCls =
    "-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-full pr-2 text-sm font-medium text-brand transition active:opacity-60";
  const backInner = (
    <>
      <ChevronLeft aria-hidden="true" size={22} />
      {label ? <span className="truncate">{label}</span> : <span className="sr-only">뒤로</span>}
    </>
  );
  return (
    <header data-testid="page-header">
      <div className="mx-auto w-full max-w-3xl px-4 pb-1 pt-5 sm:px-6">
        {back || backHref ? (
          <div className="mb-2 flex min-h-11 items-center">
            {backHref ? (
              <Link href={backHref} className={backCls}>
                {backInner}
              </Link>
            ) : (
              <BackLink className={backCls}>{backInner}</BackLink>
            )}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="app-title min-w-0 flex-1 basis-auto break-words">
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
