import type { MediaKind } from "@/features/exercises/exercise-media";

/** 유튜브/Vimeo watch·short URL → embed URL. 아니면 null. */
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname.startsWith("/shorts/")) {
        return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
      }
      const v = u.searchParams.get("v");
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 운동 미디어 표시. 유튜브/Vimeo 는 iframe, 직접 mp4 는 video, gif/이미지는 img.
 * 1:1 비율 컨테이너 안에 들어가며, 부모가 크기를 정한다.
 */
export function MediaEmbed({
  url,
  kind,
  className = "",
}: {
  url: string;
  kind: MediaKind;
  className?: string;
}) {
  const embed = toEmbedUrl(url);
  const base = `w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-black ${className}`;

  if (embed) {
    return (
      <div className={base} style={{ aspectRatio: "16 / 9" }}>
        <iframe
          src={embed}
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
        <video src={url} controls playsInline className="h-auto w-full" />
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
