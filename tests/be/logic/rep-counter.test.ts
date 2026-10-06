import { describe, expect, it } from "vitest";

import {
  INITIAL_REP_STATE,
  REP_SPECS,
  angleFromPose,
  jointAngle,
  repKindFor,
  repStatusText,
  repsToApply,
  stepRep,
  type PosePoint,
  type RepSpec,
  type RepState,
} from "@/features/workout-timer/rep-counter";

const SQUAT = REP_SPECS.squat;
const PUSHUP = REP_SPECS.pushup;

/** 각도 목록을 차례로 넣고 최종 상태와 '센 순간' 수를 돌려준다. */
function run(angles: (number | null)[], spec: RepSpec, from: RepState = INITIAL_REP_STATE) {
  let state = from;
  let events = 0;
  for (const a of angles) {
    const r = stepRep(state, a, spec);
    state = r.state;
    if (r.counted) events += 1;
  }
  return { state, events };
}

/** 한 번 앉았다 일어서는 동작(부드럽게 여러 장면). */
function rep(bottom = 70, top = 175): number[] {
  const down = [top, 150, 125, 100, 85, bottom, bottom, bottom];
  const up = [85, 110, 135, 160, top, top, top];
  return [...down, ...up];
}

describe("관절 각도", () => {
  it("직각은 90°, 일직선은 180°", () => {
    expect(jointAngle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBeCloseTo(90);
    expect(jointAngle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 })).toBeCloseTo(180);
  });

  it("점이 겹치면 각도를 만들지 않는다", () => {
    expect(jointAngle({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });
});

/** 33점짜리 자세에서 필요한 점만 채운다(나머지는 안 보임). */
function pose(sides: Partial<Record<0 | 1, { pts: [PosePoint, PosePoint, PosePoint]; vis: number }>>, idx: {
  left: [number, number, number];
  right: [number, number, number];
}): PosePoint[] {
  const out: PosePoint[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const side of [0, 1] as const) {
    const s = sides[side];
    if (!s) continue;
    const ids = side === 0 ? idx.left : idx.right;
    ids.forEach((id, i) => (out[id] = { ...s.pts[i], visibility: s.vis }));
  }
  return out;
}
const KNEE = { left: [23, 25, 27] as [number, number, number], right: [24, 26, 28] as [number, number, number] };
const bent: [PosePoint, PosePoint, PosePoint] = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }]; // 90°
const straight: [PosePoint, PosePoint, PosePoint] = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }]; // 180°

describe("자세 → 각도", () => {
  it("옆모습이라 한쪽이 가려지면 보이는 쪽 각도를 쓴다", () => {
    const p = pose({ 0: { pts: bent, vis: 0.9 }, 1: { pts: straight, vis: 0.1 } }, KNEE);
    expect(angleFromPose(p, SQUAT)).toBeCloseTo(90);
  });

  it("양쪽이 다 보이면 더 잘 보이는 쪽", () => {
    const p = pose({ 0: { pts: bent, vis: 0.6 }, 1: { pts: straight, vis: 0.95 } }, KNEE);
    expect(angleFromPose(p, SQUAT)).toBeCloseTo(180);
  });

  it("몸이 화면에 안 들어오면 null", () => {
    const p = pose({ 0: { pts: bent, vis: 0.2 }, 1: { pts: straight, vis: 0.3 } }, KNEE);
    expect(angleFromPose(p, SQUAT)).toBeNull();
    expect(angleFromPose(null, SQUAT)).toBeNull();
  });

  it("푸시업은 팔꿈치(어깨-팔꿈치-손목)를 본다", () => {
    const p = pose({ 1: { pts: bent, vis: 0.9 } }, { left: [11, 13, 15], right: [12, 14, 16] });
    expect(angleFromPose(p, PUSHUP)).toBeCloseTo(90);
    expect(angleFromPose(p, SQUAT)).toBeNull();
  });
});

describe("횟수 세기", () => {
  it("내려갔다 올라오면 1회, 세 번이면 3회", () => {
    const { state, events } = run([175, ...rep(), ...rep(), ...rep()], SQUAT);
    expect(state.count).toBe(3);
    expect(events).toBe(3);
  });

  it("🔴 덜 내려간 동작(130°까지만)은 세지 않는다", () => {
    const partial = [175, 150, 135, 130, 130, 140, 160, 175, 175];
    const { state } = run([175, ...rep(), ...partial, ...rep()], SQUAT);
    expect(state.count).toBe(2);
  });

  it("🔴 올라온 자세를 보기 전에는 세지 않는다 — 폰 세우고 일어서는 동작이 1회가 되면 안 된다", () => {
    const { state } = run([70, 70, 90, 120, 160, 175, 175], SQUAT);
    expect(state.count).toBe(0);
    expect(state.phase).toBe("up");
  });

  it("🔴 기준 각도 근처에서 흔들려도 한 번만 센다", () => {
    const wobbleBottom = [175, 130, 100, 95, 102, 96, 104, 95, 130, 165, 175, 175];
    const { state } = run(wobbleBottom, SQUAT);
    expect(state.count).toBe(1);
  });

  it("🔴 잠깐 가려져도 세던 것을 잃거나 두 번 세지 않는다", () => {
    const hidden = [175, 150, 110, 85, 70, null, null, 80, 120, 160, 175, 175];
    const { state } = run(hidden, SQUAT);
    expect(state.count).toBe(1);
  });

  it("가려진 장면은 '안 보임'으로 표시한다", () => {
    const { state } = run([175, null], SQUAT);
    expect(state.visible).toBe(false);
    expect(repStatusText(state, SQUAT)).toBe(SQUAT.setupHint);
  });

  it("푸시업도 같은 규칙(팔 폄 150° 이상 → 굽힘 100° 이하 → 폄)", () => {
    const push = [170, 140, 110, 90, 80, 80, 100, 130, 155, 170, 170];
    const { state } = run([170, ...push, ...push], PUSHUP);
    expect(state.count).toBe(2);
  });
});

describe("안내·적용", () => {
  it("상태별 안내 문구", () => {
    expect(repStatusText({ ...INITIAL_REP_STATE, visible: true }, SQUAT)).toContain(SQUAT.startHint);
    expect(repStatusText({ phase: "down", count: 0, smoothed: 80, visible: true }, SQUAT)).toContain("올라오세요");
    expect(repStatusText({ phase: "up", count: 0, smoothed: 175, visible: true }, PUSHUP)).toBe("시작하세요!");
  });

  it("0회는 횟수 칸에 넣지 않고, 100회를 넘으면 100으로 자른다", () => {
    expect(repsToApply(0)).toBeNull();
    expect(repsToApply(12)).toBe(12);
    expect(repsToApply(130)).toBe(100);
  });

  it("카메라로 셀 수 있는 운동만 켠다", () => {
    expect(repKindFor("squat")).toBe("squat");
    expect(repKindFor("goblet-squat")).toBe("squat");
    expect(repKindFor("push-up")).toBe("pushup");
    expect(repKindFor("diamond-pushup")).toBe("pushup");
    expect(repKindFor("bench-press")).toBeNull();
    expect(repKindFor("bulgarian-split-squat")).toBeNull();
  });
});
