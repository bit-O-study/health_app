"use client";

import { useEffect, useRef, useState } from "react";

import type { MediaKind } from "@/features/exercises/exercise-media";

type Embed = { provider: "youtube" | "vimeo"; id: string };

/** 가이드(운동 차례) 시범 영상 재생 배속 — 자세 보기 좋게 슬로우. */
const GUIDE_RATE = 0.5;

const BENCH_PRESS_MULTISHOT = "/exercise-guides/bench-press-multishot";

const BENCH_CAMERA = [
  { scale: 1.45, origin: "67% 34%" },
  { scale: 1.35, origin: "63% 60%" },
  { scale: 1.15, origin: "54% 78%" },
  { scale: 1, origin: "50% 50%" },
] as const;

function BenchPressMultiShot({ className }: { className: string }) {
  const [camera, setCamera] = useState(0);
  const [showScapula, setShowScapula] = useState(true);

  useEffect(() => {
    const introTimer = window.setTimeout(() => {
      setCamera(0);
      setShowScapula(false);
    }, 5000);
    const timer = window.setInterval(
      () => setCamera((current) => (current + 1) % BENCH_CAMERA.length),
      3500,
    );
    return () => {
      window.clearTimeout(introTimer);
      window.clearInterval(timer);
    };
  }, []);

  const shot = BENCH_CAMERA[camera];
  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-200 bg-black dark:border-zinc-700 ${className}`}
    >
      {showScapula ? (
        <video
          src="/exercise-guides/bench-press-scapula.mp4"
          playsInline
          autoPlay
          muted
          className="h-full w-full object-cover"
        />
      ) : (
        <video
          src="/exercise-guides/bench-press-main-new.mp4"
          playsInline
          autoPlay
          muted
          loop
          className="h-full w-full object-contain transition-transform duration-1000 ease-in-out"
          style={{
            transform: `scale(${shot.scale})`,
            transformOrigin: shot.origin,
          }}
        />
      )}
    </div>
  );
}

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
 * - autoPlay(가이드): 자동재생(정책상 음소거로 시작) + 무한반복 + 컨트롤/브랜딩 숨김 + jsapi.
 *   로드 후 JS 로 음소거 해제 + 0.5배속 적용(운동 시작 클릭의 사용자 제스처 활용).
 * - 비 autoPlay(상세): 기본 컨트롤 유지.
 */
function embedSrc(e: Embed, autoPlay: boolean): string {
  if (e.provider === "youtube") {
    const p = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      iv_load_policy: "3",
    });
    if (autoPlay) {
      p.set("autoplay", "1");
      p.set("mute", "1"); // 시작은 음소거(자동재생 정책) → 로드 후 unMute
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
    p.set("muted", "1");
    p.set("loop", "1");
    p.set("controls", "0");
  }
  return `https://player.vimeo.com/video/${e.id}?${p.toString()}`;
}

/** iframe 플레이어에 음소거 해제 + 배속 명령(유튜브/Vimeo IFrame API). */
function tuneIframe(iframe: HTMLIFrameElement | null, provider: "youtube" | "vimeo") {
  const win = iframe?.contentWindow;
  if (!win) return;
  if (provider === "youtube") {
    const cmds: [string, unknown[]][] = [
      ["unMute", []],
      ["setVolume", [100]],
      ["setPlaybackRate", [GUIDE_RATE]],
      ["playVideo", []],
    ];
    for (const [func, args] of cmds) {
      win.postMessage(JSON.stringify({ event: "command", func, args }), "*");
    }
  } else {
    const target = "https://player.vimeo.com";
    win.postMessage(JSON.stringify({ method: "setVolume", value: 1 }), target);
    win.postMessage(JSON.stringify({ method: "setPlaybackRate", value: GUIDE_RATE }), target);
  }
}

/**
 * 운동 미디어. 유튜브/Vimeo 는 iframe, 직접 mp4 는 video, gif/이미지는 img.
 * 가이드(autoPlay)에서는 자동재생·무한반복·0.5배속·소리 ON, 위를 오버레이로 덮어
 * 유튜브 컨트롤이 안 뜨게 한다.
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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  if (url === BENCH_PRESS_MULTISHOT) {
    return <BenchPressMultiShot className={className} />;
  }
  const embed = parseEmbed(url);
  const base = `relative w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-black ${className}`;

  // iframe 플레이어 준비 타이밍이 불확실 → 로드 후 여러 번 음소거해제+배속 전송.
  function onIframeLoad() {
    if (!autoPlay || !embed) return;
    [150, 600, 1300, 2500].forEach((t) =>
      setTimeout(() => tuneIframe(iframeRef.current, embed.provider), t),
    );
  }

  if (embed) {
    return (
      <div className={base} style={{ aspectRatio: "16 / 9" }}>
        <iframe
          ref={iframeRef}
          src={embedSrc(embed, autoPlay)}
          title="운동 시범 영상"
          className="h-full w-full"
          onLoad={onIframeLoad}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
        {autoPlay ? (
          // 클릭/호버 차단 — 유튜브 컨트롤·관련영상·정지 오버레이가 안 뜨게.
          <div className="absolute inset-0" aria-hidden="true" />
        ) : null}
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className={base}>
        <video
          src={url}
          controls={!autoPlay}
          playsInline
          autoPlay={autoPlay}
          muted={autoPlay}
          loop={autoPlay}
          onLoadedMetadata={(e) => {
            if (autoPlay) e.currentTarget.playbackRate = GUIDE_RATE;
          }}
          onPlay={(e) => {
            // 재생 시작 후 음소거 해제(운동 시작 클릭의 사용자 활성화로 허용됨).
            if (autoPlay) e.currentTarget.muted = false;
          }}
          className="h-auto w-full"
        />
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
