/**
 * 몸 사진 비교 — 라이트 2단계 혜택 3(2026-10-02, docs/lite-stage2-design-2026-10-02.html). 순수 모듈.
 *
 * 앞·옆·뒤 사진을 날짜별로 모아 같은 방향끼리 나란히 본다. 파일은 비공개 버킷(body-photos)의
 * <userId>/... 에만 있고, 볼 때만 짧은 서명 URL 로 연다. 한도는 서버 액션이 이 함수로 판단한다.
 */
import type { PlanId } from "@/features/billing/plans";

export type Pose = "front" | "side" | "back";
export const POSES: readonly Pose[] = ["front", "side", "back"];
export const POSE_LABEL: Record<Pose, string> = { front: "앞", side: "옆", back: "뒤" };

export function isPose(v: unknown): v is Pose {
  return v === "front" || v === "side" || v === "back";
}

/** 무료는 모두 합쳐 3장(맛보기), 라이트 이상은 무제한이되 하루 10장(남용 방지). */
export const FREE_PHOTO_LIMIT = 3;
export const DAILY_PHOTO_LIMIT = 10;

/** 기기에서 줄이는 크기 — 서버 액션 본문 한도(1MB) 안에 넉넉히 들어가게. */
export const PHOTO_MAX_PX = 1080;
export const PHOTO_QUALITY = 0.75;
/** base64 로 받는 최대 길이(약 900KB). */
export const PHOTO_MAX_BASE64 = 1_200_000;

/** 한 장 더 올려도 되나 — 안 되면 사용자에게 보일 문장. */
export function photoLimitError(plan: PlanId, total: number, today: number): string | null {
  if (plan === "free" && total >= FREE_PHOTO_LIMIT) {
    return `무료는 몸 사진 ${FREE_PHOTO_LIMIT}장까지예요. 라이트에서 계속 쌓을 수 있어요.`;
  }
  if (today >= DAILY_PHOTO_LIMIT) return `몸 사진은 하루 ${DAILY_PHOTO_LIMIT}장까지 올릴 수 있어요.`;
  return null;
}

export type BodyPhoto = { id: string; takenOn: string; pose: Pose; path: string };

/** 날짜 목록(최근 순, 중복 없이). */
export function photoDates(photos: readonly BodyPhoto[]): string[] {
  return [...new Set(photos.map((p) => p.takenOn))].sort((a, b) => b.localeCompare(a));
}

/**
 * 비교할 두 장 — 같은 방향에서 고른 두 날짜의 사진(그날 여러 장이면 마지막 것).
 * 날짜를 안 고르면 그 방향의 가장 오래된 것과 가장 최근 것. 한 장뿐이면 null.
 */
export function comparePair(
  photos: readonly BodyPhoto[],
  pose: Pose,
  before?: string | null,
  after?: string | null,
): { before: BodyPhoto; after: BodyPhoto } | null {
  const same = photos.filter((p) => p.pose === pose).sort((a, b) => a.takenOn.localeCompare(b.takenOn));
  if (same.length < 2) return null;
  const on = (d: string) => same.filter((p) => p.takenOn === d).pop() ?? null;
  const b = (before && on(before)) || same[0];
  const a = (after && on(after)) || same[same.length - 1];
  if (b.id === a.id) return null;
  return b.takenOn <= a.takenOn ? { before: b, after: a } : { before: a, after: b };
}

/** 사진 사이 기간(일). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export type BodyCompAt = { date: string; weightKg: number | null; muscleKg: number | null; fatPct: number | null };

/** 그 날짜 또는 그 전 가장 가까운 체성분 측정(오래된 → 최근 순으로 받는다). */
export function compOnOrBefore(comps: readonly BodyCompAt[], date: string): BodyCompAt | null {
  let found: BodyCompAt | null = null;
  for (const c of comps) if (c.date <= date) found = c;
  return found;
}
