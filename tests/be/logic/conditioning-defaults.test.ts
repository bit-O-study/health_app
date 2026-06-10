import { describe, expect, it } from "vitest";

import {
  defaultsFor,
  getConditioningItem,
} from "@/features/routine/conditioning-catalog";
import { ALL_FOCUSES } from "@/features/routine/exercise-catalog";

// 유산소(체온 상승) 리드인으로 쓰는 항목들
const CARDIO = new Set([
  "running",
  "stair-master",
  "cycling",
  "rowing",
  "elliptical",
  "jump-rope",
  "walking",
  "jumping-jack",
]);

describe("컨디셔닝 추천 기본값 (퀄리티·종류)", () => {
  it("모든 부위 워밍업은 4개이고 유산소 리드인으로 시작한다", () => {
    for (const f of ALL_FOCUSES) {
      const w = defaultsFor(f, "warmup");
      expect(w.length, `${f} 워밍업 개수`).toBe(4);
      expect(CARDIO.has(w[0]), `${f} 첫 워밍업=${w[0]} 유산소`).toBe(true);
    }
  });

  it("모든 부위 마무리는 4개다", () => {
    for (const f of ALL_FOCUSES) {
      expect(defaultsFor(f, "cooldown").length, `${f} 마무리 개수`).toBe(4);
    }
  });

  it("추천 항목은 모두 해당 종류(warmup/cooldown)에 유효한 카탈로그 항목", () => {
    for (const f of ALL_FOCUSES) {
      for (const kind of ["warmup", "cooldown"] as const) {
        for (const id of defaultsFor(f, kind)) {
          const item = getConditioningItem(id);
          expect(item, `${id} 카탈로그 존재`).toBeTruthy();
          expect(item!.kinds.includes(kind), `${id} ∈ ${kind}`).toBe(true);
        }
      }
    }
  });

  it("같은 부위·종류에 중복 항목이 없다", () => {
    for (const f of ALL_FOCUSES) {
      for (const kind of ["warmup", "cooldown"] as const) {
        const ids = defaultsFor(f, kind);
        expect(new Set(ids).size, `${f}/${kind} 중복`).toBe(ids.length);
      }
    }
  });
});
