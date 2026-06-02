import { cn } from "@/lib/utils";

/**
 * HELTCH 로고 마크 — 에메랄드 그라데이션 스퀘어클 배지 + 화이트 덤벨 글리프.
 * 광택 하이라이트와 링으로 입체감을 준다. size 로 어디서든 재사용.
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
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="relative drop-shadow-sm"
      >
        {/* 바 */}
        <rect x="7" y="10.6" width="10" height="2.8" rx="1.4" />
        {/* 바깥 플레이트 */}
        <rect x="2.3" y="6.9" width="3.3" height="10.2" rx="1.5" />
        <rect x="18.4" y="6.9" width="3.3" height="10.2" rx="1.5" />
        {/* 안쪽 플레이트 */}
        <rect x="5.7" y="8.8" width="2.5" height="6.4" rx="1.2" />
        <rect x="15.8" y="8.8" width="2.5" height="6.4" rx="1.2" />
      </svg>
    </span>
  );
}

/** 로고 마크 + HELTCH 워드마크. */
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
        HELTCH
      </span>
    </span>
  );
}
