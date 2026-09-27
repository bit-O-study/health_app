import { describe, expect, it } from "vitest";

import { EXERCISES } from "@/features/routine/exercise-catalog";
import { EXTRA_EXERCISES } from "@/features/routine/exercise-catalog-extra";
import {
  baseExerciseId,
  iconKeyFor,
  type IconKey,
} from "@/features/exercises/exercise-icon-rules";

// 운동 아이콘 규칙 — 확장 카탈로그(영어 슬러그)도 동작에 맞는 아이콘을 받아야 한다.
// (2026-09-15 제보: "운동탭 운동 로고가 실제 운동에 맞게 안 나온다" — 1,237개가 일반 덤벨이었다.)

const CASES: [string, IconKey][] = [
  // 헷갈리기 쉬운 조합 — 먼저 맞는 규칙이 틀리면 여기서 걸린다.
  ["lying-leg-curl", "LegCurl"],
  ["seated-leg-curl-machine", "SeatedLegCurl"],
  ["slider-hamstring-curl", "LegCurl"],
  ["alternating-dumbbell-curl", "BicepsCurl"],
  ["incline-dumbbell-curl", "InclineCurl"],
  ["incline-dumbbell-bench-press", "InclinePress"],
  ["decline-barbell-bench-press", "DeclinePress"],
  ["barbell-bench-press", "BenchPress"],
  ["close-grip-barbell-bench-press", "CloseGripBench"],
  ["seated-cable-chest-press", "BenchPress"],
  ["technogym-leg-press", "LegPress"],
  ["calf-press-machine", "StandingCalfRaise"],
  ["seated-calf-raise-machine", "SeatedCalfRaise"],
  ["military-press", "Ohp"],
  ["dumbbell-push-press", "Ohp"],
  ["kettlebell-jerk", "Ohp"],
  ["tate-press", "SkullCrusher"],
  ["kneeling-hamstring-stretch", "HamstringStretch"],
  ["piriformis-stretch", "PigeonPose"],
  ["standing-side-bend-stretch", "LatStretch"],
  ["lacrosse-ball-pec-release", "ChestDoorStretch"],
  ["ankle-mobility-drill", "CalfStretch"],
  ["dumbbell-stiff-leg-deadlift", "Rdl"],
  ["single-leg-deadlift", "Rdl"],
  ["sumo-deadlift-high-pull", "UprightRow"],
  ["power-snatch", "Deadlift"],
  ["barbell-bent-over-row", "BarbellRow"],
  ["trx-row", "InvertedRow"],
  ["sled-row", "SeatedCableRow"],
  ["hammer-strength-iso-lateral-row", "SeatedCableRow"],
  ["single-arm-dumbbell-row", "OneArmDumbbellRow"],
  ["snatch-grip-high-pull", "UprightRow"],
  ["assisted-chin-up", "ChinUp"],
  ["tempo-pull-up", "PullUp"],
  ["single-arm-cable-pulldown", "LatPulldown"],
  ["reverse-lunge", "Lunge"],
  ["walking-lunge-dumbbell", "WalkingLunge"],
  ["tempo-bulgarian-split-squat", "BulgarianSplitSquat"],
  ["trx-single-leg-squat", "PistolSquat"],
  ["cossack-squat", "Lunge"],
  ["high-bar-squat", "Squat"],
  ["zercher-squat", "FrontSquat"],
  ["wall-sit", "Squat"],
  ["decline-reverse-crunch", "Crunch"],
  ["abdominal-crunch-machine", "CableCrunch"],
  ["hanging-oblique-raise", "HangingLegRaise"],
  ["weighted-sit-up", "SitUp"],
  ["anti-rotation-hold", "PallofPress"],
  ["single-arm-high-cable-fly", "CableCrossover"],
  ["incline-chest-fly-machine", "PecDeck"],
  ["reverse-pec-deck-machine", "RearDeltFly"],
  ["band-y-raise", "LateralRaise"],
  ["90-degree-external-rotation", "FacePull"],
  ["clap-push-up", "PushUp"],
  ["continuous-box-jump", "JumpingJack"],
  ["medicine-ball-slam", "WoodChopper"],
  ["bear-crawl", "Plank"],
  ["farmer-carry", "Walking"],
  ["kettlebell-halo", "ShoulderCircle"],
  ["multi-hip-machine-extension", "CableKickback"],
  ["incline-cable-triceps-extension", "OverheadTricepsExtension"],
  ["ez-bar-curl-2", "EzBarCurl"],
  // 점검에서 찾은 오판(2026-09-15) — 다시 틀리지 않게 고정.
  ["hand-release-push-up", "PushUp"],
  ["incline-bench-barbell-row", "BarbellRow"],
  ["incline-dumbbell-t-raise", "RearDeltFly"],
  ["trx-y-fly", "RearDeltFly"],
  ["camel-pose", "CobraStretch"],
  // 일반 덤벨로 남아 있던 것 중 동작이 분명한 것.
  ["dumbbell-overhead-extension", "OverheadTricepsExtension"],
  ["single-arm-dumbbell-lying-extension", "SkullCrusher"],
  ["cable-woodchopper", "WoodChopper"],
  ["towel-hang", "DeadHang"],
  ["battle-rope-wave", "JumpRope"],
  ["high-knees", "Running"],
  ["agility-ladder-drill", "Running"],
  ["rope-climb", "PullUp"],
  ["sled-push", "Walking"],
  ["neck-extension", "NeckStretch"],
  ["downward-dog", "ChildPose"],
  ["upward-facing-dog", "CobraStretch"],
  ["seated-forward-fold", "HamstringStretch"],
  ["frog-pump", "GluteBridge"],
  ["glute-drive-machine", "HipThrust"],
  ["technogym-pectoral-machine", "PecDeck"],
  ["dumbbell-step-down", "StepUp"],
  ["dragon-flag", "VUp"],
  ["flutter-kick", "HollowHold"],
  ["hanging-windshield-wiper", "HangingLegRaise"],
];

