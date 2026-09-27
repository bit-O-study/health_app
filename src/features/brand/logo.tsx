import { cn } from "@/lib/utils";
export const BRAND_NAME = "헬쑤";

/** 둥근 배지 안 바벨과 H를 결합한 헬쑤 마크. */
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
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-brand via-brand to-teal-800 text-white shadow-sm ring-1 ring-inset ring-white/20",
        className,
      )}
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
    >
      {/* 상단 광택 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
      />
      <svg width={size * 0.64} height={size * 0.64} viewBox="0 0 32 32" aria-hidden="true" className="relative">
        <path d="M9 9v14M23 9v14M9 16h14" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M4 13v6M28 13v6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="24" cy="5" r="2" fill="currentColor" opacity="0.7" />
      </svg>
    </span>
  );
}

/** 로고 마크 + 워드마크(헬쑤). */
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
          "text-base font-bold tracking-tight text-zinc-950 dark:text-zinc-100",
          wordClassName,
        )}
      >
        {BRAND_NAME}
      </span>
    </span>
  );
}
