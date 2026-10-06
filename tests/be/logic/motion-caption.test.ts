import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import MOTION_SPECS from "@/features/workout-timer/motion-specs.json";
import {
  MOTION_SECONDS,
  captionFor,
  cleanMethodText,
  motionOrder,
  motionPhaseAt,
  motionSpecForUrl,
  nextSetHint,
  photoSlotAt,
  slotOfPhase,
  type MotionSpec,
} from "@/features/workout-timer/motion-caption";
import {
  cautionFor,
  introStepsFor,
  isFirstTimeExercise,
} from "@/features/workout-timer/exercise-caution-line";
import { EXTRA_METHODS } from "@/features/routine/exercise-catalog-extra-methods";
import { EXERCISES } from "@/features/routine/exercise-catalog";
import { EXTRA_EXERCISES } from "@/features/routine/exercise-catalog-extra";

const R16: MotionSpec = { panels: 16, cycle: "reverse" };
const R8: MotionSpec = { panels: 8, cycle: "reverse" };
const F16: MotionSpec = { panels: 16, cycle: "full" };

describe("🔴 영상 타임라인 — 영상을 만드는 스크립트와 같은 순서", () => {
  // manage-motion-guides.mjs 의 order 식을 그대로 꺼내 실행해 비교한다(한쪽만 바뀌면 자막이 어긋난다).
  const src = readFileSync("tools/media/manage-motion-guides.mjs", "utf8");
  const cycleLine = /const cycle16=[^\n]+;/.exec(src)![0];
  const orderLine = /const order=[^\n]+;/.exec(src)![0];
  const scriptOrder = (panelCount: number, cycle: string) =>
    new Function("panelCount", "spec", `${cycleLine}\n${orderLine}\nreturn order;`)(panelCount, { cycle });

  for (const spec of [R16, R8, F16, { panels: 8, cycle: "full" } as MotionSpec]) {
    it(`${spec.panels}장 · ${spec.cycle}`, () => {
      expect(motionOrder(spec)).toEqual(scriptOrder(spec.panels, spec.cycle));
      // 8초 영상: 16장은 5fps(40프레임), 8장은 2.5fps(20프레임).
      expect(motionOrder(spec)).toHaveLength(spec.panels === 16 ? 40 : 20);
    });
  }
});

describe("재생 시각 → 동작 구간", () => {
  it("16장 되감기: 시작 → 가는 중 → 정점 → 돌아오는 중 → 시작", () => {
    expect(motionPhaseAt(0.1, R16)).toBe("start");
    expect(motionPhaseAt(1.5, R16)).toBe("move");
    expect(motionPhaseAt(3.7, R16)).toBe("peak");
    expect(motionPhaseAt(5.0, R16)).toBe("return");
    expect(motionPhaseAt(7.6, R16)).toBe("start");
  });
  it("8장 되감기", () => {
    expect(motionPhaseAt(0.5, R8)).toBe("start");
    expect(motionPhaseAt(2.0, R8)).toBe("move");
    expect(motionPhaseAt(3.8, R8)).toBe("peak");
    expect(motionPhaseAt(5.0, R8)).toBe("return");
    expect(motionPhaseAt(7.0, R8)).toBe("start");
  });
  it("반복 재생(8초 넘어간 시각)도 같은 구간", () => {
    expect(motionPhaseAt(1.5 + MOTION_SECONDS * 3, R16)).toBe("move");
  });
  it("full 은 한 주기가 가는 중·돌아오는 중을 다 담는다 — 앞 절반 동작, 뒤 절반 돌아오기", () => {
    expect(motionPhaseAt(0.2, F16)).toBe("start");
    expect(motionPhaseAt(1.0, F16)).toBe("move");
    expect(motionPhaseAt(3.0, F16)).toBe("return");
  });
  it("구간 → 자막 칸(준비·동작·돌아오기)", () => {
    expect(slotOfPhase("start")).toBe(0);
    expect(slotOfPhase("move")).toBe(1);
    expect(slotOfPhase("peak")).toBe(2);
    expect(slotOfPhase("return")).toBe(2);
  });
});

