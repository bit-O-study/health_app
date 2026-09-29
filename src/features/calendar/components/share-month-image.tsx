"use client";

import { useEffect, useState } from "react";
import { ImageDown, Share2, X } from "lucide-react";

/**
 * 이달 기록 이미지 — 운동한 날·연속·런닝을 한 장으로(캘린더 3단계).
 *
 * 누르면 **캘린더 위에 미리보기**를 띄운다. 예전엔 공유 API 가 없는 앱(안드로이드 WebView)에서
 * 링크를 그대로 따라가 화면이 PNG 원본으로 바뀌었다 — 돌아갈 버튼도 없어 "이미지가 안
 * 만들어진다" 로 보였다(2026-09-29 제보). 이제 이미지는 여기서 받아 보여 주고,
 * 파일 공유가 되는 브라우저에서만 '공유' 버튼을 단다(누르는 순간 공유 — 사용자 동작 유효).
 */
export function ShareMonthImage({ month }: { month: string }) {
  const url = `/api/calendar/month-image?m=${month}`;
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ready"; src: string; file: File }
    | { kind: "error"; message: string }
  >({ kind: "loading" });
  const [canShareFile, setCanShareFile] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    let objectUrl: string | null = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ kind: "loading" });
    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(res.status === 401 ? "로그인이 풀렸어요. 다시 로그인해 주세요." : `이미지를 만들지 못했어요 (${res.status}).`);
        }
        const blob = await res.blob();
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        const file = new File([blob], `jimkkun-${month}.png`, { type: "image/png" });
        const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
        setCanShareFile(!!nav.canShare?.({ files: [file] }));
        setState({ kind: "ready", src: objectUrl, file });
      })
      .catch((e: unknown) => {
        if (alive) setState({ kind: "error", message: e instanceof Error ? e.message : "이미지를 만들지 못했어요." });
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, url, month]);

  async function share() {
    if (state.kind !== "ready") return;
    try {
      await navigator.share({ files: [state.file], title: `${month} 운동 기록` });
    } catch {
      // 공유 시트를 닫은 것도 여기로 온다 — 미리보기는 그대로 둔다.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="share-month-image"
        className="app-press flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-800 dark:bg-white/[0.08] dark:text-zinc-100"
      >
        <ImageDown aria-hidden="true" size={16} />
        이달 기록 이미지 만들기
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="이달 기록 이미지"
          data-testid="month-image-preview"
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-full w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-3 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">이달 기록 이미지</p>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 active:bg-zinc-100 dark:active:bg-white/[0.06]"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            {state.kind === "loading" ? (
              <div className="flex aspect-[4/5] w-full items-center justify-center rounded-xl bg-zinc-100 text-sm text-zinc-500 dark:bg-white/[0.06] dark:text-zinc-400">
                이미지 만드는 중…
              </div>
            ) : state.kind === "error" ? (
              <p role="alert" className="rounded-xl bg-zinc-100 p-4 text-center text-sm text-danger dark:bg-white/[0.06]">
                {state.message}
              </p>
            ) : (
              // blob 미리보기 — next/image 최적화 대상이 아니다.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.src}
                alt={`${month} 운동 기록 이미지`}
                data-testid="month-image"
                className="aspect-[4/5] w-full rounded-xl border border-[var(--line)] object-contain"
              />
            )}
            {state.kind === "ready" && canShareFile ? (
              <button
                type="button"
                onClick={share}
                className="app-press flex h-11 items-center justify-center gap-1.5 rounded-xl bg-brand text-sm font-semibold text-white dark:text-zinc-950"
              >
                <Share2 aria-hidden="true" size={16} />
                공유하기
              </button>
            ) : state.kind === "ready" ? (
              <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                화면을 캡처해서 친구에게 보내 보세요.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