describe("iconKeyFor — 운동 슬러그 → 가장 가까운 동작 아이콘", () => {
  it.each(CASES)("%s → %s", (id, key) => {
    expect(iconKeyFor(id)).toBe(key);
  });

  it("중복 슬러그 꼬리 숫자를 뗀다", () => {
    expect(baseExerciseId("v-up-2")).toBe("v-up");
    expect(baseExerciseId("bench-dip-2")).toBe("bench-dip");
    expect(baseExerciseId("squat")).toBe("squat");
  });

  it("모르는 운동은 틀린 동작 대신 null(→ 일반 아이콘)", () => {
    expect(iconKeyFor("totally-unknown-move")).toBeNull();
  });
});

describe("카탈로그 전체 불변식", () => {
  const ids = [...new Set([...Object.keys(EXERCISES), ...Object.keys(EXTRA_EXERCISES)])];
  const has = (id: string, w: string) => `-${baseExerciseId(id)}-`.includes(`-${w}-`);

  it("스트레칭·포즈는 근력 동작 아이콘을 받지 않는다", () => {
    const STRETCH_KEYS: IconKey[] = [
      "ChestDoorStretch", "ShoulderCrossStretch", "ChildPose", "CobraStretch", "LatStretch",
      "TricepsOverheadStretch", "BicepsDoorStretch", "WristStretch", "HamstringStretch",
      "PigeonPose", "CalfStretch", "NeckStretch",
    ];
    const bad = ids
      .filter((id) => has(id, "stretch") || has(id, "pose"))
      .filter((id) => !STRETCH_KEYS.includes(iconKeyFor(id) as IconKey));
    expect(bad).toEqual([]);
  });

  it("레그 컬·햄스트링 컬은 이두 컬 아이콘이 아니다", () => {
    const bad = ids
      .filter((id) => (has(id, "leg") || has(id, "hamstring")) && has(id, "curl") && !has(id, "stretch"))
      .filter((id) => !["LegCurl", "SeatedLegCurl"].includes(iconKeyFor(id) ?? ""));
    expect(bad).toEqual([]);
  });

  it("레그 프레스는 레그 프레스 아이콘 — 레그 프레스 머신에서 하는 종아리 운동만 종아리 아이콘", () => {
    const bad = ids
      .filter((id) => has(id, "leg") && has(id, "press"))
      .filter((id) => iconKeyFor(id) !== (has(id, "calf") ? "StandingCalfRaise" : "LegPress"));
    expect(bad).toEqual([]);
  });

  it("스쿼트 이름인데 팔·가슴 아이콘을 받는 운동이 없다", () => {
    const UPPER: IconKey[] = ["BicepsCurl", "BenchPress", "InclinePress", "ChestFly", "LatPulldown", "BarbellRow"];
    const bad = ids.filter((id) => has(id, "squat") && UPPER.includes(iconKeyFor(id) as IconKey));
    expect(bad).toEqual([]);
  });

  it("확장 카탈로그의 대부분(90% 이상)이 일반 덤벨이 아닌 동작 아이콘을 받는다", () => {
    const extra = Object.keys(EXTRA_EXERCISES);
    const matched = extra.filter((id) => iconKeyFor(id) !== null).length;
    expect(matched / extra.length).toBeGreaterThanOrEqual(0.9);
  });
});
