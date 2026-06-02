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
 * embed iframe src 구성.
 * - autoPlay=true: 운동 차례가 되면 자동 재생. 브라우저 정책상 자동재생은 음소거 필수.
 * - 유튜브: nocookie 도메인 + rel=0(관련영상 X)·modestbranding·playsinline 으로
 *   유튜브로 이동/이탈을 최대한 줄이고 앱 내 인라인 재생.
 */
function embedSrc(e: Embed, autoPlay: boolean): string {
  if (e.provider === "youtube") {
    const p = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      // 운동 차례엔 음소거 자동재생 + 무한 반복(유튜브는 단일영상 반복에 playlist=id 필요).
      ...(autoPlay ? { autoplay: "1", mute: "1", loop: "1", playlist: e.id } : {}),
    });
    return `https://www.youtube-nocookie.com/embed/${e.id}?${p.toString()}`;
  }
  // vimeo
  const p = new URLSearchParams({
    playsinline: "1",
    ...(autoPlay ? { autoplay: "1", muted: "1", loop: "1" } : {}),
  });
  return `https://player.vimeo.com/video/${e.id}?${p.toString()}`;
}

/**
 * 운동 미디어 표시. 유튜브/Vimeo 는 iframe, 직접 mp4 는 video, gif/이미지는 img.
 * autoPlay 면(가이드 = 운동 차례) 음소거 자동 재생.
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
  /** 운동 차례가 되면 자동 재생(음소거). 가이드 오버레이에서 사용. */
  autoPlay?: boolean;
}) {
  const embed = parseEmbed(url);
  const base = `w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-black ${className}`;

  if (embed) {
    return (
      <div className={base} style={{ aspectRatio: "16 / 9" }}>
        <iframe
          src={embedSrc(embed, autoPlay)}
          title="운동 시범 영상"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className={base}>
        <video
          src={url}
          controls
          playsInline
          autoPlay={autoPlay}
          muted={autoPlay}
          loop={autoPlay}
          className="h-auto w-full"
        />
      </div>
    );
  }

  // gif / image
  return (
    <div className={base}>
      {/* 외부 URL — next/image 최적화 대신 일반 img (도메인 설정 불필요) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="운동 시범 움짤" className="h-auto w-full object-contain" />
    </div>
  );
}
