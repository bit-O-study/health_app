"use client";

import { useRef, useState } from "react";

import type { MediaKind } from "@/features/exercises/exercise-media";
import { useReleaseVideoOnUnmount } from "@/lib/media/video-resource";

type Embed = { provider: "youtube" | "vimeo"; id: string };

/** 가이드(운동 차례) 시범 영상 재생 배속 — 자세 보기 좋게 슬로우. */
const GUIDE_RATE = 0.5;

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoRetry, setVideoRetry] = useState(0);
  const [videoError, setVideoError] = useState(false);
  useReleaseVideoOnUnmount(videoRef);
  const embed = parseEmbed(url);
  const base = `relative w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-black ${className}`;
  // ⚠ 시범 영상 중엔 **세로(1080×1920) 영상**이 있어(랫풀다운 등) 그냥 h-auto 로 두면
  //   폰에서 높이가 화면을 넘겨 "한눈에" 안 들어온다. 화면의 절반 이하로 상한을 두고
  //   object-contain 으로 (검은 배경 위에) 담는다. 가로 영상은 상한에 안 걸려 그대로.
  const MEDIA_CAP = "max-h-[46vh] sm:max-h-[24rem]";

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
      <div className={`${base} flex items-center justify-center`}>
        <video
          key={videoRetry}
          ref={videoRef}
          src={url}
          preload="metadata"
          controls={!autoPlay}
          playsInline
          autoPlay={autoPlay}
          muted={autoPlay}
          loop={autoPlay}
          onLoadedMetadata={(e) => {
            setVideoError(false);
            if (autoPlay) e.currentTarget.playbackRate = url.startsWith("/exercise-guides/ai-v2/") ? 1 : GUIDE_RATE;
          }}
          onError={() => setVideoError(true)}
          className={`h-auto w-full object-contain ${MEDIA_CAP}`}
          style={{ maxHeight: "min(46dvh, 24rem)" }}
        />
        {videoError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/90 px-5 text-center text-white">
            <p className="text-sm font-semibold">영상을 불러오지 못했어요.</p>
            <button
              type="button"
              onClick={() => {
                setVideoError(false);
                setVideoRetry((value) => value + 1);
              }}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-900"
            >
              다시 불러오기
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  // gif / image
  return (
    <div className={`${base} flex items-center justify-center`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="운동 시범 움짤"
        className={`h-auto w-full object-contain ${MEDIA_CAP}`}
        style={{ maxHeight: "min(46dvh, 24rem)" }}
      />
    </div>
  );
}
