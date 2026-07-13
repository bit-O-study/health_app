import { describe, expect, it } from "vitest";

import { pickClipName } from "@/features/running/character";

describe("pickClipName — 캐릭터 애니메이션 클립 매칭(Mixamo 등 이름 제각각)", () => {
  it("이름에 run 계열이 있으면 그걸 고른다", () => {
    expect(pickClipName(["Idle", "Running"], "run")).toBe("Running");
    expect(pickClipName(["idle", "Run"], "run")).toBe("Run");
    expect(pickClipName(["Armature|Jog", "Idle"], "run")).toBe("Armature|Jog");
  });

  it("idle 계열이 있으면 idle 로 고른다", () => {
    expect(pickClipName(["Idle", "Running"], "idle")).toBe("Idle");
    expect(pickClipName(["stand", "Run"], "idle")).toBe("stand");
  });

  it("run 클립이 명확치 않으면 idle 아닌 클립→첫 클립 폴백", () => {
    // 'mixamo.com' 하나뿐 → run 폴백으로 그거라도.
    expect(pickClipName(["mixamo.com"], "run")).toBe("mixamo.com");
    // idle + 정체불명 → run 은 idle 아닌 것.
    expect(pickClipName(["Idle", "mixamo.com"], "run")).toBe("mixamo.com");
  });

  it("idle 클립이 없으면 null(정지 폴백은 호출부)", () => {
    expect(pickClipName(["Running"], "idle")).toBeNull();
    expect(pickClipName(["mixamo.com"], "idle")).toBeNull();
    expect(pickClipName([], "idle")).toBeNull();
  });

  it("빈 목록이면 run 도 null", () => {
    expect(pickClipName([], "run")).toBeNull();
  });
});
