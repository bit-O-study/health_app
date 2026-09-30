"use client";

import { isNativeApp } from "@/lib/platform/is-native-app";

/**
 * 링크 공유(커뮤니티 3단계 — 운동 영상 한 편 보내기).
 * 앱 안이면 기기 공유 창(@capacitor/share), 브라우저면 Web Share, 둘 다 안 되면 주소 복사.
 * 🔴 공유 창에서 사용자가 취소한 건 실패가 아니다 — 복사로 넘어가지 않는다.
 */
export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/** 공개 배포 주소 기준 절대 링크(로컬 테스트 때 localhost 가 공유되지 않게). */
export function absoluteUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function isAbort(e: unknown): boolean {
  const name = (e as { name?: string } | null)?.name ?? "";
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return name === "AbortError" || /cancel/i.test(msg);
}

export async function shareLink(input: { title: string; text: string; url: string }): Promise<ShareOutcome> {
  if (isNativeApp()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: input.title, text: input.text, url: input.url, dialogTitle: input.title });
      return "shared";
    } catch (e) {
      if (isAbort(e)) return "cancelled";
    }
  } else if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(input);
      return "shared";
    } catch (e) {
      if (isAbort(e)) return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(input.url);
    return "copied";
  } catch {
    return "failed";
  }
}
