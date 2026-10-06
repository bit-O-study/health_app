import { cn } from "@/lib/utils";
import { BRAND_ICON_BG, HelssuMark } from "@/features/brand/mark";

export const BRAND_NAME = "헬쑤";
/** 이름 옆에 붙는 한 줄 소개. */
export const BRAND_TAGLINE = "내가 쓰려고 만든 헬스앱";

/** 바벨로 만든 "ㅈ" — 앱 아이콘과 같은 헬쑤 마크(`mark.tsx`). */
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
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden shadow-sm ring-1 ring-inset ring-white/15",
        className,
      )}
      style={{ width: size, height: size, borderRadius: size * 0.28, background: BRAND_ICON_BG }}
    >
      <HelssuMark size={size} />
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
