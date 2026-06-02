import { cn } from "@/lib/utils";

/** 서비스명. 한 곳에서 관리. */
export const BRAND_NAME = "헬포유";

/**
 * 헬포유 로고 마크 — 에메랄드 그라데이션 스퀘어클 배지 + 하트+심박 펄스 마크.
 * (Health for you) 광택 하이라이트와 인셋 링으로 입체감. size 로 어디서든 재사용.
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
      {/* 하트 + 심박 펄스 — 건강·케어(Health for you) */}
      <svg
        width={size * 0.64}
        height={size * 0.64}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="relative drop-shadow-sm"
      >
        <path
          d="M12 20.7c-.36 0-.72-.13-1-.4C5.7 15.5 2.5 12.5 2.5 8.9 2.5 6.3 4.5 4.3 7 4.3c1.6 0 3.05.8 3.95 2.05.13.18.4.18.53 0C12.95 5.1 14.4 4.3 16 4.3c2.5 0 4.5 2 4.5 4.6 0 3.6-3.2 6.6-8.5 11.4-.28.27-.64.4-1 .4Z"
          fill="white"
        />
        <path
          d="M6.6 11.7h2.2l1-2 2 4 1-2h2.6"
          fill="none"
          stroke="#0f766e"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
