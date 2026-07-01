import { Loader2 } from "lucide-react";

/**
 * 라우트 전환(탭 이동) 중 콘텐츠 영역에 즉시 뜨는 로딩 표시.
 * loading.tsx 에서 재사용 — 서버 렌더가 끝나기 전에도 '멈춘 화면'이 아니라
 * 로딩 중임을 바로 보여줘서 답답함을 줄인다. (하단 탭·헤더 등 셸은 유지된다.)
 */
export function RouteLoading({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-3 text-zinc-400 dark:text-zinc-500">
      <Loader2 aria-hidden="true" size={30} className="animate-spin text-emerald-500" />
      <span className="text-sm font-semibold">{label ?? "불러오는 중…"}</span>
    </div>
  );
}
