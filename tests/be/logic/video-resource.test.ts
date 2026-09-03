import { describe, expect, it, vi } from "vitest";

import { releaseVideoResource } from "@/lib/media/video-resource";

describe("releaseVideoResource", () => {
  it("재생을 멈추고 src와 디코더 버퍼를 해제한다", () => {
    const video = {
      pause: vi.fn(),
      removeAttribute: vi.fn(),
      load: vi.fn(),
    } as unknown as HTMLVideoElement;

    releaseVideoResource(video);

    expect(video.pause).toHaveBeenCalledOnce();
    expect(video.removeAttribute).toHaveBeenCalledWith("src");
    expect(video.load).toHaveBeenCalledOnce();
  });

  it("요소가 없어도 안전하다", () => {
    expect(() => releaseVideoResource(null)).not.toThrow();
  });
});