describe("영상 사양", () => {
  it("🔴 공개된 ai-v3 영상은 전부 사양이 있다(새 영상을 넣고 build-motion-specs 를 안 돌리면 여기서 걸린다)", () => {
    const manifest = JSON.parse(readFileSync("public/exercise-guides/ai-v3/manifest.json", "utf8")) as string[];
    expect(Object.keys(MOTION_SPECS).sort()).toEqual([...manifest].sort());
  });
  it("주소로 사양 찾기 — 다크 영상도, 다른 영상은 null", () => {
    expect(motionSpecForUrl("/exercise-guides/ai-v3/barbell-back-squat.mp4")).not.toBeNull();
    expect(motionSpecForUrl("/exercise-guides/ai-v3/barbell-back-squat-dark.mp4")).not.toBeNull();
    expect(motionSpecForUrl("/exercise-guides/ai-v2/squat.mp4")).toBeNull();
    expect(motionSpecForUrl("https://youtu.be/abc")).toBeNull();
    expect(motionSpecForUrl(null)).toBeNull();
  });
});

describe("사진 두 장 — 보이는 사진에 맞춘 칸", () => {
  it("시작 사진 구간은 준비, 끝 사진 구간은 동작·돌아오기를 번갈아", () => {
    const c = 2600;
    expect(photoSlotAt(100, c)).toBe(0);
    expect(photoSlotAt(c * 0.6, c)).toBe(1);
    expect(photoSlotAt(c + c * 0.6, c)).toBe(2);
    expect(photoSlotAt(c * 0.97, c)).toBe(0);
  });
});

describe("운동법 문장 다듬기", () => {
  it("🔴 틀 문장 조사 '을(를)' 을 받침으로 고른다", () => {
    expect(cleanMethodText("바벨을(를) 세팅한다.")).toBe("바벨을 세팅한다.");
    expect(cleanMethodText("기구을(를) 세팅한다.")).toBe("기구를 세팅한다.");
    expect(cleanMethodText("케이블을(를) 세팅한다.")).toBe("케이블을 세팅한다.");
    expect(cleanMethodText("이두근로 말아 올리며")).toBe("이두근으로 말아 올리며");
  });
  it("확장 카탈로그 전부 다듬으면 '(를)' 이 남지 않는다", () => {
    for (const byEq of Object.values(EXTRA_METHODS)) {
      for (const steps of Object.values(byEq)) {
        for (const s of steps ?? []) expect(cleanMethodText(s)).not.toMatch(/\((을|를)\)/);
      }
    }
  });
  it("칸에 맞는 줄 — 줄이 모자라면 있는 줄 안에서", () => {
    expect(captionFor(["a", "b", "c"], 1)).toBe("b");
    expect(captionFor(["a"], 2)).toBe("a");
    expect(captionFor([], 0)).toBe("");
  });
});

describe("휴식 카드 한 줄", () => {
  it("다음 세트", () => {
    expect(nextSetHint({ nextSet: 3, totalSets: 4, reps: 12, timed: false, weightKg: 120 })).toBe("세트 3/4 · 12회 · 120kg");
    expect(nextSetHint({ nextSet: 2, totalSets: 3, reps: 45, timed: true, weightKg: null })).toBe("세트 2/3 · 45초 · 맨몸");
  });
  it("🔴 조심 한 줄은 모든 운동에 나온다 — 운동별 주의 사항 우선, 없으면 동작 유형별 초보 팁", () => {
    expect(cautionFor("bench-press")).toContain("견갑");
    for (const id of [...Object.keys(EXERCISES), ...Object.keys(EXTRA_EXERCISES)]) {
      const c = cautionFor(id);
      expect(typeof c === "string" && c.length > 3, id).toBe(true);
    }
  });
});

