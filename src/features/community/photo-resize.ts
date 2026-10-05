/**
 * 인증 사진 줄이기 계획 — 순수 로직(커뮤니티 2단계, 2026-09-30).
 * 긴 변이 1600px 보다 크거나, 파일이 1.5MB 를 넘거나, JPEG/PNG/WebP 가 아니면 JPEG 로 다시 그린다.
 */
export const PHOTO_MAX_EDGE = 1600;
export const PHOTO_MAX_BYTES = 1.5 * 1024 * 1024;
const WEB_SAFE = new Set(["image/jpeg", "image/png", "image/webp"]);

export function photoUploadPlan(
  width: number,
  height: number,
  bytes: number,
  type: string,
): { resize: boolean; width: number; height: number } {
  const edge = Math.max(width, height);
  const scale = edge > PHOTO_MAX_EDGE ? PHOTO_MAX_EDGE / edge : 1;
  const resize = scale < 1 || bytes > PHOTO_MAX_BYTES || !WEB_SAFE.has(type);
  return {
    resize,
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
