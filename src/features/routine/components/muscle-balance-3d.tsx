"use client";

/**
 * 부위별 밸런스 3D 마네킹 (클라이언트 래퍼).
 * - WebGL 캔버스를 next/dynamic(ssr:false) 로 로드.
 * - 부위 단위 ↔ 세부근육 단위 색칠 토글. (세부근육 색이 주어졌을 때만 토글 노출)
 * - 렌더 실패(WebGL 미지원 등) 시 기존 2D SVG 마네킹으로 자연스럽게 폴백.
 */

import { Component, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";
import {
  Mannequin,
  type BodyRegion,
} from "@/features/routine/components/mannequin";
import { balanceColorsByMuscle } from "@/features/routine/muscle-balance";
import { useLightMode } from "@/features/performance/use-light-mode";

const BalanceCanvas = dynamic(
  () =>
    import("@/features/routine/components/muscle-mannequin-3d").then(
      (m) => m.MuscleBalanceMannequin3D,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 sm:h-[400px]">
        3D 마네킹 불러오는 중…
      </div>
    ),
  },
);

class Balance3DBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function MuscleBalance3D({
  gender,
  colors,
  subColors,
}: {
  gender?: "male" | "female";
  /** 부위(BodyRegion) 밸런스 색 */
  colors: Record<BodyRegion, string>;
  /** 세부근육(id) 밸런스 색 — 주어지면 세부근육 토글 노출 */
  subColors?: Partial<Record<string, string>>;
}) {
  const lightMode = useLightMode();
  const hasDetail = !!subColors && Object.keys(subColors).length > 0;
  const [detail, setDetail] = useState(false);
  const showDetail = hasDetail && detail;

  return (
    <div className="flex w-full flex-col gap-2">
      {hasDetail ? (
        <div className="flex items-center justify-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-0.5 text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-800">
          <button
            type="button"
            data-testid="balance-mode-region"
            aria-pressed={!detail}
            onClick={() => setDetail(false)}
            className={cn(
              "flex-1 rounded-full px-3 py-1 transition",
              !detail
                ? "bg-emerald-600 text-white"
                : "text-zinc-600 dark:text-zinc-300",
            )}
          >
            부위
          </button>
          <button
            type="button"
            data-testid="balance-mode-detail"
            aria-pressed={detail}
            onClick={() => setDetail(true)}
            className={cn(
              "flex-1 rounded-full px-3 py-1 transition",
              detail
                ? "bg-emerald-600 text-white"
                : "text-zinc-600 dark:text-zinc-300",
            )}
          >
            세부근육
          </button>
        </div>
      ) : null}

      {lightMode ? (
        <div data-testid="light-mode-balance-fallback">
          <Mannequin colors={colors} />
        </div>
      ) : (
        <Balance3DBoundary fallback={<Mannequin colors={colors} />}>
          <BalanceCanvas
            gender={gender ?? "male"}
            colors={balanceColorsByMuscle(colors)}
            subColors={showDetail ? subColors : undefined}
          />
        </Balance3DBoundary>
      )}
    </div>
  );
}
