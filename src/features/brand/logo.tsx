import { cn } from "@/lib/utils";

/** 서비스명. 한 곳에서 관리. */
export const BRAND_NAME = "헬포유";

/**
 * 헬포유 로고 마크 — 에메랄드 그라데이션 스퀘어클 배지 + 스마일 마크.
 * (친근한 for you) 광택 하이라이트와 인셋 링으로 입체감. size 로 어디서든 재사용.
 */
export function LogoMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-orange-400 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 ring-1 ring-inset ring-white/25",
        className,
      )}
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
    >
      {/* 상단 광택 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
      />
      {/* 스마일 — 친근한 "for you" */}
      <svg
        width={size * 0.66}
        height={size * 0.66}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        aria-hidden="true"
        className="relative drop-shadow-sm"
      >
        <circle cx="8.5" cy="9.5" r="1.15" fill="white" stroke="none" />
        <circle cx="15.5" cy="9.5" r="1.15" fill="white" stroke="none" />
        <path d="M6.5 14.3c1.4 2 3.3 3 5.5 3s4.1-1 5.5-3" />
      </svg>
    </span>
  );
}

/** 로고 마크 + 워드마크(헬포유). */
export function Logo({
  size = 36,
  className,
  wordClassName,
}: {
  size?: number;
  className?: string;
  wordClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      <span
        className={cn(
          "text-base font-extrabold tracking-tight text-zinc-950 dark:text-zinc-100",
          wordClassName,
        )}
      >
        {BRAND_NAME}
      </span>
    </span>
  );
}
