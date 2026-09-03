import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  EXERCISES,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
import { EXTRA_EXERCISES } from "@/features/routine/exercise-catalog-extra";
import { EXTRA_METHODS } from "@/features/routine/exercise-catalog-extra-methods";
import {
  hasMethodSteps,
  methodSteps,
} from "@/features/routine/exercise-methods";

// P0(번들 다이어트): 확장 카탈로그 1,237개의 운동법 텍스트는 클라이언트 번들에서 뺐다.
// 두 가지를 동시에 지켜야 한다 —
//   (1) 기능: 운동모드에서 보여주던 단계가 하나도 사라지지 않을 것
//   (2) 크기: 목록용 모듈이 다시 뚱뚱해지지 않을 것

const SRC = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../src/features/routine",
);

describe("methodSteps — 기본 + 확장 카탈로그를 합쳐서 돌려준다", () => {
  it("기본 카탈로그 운동은 자기 데이터를 그대로 준다", () => {
    const [id, ex] = Object.entries(EXERCISES).find(
      ([, e]) => (e.equipments[0].method?.length ?? 0) > 0,
    )!;
    const first = ex.equipments[0];
    expect(methodSteps(id, first.equipment)).toEqual(first.method);
  });

  it("확장 카탈로그 운동도 단계를 준다(분리 모듈에서)", () => {
    const id = Object.keys(EXTRA_EXERCISES)[0];
    const equip = EXTRA_EXERCISES[id].equipments[0].equipment;
    const steps = methodSteps(id, equip);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps).toEqual(EXTRA_METHODS[id]?.[equip]);
  });

  it("확장 운동 전부가 첫 기구 기준으로 단계를 갖는다(하나도 안 빠졌다)", () => {
    const missing = Object.entries(EXTRA_EXERCISES).filter(
      ([id, ex]) => methodSteps(id, ex.equipments[0].equipment).length === 0,
    );
    expect(missing.map(([id]) => id)).toEqual([]);
  });

  it("등록된 기구 조합이면 모두 단계가 있다", () => {
    const holes: string[] = [];
    for (const [id, ex] of Object.entries(EXTRA_EXERCISES)) {
      for (const v of ex.equipments) {
        if (methodSteps(id, v.equipment).length === 0) {
          holes.push(`${id}/${v.equipment}`);
        }
      }
    }
    expect(holes).toEqual([]);
  });

  it("모르는 운동·기구는 빈 배열(터지지 않는다)", () => {
    expect(methodSteps("no-such-exercise", "barbell")).toEqual([]);
    const id = Object.keys(EXTRA_EXERCISES)[0];
    expect(methodSteps(id, "sled" as EquipmentId)).toEqual(
      EXTRA_METHODS[id]?.sled ?? [],
    );
  });

  it("hasMethodSteps 는 기본·확장 양쪽을 본다", () => {
    expect(hasMethodSteps(Object.keys(EXTRA_EXERCISES)[0])).toBe(true);
    expect(hasMethodSteps("no-such-exercise")).toBe(false);
  });
});

describe("번들 회귀 가드", () => {
  it("목록용 모듈(클라 번들)에 운동법 문장이 없다", () => {
    const lite = readFileSync(`${SRC}/exercise-catalog-extra.ts`, "utf8");
    expect(lite).not.toContain('"method"');
    // 목록용은 운동법 모듈보다 커질 수 있지만, 예전 합본(710KiB)으로 되돌아가면 안 된다.
    expect(Buffer.byteLength(lite)).toBeLessThan(500 * 1024);
  });

  it("운동법 모듈은 서버 전용 — 클라이언트 컴포넌트가 직접 import 하지 않는다", () => {
    // 유일한 소비자는 서버 전용 접근자(exercise-methods.ts) 여야 한다.
    const methodsFile = readFileSync(`${SRC}/exercise-methods.ts`, "utf8");
    expect(methodsFile).toContain('import "server-only"');
  });
});
