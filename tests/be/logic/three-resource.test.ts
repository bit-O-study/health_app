import { describe, expect, it, vi } from "vitest";

import {
  disposeThreeObject,
  retainThreeResource,
} from "@/lib/media/three-resource";

describe("retainThreeResource", () => {
  it("공유 사용자가 모두 나간 마지막 시점만 해제를 허용한다", () => {
    const releaseFirst = retainThreeResource("runner");
    const releaseSecond = retainThreeResource("runner");

    expect(releaseFirst()).toBe(false);
    expect(releaseSecond()).toBe(true);
    expect(releaseSecond()).toBe(false);
  });
});

describe("disposeThreeObject", () => {
  it("geometry, texture, material을 모두 해제한다", () => {
    const geometryDispose = vi.fn();
    const textureDispose = vi.fn();
    const materialDispose = vi.fn();
    const root = {
      traverse(visitor: (object: unknown) => void) {
        visitor({
          geometry: { dispose: geometryDispose },
          material: {
            map: { isTexture: true, dispose: textureDispose },
            dispose: materialDispose,
          },
        });
      },
    };

    disposeThreeObject(root as never);

    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(textureDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
  });
});
