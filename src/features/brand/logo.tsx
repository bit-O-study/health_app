import { cn } from "@/lib/utils";

/** 서비스명. 한 곳에서 관리. */
export const BRAND_NAME = "헬포유";

/**
 * 헬포유 로고 마크 — 에메랄드 그라데이션 스퀘어클 배지 + 화이트 'H' 글자 마크.
 * (Help for you / Health) 광택 하이라이트와 인셋 링으로 입체감. size 로 어디서든 재사용.
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
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 ring-1 ring-inset ring-white/25",
        className,
      )}
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
    >
      {/* 상단 광택 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
      />
      {/* 'H' 글자 마크 (기하학적, 라운드 터미널) */}
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="relative drop-shadow-sm"
      >
        <rect x="5.2" y="4.6" width="3.2" height="14.8" rx="1.6" />
        <rect x="15.6" y="4.6" width="3.2" height="14.8" rx="1.6" />
        <rect x="7" y="10.4" width="10" height="3.2" rx="1.6" />
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
