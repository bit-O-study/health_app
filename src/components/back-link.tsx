"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * 상단 '뒤로' 버튼 — 특정 페이지로 고정 이동하지 않고, 실제로 요청해 들어온
 * 이전 화면으로 돌아간다(홈·캘린더·운동탭 등 어디서 왔든). 스타일은 그대로
 * className/children 으로 넘겨 각 페이지 고유 모양을 유지한다.
 */
export function BackLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.back()} className={className}>
      {children}
    </button>
  );
}
