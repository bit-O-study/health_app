import { describe, expect, it } from "vitest";

import { pickSceneQuality, QUALITY } from "@/features/running/quality";

/**
 * 3D 런닝 씬 품질 등급 — 저사양이면 그림자를 끄고 해상도를 낮춘다(팅김 완화).
 * 저사양 판정은 넉넉하게(하나만 걸려도 low), 고사양 판정은 인색하게.
 */
describe("pickSceneQuality", () => {
  it("메모리 4GB 미만이면 low — 그림자를 끈다", () => {
    const q = pickSceneQuality({ deviceMemory: 2, cores: 8 });
    expect(q.tier).toBe("low");
    expect(q.shadows).toBe(false);
    expect(q.dprMax).toBe(1);
  });

  it("코어 4개 이하면 메모리가 넉넉해도 low", () => {
    expect(pickSceneQuality({ deviceMemory: 8, cores: 4 }).tier).toBe("low");
  });

  it("메모리 8GB 이상 + 코어 8개 이상일 때만 high", () => {
    expect(pickSceneQuality({ deviceMemory: 8, cores: 8 }).tier).toBe("high");
    // 하나라도 모자라면 high 가 아니다(인색하게).
    expect(pickSceneQuality({ deviceMemory: 8, cores: 6 }).tier).toBe("mid");
    expect(pickSceneQuality({ deviceMemory: 6, cores: 8 }).tier).toBe("mid");
  });

  it("신호가 아예 없으면(iOS 사파리 등) mid — 모르면 안전한 쪽", () => {
    expect(pickSceneQuality({}).tier).toBe("mid");
    expect(pickSceneQuality({ deviceMemory: null, cores: null }).tier).toBe("mid");
  });

  it("고사양도 dpr 상한은 1.5 (예전 2 에서 낮춤)", () => {
    expect(QUALITY.high.dprMax).toBe(1.5);
    expect(QUALITY.mid.dprMax).toBe(1.5);
  });

  it("그림자를 켜는 등급은 그림자맵 크기가 정해져 있다", () => {
    expect(QUALITY.mid.shadowMapSize).toBe(512);
    expect(QUALITY.high.shadowMapSize).toBe(1024);
  });
});
