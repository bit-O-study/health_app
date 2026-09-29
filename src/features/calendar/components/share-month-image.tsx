"use client";

import { useState } from "react";
import { ImageDown } from "lucide-react";

/**
 * 이달 기록 이미지 — 운동한 날·연속·런닝을 한 장으로(캘린더 3단계).
 *
 * 공유 시트가 파일을 받을 수 있으면(모바일 브라우저) 바로 공유하고, 아니면 **평범한 링크**로
 * 이미지를 연다. 안드로이드 WebView 는 공유 API·blob 저장이 조용히 실패해서, 서버가 그린
 * 이미지를 링크로 여는 쪽이 늘 동작한다(`/settings/export` 와 같은 이유).
 */
export function ShareMonthImage({ month }: { month: string }) {
  const [busy, setBusy] = useState(false);
  const url = `/api/calendar/month-image?m=${month}`;

  async function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const nav = navigator as Navigator & {
      canShare?: (d: ShareData) => boolean;
      share?: (d: ShareData) => Promise<void>;
    };
    if (!nav.share || !nav.canShare) return; // 링크 그대로 따라간다
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const file = new File([await res.blob()], `jimkkun-${month}.png`, { type: "image/png" });
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: `${month} 운동 기록` });
      } else {
        window.location.href = url;
      }
    } catch (err) {
      // 사용자가 공유 시트를 닫은 건 실패가 아니다.
      if (!(err instanceof DOMException && err.name === "AbortError")) window.location.href = url;
    } finally {
      setBusy(false);
    }
  }

  return (
    <a
      href={url}
      onClick={onClick}
      aria-busy={busy}
      data-testid="share-month-image"
      className="app-press flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-800 dark:bg-white/[0.08] dark:text-zinc-100"
    >
      <ImageDown aria-hidden="true" size={16} />
      {busy ? "이미지 만드는 중…" : "이달 기록 이미지로 공유"}
    </a>
  );
}