describe("운동모드 화면 가드", () => {
  const gw = readFileSync("src/features/workout-timer/guided-workout.tsx", "utf8");
  it("영상·사진에 한 줄 자막, 휴식에 다음·조심, 화면 켜짐", () => {
    expect(gw).toContain("<VideoWithCaption");
    expect(gw).toContain("<PhotoWithCaption");
    expect(gw).toContain("motionPhaseAt(t, spec)");
    expect(gw).toMatch(/rest\.trigger\(restSec, \{\s*next: nextSetHint/);
    expect(gw).toContain("다음 운동 · ${upcoming.name}");
    expect(gw).toContain('request("screen")');
  });
});

describe("처음 하는 운동 — 준비 카드(한 줄 코치 2단계)", () => {
  const rec = (exerciseId: string, forDate: string) => ({ exerciseId, forDate });

  it("오늘 전 기록이 없으면 처음, 있으면 해 본 운동", () => {
    expect(isFirstTimeExercise([], "squat", "2026-09-29")).toBe(true);
    expect(isFirstTimeExercise([rec("squat", "2026-09-10")], "squat", "2026-09-29")).toBe(false);
    // 오늘 한 기록만 있으면 여전히 처음(방금 첫 세트를 한 날)
    expect(isFirstTimeExercise([rec("squat", "2026-09-29")], "squat", "2026-09-29")).toBe(true);
    expect(isFirstTimeExercise([rec("bench-press", "2026-09-10")], "squat", "2026-09-29")).toBe(true);
  });

  it("준비 단계: 운동별 준비 단계가 있으면 그것(최대 3개)", () => {
    const steps = introStepsFor("barbell-row", []);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toContain("발 어깨너비");
  });

  it("🔴 모든 운동이 준비 1~3가지를 갖는다(빈 카드 금지)", () => {
    for (const id of [...Object.keys(EXERCISES), ...Object.keys(EXTRA_EXERCISES)]) {
      const steps = introStepsFor(id, ["운동법 첫 줄"]);
      expect(steps.length, id).toBeGreaterThanOrEqual(1);
      expect(steps.length, id).toBeLessThanOrEqual(3);
      for (const s of steps) expect(s.trim().length, id).toBeGreaterThan(2);
    }
  });

  it("화면 가드 — 첫 세트 전·처음·안 넘긴 운동에만, 떠 있는 동안 자막은 숨김", () => {
    const gw = readFileSync("src/features/workout-timer/guided-workout.tsx", "utf8");
    expect(gw).toMatch(/setsDone === 0 &&\s*!introSeen\.has\(item\.exerciseId\)/);
    expect(gw).toMatch(/<ItemVisual\s+item=\{item\}\s+hideCaption=\{showIntro\}/);
    expect(gw).toContain("<IntroCard");
    const te = readFileSync("src/features/routine/components/today-exercises.tsx", "utf8");
    expect(te).toContain("isFirstTimeExercise(doneRecords, p.exerciseId, todayYmd)");
  });
});


it("keeps approved smooth lateral raise captions in sync through the loop and cache-version URL", () => {
  for (const suffix of ["", "-dark"]) {
    const spec = motionSpecForUrl(`/exercise-guides/ai-v3/dumbbell-lateral-raise${suffix}.mp4?v=rigid-2d-v1`)!;
    expect(spec.timing).toBe("smooth");
    expect(motionPhaseAt(0, spec)).toBe("start");
    expect(motionPhaseAt(3.5, spec)).toBe("move");
    expect(motionPhaseAt(4, spec)).toBe("peak");
    expect(motionPhaseAt(7, spec)).toBe("return");
    expect(motionPhaseAt(8, spec)).toBe("start");
    expect(motionPhaseAt(12, spec)).toBe("peak");
  }
});

it("keeps isometric captions in the hold action through every loop phase", () => {
  for (const id of ["hollow-body-hold", "plate-pinch", "stability-ball-plank", "side-plank", "hollow-hold"]) {
    const spec = motionSpecForUrl(`/exercise-guides/ai-v3/${id}.mp4?v=isometric-hold-v1`)!;
    expect(spec.timing).toBe("hold");
    for (const seconds of [0, 1, 3.8, 4, 6, 7.9, 8, 12]) {
      expect(slotOfPhase(motionPhaseAt(seconds, spec))).toBe(1);
    }
  }
});
