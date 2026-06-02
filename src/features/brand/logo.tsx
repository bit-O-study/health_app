import { cn } from "@/lib/utils";

/** 서비스명. 한 곳에서 관리. */
export const BRAND_NAME = "헬포유";

/**
 * 헬포유 로고 마크 — 에메랄드 그라데이션 스퀘어클 배지 + 활동 심박 마크.
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
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-pink-400 via-pink-500 to-fuchsia-600 text-white shadow-lg shadow-pink-500/30 ring-1 ring-inset ring-white/25",
        className,
      )}
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
    >
      {/* 상단 광택 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
      />
      {/* 활동 심박 — 정교한 ECG 곡선 + 펄스 포인트 */}
      <svg
        width={size * 0.7}
        height={size * 0.7}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="relative drop-shadow-sm"
      >
        <path
          d="M2.6 13h3.3l1.5-4.2c.3-.85 1.45-.72 1.62.12l2.18 7.3 1.8-5.2c.27-.78 1.34-.74 1.55.06L17.1 13h1.7"
          stroke="white"
          strokeWidth="2.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20.9" cy="13" r="1.5" fill="white" />
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
