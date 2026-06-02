import { cn } from "@/lib/utils";

/** 서비스명. 한 곳에서 관리. */
export const BRAND_NAME = "데일리핏";

/**
 * 데일리핏 로고 마크 — 에메랄드 그라데이션 스퀘어클 배지 + D 모노그램 마크.
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
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-400 via-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-500/40 ring-1 ring-inset ring-white/25",
        className,
      )}
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
    >
      {/* 상단 광택 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
      />
      {/* D 모노그램(네거티브 스페이스) + 상승 화살표 — Daily */}
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="relative drop-shadow-sm"
      >
        <path
          fill="white"
          fillRule="evenodd"
          d="M5.8 3.8h5.4a8.2 8.2 0 0 1 0 16.4H5.8Zm3.1 3v10.4h2.3a5.2 5.2 0 0 0 0-10.4Z"
        />
        <path
          d="M9.7 14.2l2-2.6 2 2.6"
          fill="none"
          stroke="white"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** 로고 마크 + 워드마크(데일리핏). */
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
