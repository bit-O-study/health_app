"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";

import type { MediaKind } from "@/features/exercises/exercise-media";

type Embed = { provider: "youtube" | "vimeo"; id: string };

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
 * - autoPlay(가이드 운동 차례): 음소거 자동재생 + 무한 반복 + 컨트롤/브랜딩 최대한 숨김
 *   (controls=0, fs=0, iv_load_policy=3 → 정지·전체화면·관련영상·주석 안 보이게).
 *   유튜브 자동재생은 정책상 음소거 필수 → sound=true(사용자 탭)면 mute=0 으로 소리 켬.
 * - 비 autoPlay(상세 페이지 등): 기본 컨트롤 유지해 사용자가 직접 재생.
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
    }
    return `https://www.youtube-nocookie.com/embed/${e.id}?${p.toString()}`;
  }
  // vimeo — title/byline/portrait 숨겨 깔끔하게
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

/**
 * 운동 미디어 표시. 유튜브/Vimeo 는 iframe, 직접 mp4 는 video, gif/이미지는 img.
 * 가이드(autoPlay)에서는 음소거 자동재생·무한반복하고, "소리 켜기" 탭으로 소리를 켤 수 있다.
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
  const embed = parseEmbed(url);
  const base = `relative w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-black ${className}`;

  if (embed) {
    return (
      <div className={base} style={{ aspectRatio: "16 / 9" }}>
        <iframe
          // sound 토글 시 src 가 바뀌며 사용자 제스처로 음소거 해제 재생됨
          key={sound ? "on" : "off"}
          src={embedSrc(embed, autoPlay, sound)}
          title="운동 시범 영상"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
        {autoPlay && !sound ? (
          <button
            type="button"
            onClick={() => setSound(true)}
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/75"
          >
            <Volume2 aria-hidden="true" size={14} />
            소리 켜기
          </button>
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
          muted={autoPlay && !sound}
          loop={autoPlay}
          className="h-auto w-full"
        />
        {autoPlay && !sound ? (
          <button
            type="button"
            onClick={() => setSound(true)}
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/75"
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
