import { describe, expect, it } from "vitest";

import {
  laneFromLean,
  isLookingUp,
  runIntensityFromBounce,
} from "@/features/running/controls";
import { createGame, stepGame } from "@/features/running/game";

describe("controls", () => {
  it("좌우로 기울이면(가로 위치 변화) 그쪽 레인, 가운데면 0", () => {
    expect(laneFromLean(0)).toBe(0);
    expect(laneFromLean(0.1)).toBe(1); // 한쪽
    expect(laneFromLean(-0.1)).toBe(-1); // 반대쪽
    expect(laneFromLean(0.02)).toBe(0); // 임계 미만(작은 흔들림 무시)
  });

  it("위를 보면 점프 신호", () => {
    expect(isLookingUp(0)).toBe(false);
    expect(isLookingUp(20)).toBe(true);
  });

  it("머리 흔들림이 클수록 달리기 강도↑, 가만히면 0", () => {
    const still = Array.from({ length: 30 }, () => 0.5);
    expect(runIntensityFromBounce(still)).toBe(0);
    const running = Array.from({ length: 30 }, (_, i) => 0.5 + (i % 2 ? 0.04 : -0.04));
    expect(runIntensityFromBounce(running)).toBeGreaterThan(0.5);
    expect(runIntensityFromBounce([0.5])).toBe(0); // 표본 부족
  });

  it("감도 상향 — 가벼운 제자리 달리기(작은 흔들림)도 강도가 붙는다", () => {
    // ±0.008 alternating → std ≈ 0.008. 예전 매핑((std-0.004)/0.022)이면 ~0.18 로
    // 캐릭터가 거의 안 뛰었다. 상향 후엔 확실히 반응해야 한다.
    const light = Array.from(
      { length: 30 },
      (_, i) => 0.5 + (i % 2 ? 0.008 : -0.008),
    );
    expect(runIntensityFromBounce(light)).toBeGreaterThan(0.3);
    // 아주 미세한 흔들림(≈idle)은 여전히 0 근처.
    const tiny = Array.from(
      { length: 30 },
      (_, i) => 0.5 + (i % 2 ? 0.002 : -0.002),
    );
    expect(runIntensityFromBounce(tiny)).toBeLessThan(0.1);
  });
});

describe("game", () => {
  const input = (over: Partial<Parameters<typeof stepGame>[1]> = {}) => ({
    targetLane: 0 as const,
    jump: false,
    runIntensity: 1,
    ...over,
  });

  it("가만히 있으면(runIntensity 0) 거의 안 나아가고, 달리면 전진한다", () => {
    let still = createGame();
    for (let i = 0; i < 60; i++) still = stepGame(still, input({ runIntensity: 0 }), 16, () => 0.99);
    let run = createGame();
    for (let i = 0; i < 60; i++) run = stepGame(run, input({ runIntensity: 1 }), 16, () => 0.99);
    expect(run.distance).toBeGreaterThan(still.distance * 2);
  });

  it("레인을 바꾸면 playerLane 이 목표로 부드럽게 이동", () => {
    let s = createGame();
    for (let i = 0; i < 40; i++) s = stepGame(s, input({ targetLane: 1 }), 16, () => 0.99);
    expect(s.playerLane).toBeGreaterThan(0.8);
    expect(s.targetLane).toBe(1);
  });

  it("같은 레인 블록에 부딪히면(점프 안 하면) 게임오버", () => {
    let s = createGame();
    // 가운데 레인에 블록 하나를 플레이어 앞에 직접 배치(rng 로 lane=가운데, block).
    s = { ...s, obstacles: [{ id: 1, lane: 0, z: 0.2, kind: "block" }] };
    s = stepGame(s, input({ targetLane: 0, jump: false }), 16, () => 0.99);
    expect(s.status).toBe("over");
  });

  it("점프해서 블록을 넘으면 살아남는다", () => {
    let s = createGame();
    s = { ...s, obstacles: [{ id: 1, lane: 0, z: 0.2, kind: "block" }], jumpY: 1, onGround: false, vy: 1 };
    s = stepGame(s, input({ targetLane: 0, jump: false }), 16, () => 0.99);
    expect(s.status).toBe("playing");
  });

  it("같은 레인 코인을 먹으면 coins 증가(중복 없음)", () => {
    let s = createGame();
    s = { ...s, obstacles: [{ id: 1, lane: 0, z: 0.1, kind: "coin" }] };
    s = stepGame(s, input({ targetLane: 0 }), 16, () => 0.99);
    expect(s.coins).toBe(1);
    s = stepGame(s, input({ targetLane: 0 }), 16, () => 0.99);
    expect(s.coins).toBe(1); // 같은 코인 재획득 안 됨
  });
});
