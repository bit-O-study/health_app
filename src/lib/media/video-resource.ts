"use client";

import { useEffect, type RefObject } from "react";

/** 화면에서 사라진 video가 WebView의 디코더·네트워크 버퍼를 계속 잡지 않게 한다. */
export function releaseVideoResource(video: HTMLVideoElement | null): void {
  if (!video) return;

  video.pause();
  video.removeAttribute("src");
  video.load();
}

/** 마운트 당시 video를 캡처해 React가 ref를 비운 뒤에도 안전하게 해제한다. */
export function useReleaseVideoOnUnmount(
  ref: RefObject<HTMLVideoElement | null>,
  sourceKey?: string | boolean,
): void {
  useEffect(() => {
    const video = ref.current;
    return () => releaseVideoResource(video);
  }, [ref, sourceKey]);
}
