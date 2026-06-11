import { describe, expect, it } from "vitest";

import { focusForStep } from "@/features/workout-timer/exercise-focus";

// 운동 방법 문구(한 단계) → 그 단계가 가리키는 신체 부위로 확대할 초점.
// 가이드 튜토리얼에서 자막 부위를 사진에서 직접 키워 보여주기 위함.

describe("focusForStep", () => {
  it("부위 키워드가 없으면 null(전체 보기)", () => {
    expect(focusForStep("천천히 통제하며 반복")).toBeNull();
    expect(focusForStep("")).toBeNull();
  });

  it("허리를 언급하면 허리·코어 부위로 — 위에서 아래로 중간쯤", () => {
    const f = focusForStep("허리 중립 유지하며 통제된 깊이까지");
    expect(f).not.toBeNull();
    expect(f!.part).toBe("허리·코어");
    expect(f!.zoom).toBeGreaterThan(1); // 확대됨
    expect(f!.y).toBeGreaterThan(0.35);
    expect(f!.y).toBeLessThan(0.6);
  });

  it("무릎/발/엉덩이는 점점 아래쪽(y 증가) 부위로", () => {
    const hip = focusForStep("엉덩이 뒤로 빼며 평행까지 앉기")!;
    const knee = focusForStep("무릎 안쪽 모임 없이 밀어 올리기")!;
    const foot = focusForStep("발뒤꿈치로 밀며 일어서기")!;
    expect(hip.part).toBe("엉덩이");
    expect(knee.part).toBe("무릎");
    expect(foot.part).toBe("발");
    // 엉덩이 < 무릎 < 발 순으로 화면 아래쪽
    expect(hip.y).toBeLessThan(knee.y);
    expect(knee.y).toBeLessThan(foot.y);
  });

  it("바벨 스쿼트 3단계 — 어깨(바 거치) → 무릎 → 허벅지 순으로 잡는다", () => {
    // 문장에 부위가 여러 개면 '먼저 등장한' 부위를 주제로.
    expect(focusForStep("바를 승모근 위, 코어 단단히")!.part).toBe("어깨");
    expect(focusForStep("무릎과 발끝 방향 맞추고 엉덩이 뒤로")!.part).toBe("무릎");
    expect(focusForStep("허벅지 평행까지 내렸다 발 전체로 밀기")!.part).toBe("허벅지");
  });

  it("초점 좌표·배율은 화면 정규화 범위 안", () => {
    for (const step of [
      "어깨 펴고 시선 정면",
      "팔꿈치 옆구리에 고정",
      "가슴 들고 견갑 모으기",
      "손목 일직선 유지",
    ]) {
      const f = focusForStep(step)!;
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.x).toBeLessThanOrEqual(1);
      expect(f.y).toBeGreaterThanOrEqual(0);
      expect(f.y).toBeLessThanOrEqual(1);
      expect(f.zoom).toBeGreaterThan(1);
      expect(f.zoom).toBeLessThan(3);
    }
  });
});