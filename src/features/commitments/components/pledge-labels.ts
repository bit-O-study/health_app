import type { PledgeStatus } from "@/features/commitments/evaluation";

/** 다짐 상태 배지 — 리스트·그룹별 화면이 같은 말과 색을 쓴다. */
export const STATUS_LABEL: Record<PledgeStatus, string> = {
  upcoming: "시작 전",
  active: "진행 중",
  success: "다짐 성공",
  failed: "다짐 실패",
};

export const STATUS_TONE: Record<PledgeStatus, string> = {
  upcoming: "bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300",
  active: "bg-brand-soft text-brand",
  success: "bg-brand text-white dark:text-zinc-950",
  failed: "bg-danger/10 text-danger",
};
