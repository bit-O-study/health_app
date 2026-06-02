"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";

import type { MediaKind } from "@/features/exercises/exercise-media";

type Embed = { provider: "youtube" | "vimeo"; id: string };

/** 가이드(운동 차례) 시범 영상 재생 배속 — 자세 보기 좋게 슬로우. */
const GUIDE_RATE = 0.5;

/** 유튜브/Vimeo watch·short URL → provider+id. 아니면 null. */
function parseEmbed(url: string): Embed | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? { provider: "youtube", id } : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        return id ? { provider: "youtube", id } : null;
      }
      const v = u.searchParams.get("v");
      return v ? { provider: "youtube", id: v } : null;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? { provider: "vimeo", id } : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * embed iframe src.
 * - autoPlay(가이드): 음소거 자동재생 + 무한반복 + 컨트롤/브랜딩 숨김 + jsapi(배속 제어).
 *   유튜브 자동재생은 음소거 필수 → sound=true(사용자 탭)면 mute=0.
 * - 비 autoPlay(상세): 기본 컨트롤 유지.
 */
function embedSrc(e: Embed, autoPlay: boolean, sound: boolean): string {
  if (e.provider === "youtube") {
    const p = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      iv_load_policy: "3",
    });
    if (autoPlay) {
      p.set("autoplay", "1");
      p.set("mute", sound ? "0" : "1");
      p.set("loop", "1");
      p.set("playlist", e.id);
      p.set("controls", "0");
      p.set("fs", "0");
      p.set("disablekb", "1");
      p.set("enablejsapi", "1");
    }
    return `https://www.youtube-nocookie.com/embed/${e.id}?${p.toString()}`;
  }
  const p = new URLSearchParams({
    playsinline: "1",
    title: "0",
    byline: "0",
    portrait: "0",
  });
  if (autoPlay) {
    p.set("autoplay", "1");
    p.set("muted", sound ? "0" : "1");
    p.set("loop", "1");
    p.set("controls", "0");
  }
  return `https://player.vimeo.com/video/${e.id}?${p.toString()}`;
}

/** iframe 플레이어에 배속 명령 전송(유튜브/Vimeo IFrame API). 준비 전일 수 있어 여러 번 시도. */
function sendRate(iframe: HTMLIFrameElement | null, provider: "youtube" | "vimeo") {
  const win = iframe?.contentWindow;
  if (!win) return;
  const msg =
    provider === "youtube"
      ? JSON.stringify({ event: "command", func: "setPlaybackRate", args: [GUIDE_RATE] })
      : JSON.stringify({ method: "setPlaybackRate", value: GUIDE_RATE });
  const target = provider === "youtube" ? "*" : "https://player.vimeo.com";
  win.postMessage(msg, target);
}

/**
 * 운동 미디어. 유튜브/Vimeo 는 iframe, 직접 mp4 는 video, gif/이미지는 img.
 * 가이드(autoPlay)에서는 음소거 자동재생·무한반복·0.5배속, 위를 오버레이로 덮어
 * 유튜브 컨트롤이 안 뜨게 하고, "소리 켜기" 탭으로 소리를 켤 수 있다.
 */
export function MediaEmbed({
  url,
  kind,
  className = "",
  autoPlay = false,
}: {
  url: string;
  kind: MediaKind;
  className?: string;
  autoPlay?: boolean;
}) {
  const [sound, setSound] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const embed = parseEmbed(url);
  const base = `relative w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-black ${className}`;

  // 직접 video: 배속 적용(메타데이터 로드 후).
  useEffect(() => {
    if (!autoPlay) return;
    const v = videoRef.current;
    if (v) v.playbackRate = GUIDE_RATE;
  }, [autoPlay, sound]);

  // iframe 플레이어 준비 타이밍이 불확실 → 로드 후 여러 번 배속 전송.
  function applyRateRetry() {
    if (!autoPlay || !embed) return;
    const send = () => sendRate(iframeRef.current, embed.provider);
    [200, 700, 1500, 3000].forEach((t) => setTimeout(send, t));
  }

  if (embed) {
    return (
      <div className={base} style={{ aspectRatio: "16 / 9" }}>
        <iframe
          ref={iframeRef}
          key={sound ? "on" : "off"}
          src={embedSrc(embed, autoPlay, sound)}
          title="운동 시범 영상"
          className="h-full w-full"
          onLoad={applyRateRetry}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
        {autoPlay ? (
          <>
            {/* 클릭/호버 차단 — 유튜브 컨트롤·관련영상·정지 오버레이가 안 뜨게. */}
            <div className="absolute inset-0" aria-hidden="true" />
            {!sound ? (
              <button
                type="button"
                onClick={() => setSound(true)}
                className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/75"
              >
                <Volume2 aria-hidden="true" size={14} />
                소리 켜기
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className={base}>
        <video
          ref={videoRef}
          src={url}
          controls={!autoPlay}
          playsInline
          autoPlay={autoPlay}
          muted={autoPlay && !sound}
          loop={autoPlay}
          onLoadedMetadata={(e) => {
            if (autoPlay) e.currentTarget.playbackRate = GUIDE_RATE;
          }}
          className="h-auto w-full"
        />
        {autoPlay && !sound ? (
          <button
            type="button"
            onClick={() => setSound(true)}
            className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/75"
          >
            <Volume2 aria-hidden="true" size={14} />
            소리 켜기
          </button>
        ) : null}
      </div>
    );
  }

  // gif / image
  return (
    <div className={base}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="운동 시범 움짤" className="h-auto w-full object-contain" />
    </div>
  );
}
