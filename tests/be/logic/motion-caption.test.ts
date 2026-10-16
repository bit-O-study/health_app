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
  it("alternating arms each complete a four-second lift before switching", () => {
    const spec = { panels: 16, cycle: "reverse", timing: "alternating" } as MotionSpec;
    for (const offset of [-8, -4, 0, 4, 8, 12]) {
      expect(motionPhaseAt(offset + 0.1, spec)).toBe("start");
      expect(motionPhaseAt(offset + 0.5, spec)).toBe("move");
      expect(motionPhaseAt(offset + 2, spec)).toBe("peak");
      expect(motionPhaseAt(offset + 3, spec)).toBe("return");
      expect(motionPhaseAt(offset + 3.9, spec)).toBe("start");
    }
  });
  it("continuous 3D lift captions follow the 3.2/3.68/7.68 second boundaries", () => {
    const spec = { panels: 16, cycle: "reverse", timing: "controlled" } as MotionSpec;
    for (const offset of [-8, 0, 8]) {
      expect(motionPhaseAt(offset, spec)).toBe("start");
      expect(motionPhaseAt(offset + 0.2, spec)).toBe("move");
      expect(motionPhaseAt(offset + 3.3, spec)).toBe("peak");
      expect(motionPhaseAt(offset + 3.8, spec)).toBe("return");
      expect(motionPhaseAt(offset + 7.5, spec)).toBe("return");
      expect(motionPhaseAt(offset + 7.8, spec)).toBe("start");
    }
  });
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
  it("new continuous clips preserve their actual timing when published into the app", () => {
    for (const id of ["seated-dumbbell-curl", "seated-dumbbell-lateral-raise", "plate-curl", "finger-stretch", "seated-dumbbell-shoulder-press", "shoulder-flexion-stretch", "reverse-ez-bar-curl", "seated-arnold-press", "thoracic-rotation", "seated-bent-over-lateral-raise", "fat-grip-curl", "incline-hammer-curl", "kettlebell-hammer-curl", "single-arm-incline-dumbbell-curl", "partial-barbell-curl", "incline-dumbbell-reverse-curl"]) {
      const spec = motionSpecForUrl(`/exercise-guides/ai-v3/${id}.mp4`);
      expect(spec, id).not.toBeNull();
      expect(motionPhaseAt(3.5, spec!), id).toBe("move");
      expect(motionPhaseAt(4, spec!), id).toBe("peak");
    }
    const stretch = motionSpecForUrl("/exercise-guides/ai-v3/standing-side-bend-stretch-dark.mp4");
    expect(stretch).not.toBeNull();
    expect(motionPhaseAt(2.5, stretch!)).toBe("peak");
    expect(motionPhaseAt(5.5, stretch!)).toBe("return");
    const extension = motionSpecForUrl("/exercise-guides/ai-v3/shoulder-extension-stretch-dark.mp4");
    expect(extension).not.toBeNull();
    expect(motionPhaseAt(1, extension!)).toBe("move");
    expect(motionPhaseAt(3, extension!)).toBe("peak");
    expect(motionPhaseAt(6, extension!)).toBe("return");
    expect(motionPhaseAt(7.5, extension!)).toBe("start");
    const back = motionSpecForUrl("/exercise-guides/ai-v3/standing-back-extension-stretch.mp4");
    expect(back).not.toBeNull();
    expect(motionPhaseAt(1, back!)).toBe("move");
    expect(motionPhaseAt(3, back!)).toBe("peak");
    expect(motionPhaseAt(6, back!)).toBe("return");
    expect(motionPhaseAt(7.5, back!)).toBe("start");
    const neckHold = motionSpecForUrl("/exercise-guides/ai-v3/neck-isometric-hold.mp4");
    expect(neckHold).not.toBeNull();
    for (const time of [0, 1, 3, 6, 7.5]) expect(motionPhaseAt(time, neckHold!)).toBe("move");
    const curlHold = motionSpecForUrl("/exercise-guides/ai-v3/isometric-curl-hold-dark.mp4");
    expect(curlHold).not.toBeNull();
    for (const time of [0, 1, 3, 6, 7.5]) expect(motionPhaseAt(time, curlHold!)).toBe("move");
    const seatedSide = motionSpecForUrl("/exercise-guides/ai-v3/seated-side-stretch.mp4");
    expect(seatedSide).not.toBeNull();
    expect(motionPhaseAt(1, seatedSide!)).toBe("move");
    expect(motionPhaseAt(3, seatedSide!)).toBe("peak");
    expect(motionPhaseAt(6, seatedSide!)).toBe("return");
    expect(motionPhaseAt(7.5, seatedSide!)).toBe("start");
    const seatedRotation = motionSpecForUrl("/exercise-guides/ai-v3/seated-thoracic-rotation.mp4");
    expect(seatedRotation?.timing).toBe("stretch");
    expect(motionPhaseAt(3, seatedRotation!)).toBe("peak");
    expect(motionPhaseAt(6, seatedRotation!)).toBe("return");
    const closeCurl = motionSpecForUrl("/exercise-guides/ai-v3/close-grip-ez-bar-curl.mp4");
    expect(closeCurl?.timing).toBe("smooth");
    expect(motionPhaseAt(4, closeCurl!)).toBe("peak");
    const alternating = motionSpecForUrl("/exercise-guides/ai-v3/alternating-incline-dumbbell-curl-dark.mp4");
    expect(alternating?.timing).toBe("alternating");
    for (const time of [2, 6]) expect(motionPhaseAt(time, alternating!)).toBe("peak");
    for (const time of [3, 7]) expect(motionPhaseAt(time, alternating!)).toBe("return");
    for (const id of ["seated-dumbbell-shrug", "big-toe-extension", "cable-reverse-curl", "partial-lateral-raise", "seated-single-arm-dumbbell-shoulder-press", "cable-ez-bar-curl", "dumbbell-seesaw-press", "single-arm-cable-curl", "incline-dumbbell-triceps-extension", "cable-rope-curl"]) {
      const spec = motionSpecForUrl(`/exercise-guides/ai-v3/${id}.mp4`);
      expect(spec?.timing).toBe("smooth");
      expect(motionPhaseAt(3.5, spec!)).toBe("move");
      expect(motionPhaseAt(4, spec!)).toBe("peak");
    }
    const lateralHold = motionSpecForUrl("/exercise-guides/ai-v3/isometric-lateral-raise-hold-dark.mp4");
    expect(lateralHold?.timing).toBe("hold");
    for (const time of [0, 1, 3, 6, 7.5]) expect(motionPhaseAt(time, lateralHold!)).toBe("move");
    const doming = motionSpecForUrl("/exercise-guides/ai-v3/foot-arch-doming.mp4");
    expect(doming?.timing).toBe("stretch");
    expect(motionPhaseAt(3, doming!)).toBe("peak");
    expect(motionPhaseAt(6, doming!)).toBe("return");
    const toeTap = motionSpecForUrl("/exercise-guides/ai-v3/toe-tap-dark.mp4");
    expect(toeTap?.timing).toBe("alternating");
    for (const time of [2, 6]) expect(motionPhaseAt(time, toeTap!)).toBe("peak");
    for (const time of [3, 7]) expect(motionPhaseAt(time, toeTap!)).toBe("return");
    for (const id of ["neutral-grip-incline-dumbbell-press", "wide-grip-cable-curl", "cable-wrist-curl", "dumbbell-6-way-raise", "cable-drag-curl", "dumbbell-rear-delt-row", "high-cable-curl", "dumbbell-external-rotation"]) {
      const spec = motionSpecForUrl(`/exercise-guides/ai-v3/${id}.mp4`);
      expect(spec?.timing).toBe("smooth");
      expect(motionPhaseAt(4, spec!)).toBe("peak");
    }
    const scalene = motionSpecForUrl("/exercise-guides/ai-v3/scalene-neck-stretch.mp4");
    expect(scalene?.timing).toBe("stretch");
    expect(motionPhaseAt(3, scalene!)).toBe("peak");
    const prayer = motionSpecForUrl("/exercise-guides/ai-v3/prayer-stretch-dark.mp4");
    expect(prayer?.timing).toBe("stretch");
    expect(motionPhaseAt(3, prayer!)).toBe("peak");
    expect(motionPhaseAt(6, prayer!)).toBe("return");
    const reversePrayer = motionSpecForUrl("/exercise-guides/ai-v3/reverse-prayer-stretch.mp4");
    expect(reversePrayer?.timing).toBe("stretch");
    expect(motionPhaseAt(3, reversePrayer!)).toBe("peak");
    const levator = motionSpecForUrl("/exercise-guides/ai-v3/levator-scapulae-stretch.mp4");
    expect(levator?.timing).toBe("stretch");
    expect(motionPhaseAt(3, levator!)).toBe("peak");
    for (const id of ["cuban-press", "band-hammer-curl", "ez-bar-reverse-curl", "dumbbell-lying-triceps-extension", "kettlebell-biceps-curl", "neutral-grip-dumbbell-press", "single-rope-cable-curl"]) {
      const spec = motionSpecForUrl(`/exercise-guides/ai-v3/${id}-dark.mp4`);
      expect(spec?.timing).toBe("smooth");
      expect(motionPhaseAt(4, spec!)).toBe("peak");
    }
    for (const id of ["pronated-dumbbell-curl", "dumbbell-wrist-extension"]) {
      const spec = motionSpecForUrl(`/exercise-guides/ai-v3/${id}.mp4`);
      expect(spec?.timing).toBe("controlled");
      expect(motionPhaseAt(3.4, spec!)).toBe("peak");
      expect(motionPhaseAt(4, spec!)).toBe("return");
    }
    const reversePress = motionSpecForUrl("/exercise-guides/ai-v3/reverse-grip-dumbbell-press.mp4");
    for (const id of ["single-arm-dumbbell-bench-press", "behind-the-back-cable-curl", "seated-band-pull-apart", "dumbbell-preacher-curl", "seated-barbell-overhead-press", "seated-overhead-barbell-extension", "single-arm-dumbbell-lying-extension", "single-arm-preacher-curl", "dumbbell-jm-press", "ez-bar-preacher-curl", "reverse-preacher-curl", "barbell-pullover", "standing-cable-curl", "dumbbell-side-bend", "wide-grip-preacher-curl", "cable-preacher-curl", "dumbbell-z-press", "z-press", "plate-loaded-preacher-curl"]) {
      const spec = motionSpecForUrl(`/exercise-guides/ai-v3/${id}.mp4`);
      expect(spec?.timing).toBe("smooth");
      expect(motionPhaseAt(4, spec!)).toBe("peak");
    }
    const glute = motionSpecForUrl("/exercise-guides/ai-v3/seated-glute-stretch.mp4");
    const itBand = motionSpecForUrl("/exercise-guides/ai-v3/standing-it-band-stretch-dark.mp4");
    expect(itBand?.timing).toBe("stretch");
    expect(motionPhaseAt(3, itBand!)).toBe("peak");
    expect(motionPhaseAt(6, itBand!)).toBe("return");
    const standingHamstring = motionSpecForUrl("/exercise-guides/ai-v3/standing-hamstring-stretch.mp4");
    expect(standingHamstring?.timing).toBe("stretch");
    expect(motionPhaseAt(3, standingHamstring!)).toBe("peak");
    const ankleMobility = motionSpecForUrl("/exercise-guides/ai-v3/ankle-mobility-drill-dark.mp4");
    expect(ankleMobility?.timing).toBe("stretch");
    expect(motionPhaseAt(3, ankleMobility!)).toBe("peak");
    const bicepsStretch = motionSpecForUrl("/exercise-guides/ai-v3/biceps-stretch.mp4");
    expect(bicepsStretch?.timing).toBe("stretch");
    expect(motionPhaseAt(3, bicepsStretch!)).toBe("peak");
    const latStretch = motionSpecForUrl("/exercise-guides/ai-v3/lat-stretch-dark.mp4");
    for (const id of ["quadruped-hip-extension", "cable-spider-curl", "smith-machine-close-grip-bench-press", "barbell-spider-curl", "smith-machine-incline-press", "incline-close-grip-bench-press", "cable-lying-triceps-extension", "reverse-grip-incline-press", "wall-slide", "close-grip-floor-press", "bar-cable-overhead-triceps-extension", "dumbbell-floor-fly", "wide-grip-cable-pushdown", "close-grip-pushdown", "close-grip-dumbbell-floor-press", "single-arm-dumbbell-floor-press", "reverse-grip-ez-pushdown", "dumbbell-floor-press", "ez-bar-cable-pushdown", "single-arm-cable-pushdown", "underhand-barbell-row", "v-bar-pushdown", "triceps-pushdown", "wide-grip-barbell-row", "cable-bar-incline-curl", "incline-cable-curl", "wide-grip-incline-bench-press", "reverse-grip-bench-press", "jm-press", "machine-hammer-curl", "single-arm-machine-curl", "wide-grip-bench-press", "larsen-press", "dumbbell-bench-press", "barbell-overhead-press", "dumbbell-fly", "kettlebell-concentration-curl", "cable-concentration-curl", "machine-preacher-curl", "machine-biceps-curl"]) {
      for (const suffix of ["", "-dark"]) {
        const spec = motionSpecForUrl(`/exercise-guides/ai-v3/${id}${suffix}.mp4`);
        expect(spec?.timing).toBe("smooth");
        expect(motionPhaseAt(4, spec!)).toBe("peak");
      }
    }
    for (const id of ["smith-machine-wide-grip-bench-press", "kettlebell-triceps-extension", "incline-cable-triceps-extension", "spoto-press", "hip-circle", "pause-bench-press", "tempo-bench-press", "leg-swing", "lateral-leg-swing"]) {
      for (const suffix of ["", "-dark"]) {
        const spec = motionSpecForUrl(`/exercise-guides/ai-v3/${id}${suffix}.mp4`);
        expect(spec?.timing).toBe("continuous");
        for (const time of [0, 2, 3.5, 6, 7.5]) expect(motionPhaseAt(time, spec!)).toBe("move");
      }
    }
    for (const suffix of ["", "-dark"]) {
      const finger = motionSpecForUrl(`/exercise-guides/ai-v3/finger-extension-stretch${suffix}.mp4`);
      expect(finger?.timing).toBe("stretch");
      expect(motionPhaseAt(3, finger!)).toBe("peak");
    }
    const wristFlexor = motionSpecForUrl("/exercise-guides/ai-v3/wrist-flexor-stretch.mp4");
    expect(wristFlexor?.timing).toBe("stretch");
    expect(motionPhaseAt(3, wristFlexor!)).toBe("peak");
    for (const suffix of ["", "-dark"]) {
      const neckCars = motionSpecForUrl(`/exercise-guides/ai-v3/neck-cars${suffix}.mp4`);
      expect(neckCars?.timing).toBe("continuous");
      for (const time of [0, 2, 4, 6, 7.9]) expect(motionPhaseAt(time, neckCars!)).toBe("move");
    }
    for (const suffix of ["", "-dark"]) {
      const barbellPush = motionSpecForUrl(`/exercise-guides/ai-v3/push-press${suffix}.mp4`);
      expect(barbellPush?.timing).toBe("continuous");
      for (const time of [0, 1, 1.7, 2.2, 3, 5, 7.5]) expect(motionPhaseAt(time, barbellPush!)).toBe("move");
    }
    for (const suffix of ["", "-dark"]) {
      const singleOverhead = motionSpecForUrl(`/exercise-guides/ai-v3/single-arm-cable-overhead-extension${suffix}.mp4`);
      expect(singleOverhead?.timing).toBe("continuous");
      for (const time of [0, 1, 3, 4, 6, 7.9]) expect(motionPhaseAt(time, singleOverhead!)).toBe("move");
    }
    for (const suffix of ["", "-dark"]) {
      const sphinx = motionSpecForUrl(`/exercise-guides/ai-v3/sphinx-stretch${suffix}.mp4`);
      expect(sphinx?.timing).toBe("stretch");
      expect(motionPhaseAt(3, sphinx!)).toBe("peak");
      expect(motionPhaseAt(6, sphinx!)).toBe("return");
    }
    for (const suffix of ["", "-dark"]) {
      const cobra = motionSpecForUrl(`/exercise-guides/ai-v3/cobra-stretch${suffix}.mp4`);
      expect(cobra?.timing).toBe("stretch");
      expect(motionPhaseAt(3, cobra!)).toBe("peak");
      expect(motionPhaseAt(6, cobra!)).toBe("return");
    }
    for (const suffix of ["", "-dark"]) {
      const kneeling = motionSpecForUrl(`/exercise-guides/ai-v3/kneeling-hamstring-stretch${suffix}.mp4`);
      expect(kneeling?.timing).toBe("stretch");
      expect(motionPhaseAt(3, kneeling!)).toBe("peak");
      expect(motionPhaseAt(6, kneeling!)).toBe("return");
    }
    for (const suffix of ["", "-dark"]) {
      const hipFlexor = motionSpecForUrl(`/exercise-guides/ai-v3/kneeling-hip-flexor-stretch${suffix}.mp4`);
      expect(hipFlexor?.timing).toBe("stretch");
      expect(motionPhaseAt(3, hipFlexor!)).toBe("peak");
      expect(motionPhaseAt(6, hipFlexor!)).toBe("return");
    }
    const pushPress = motionSpecForUrl("/exercise-guides/ai-v3/dumbbell-push-press-dark.mp4");
    expect(pushPress?.timing).toBe("continuous");
    for (const time of [0, 1, 1.7, 2.2, 3, 5, 7.5]) expect(motionPhaseAt(time, pushPress!)).toBe("move");
    const dynamicHamstring = motionSpecForUrl("/exercise-guides/ai-v3/dynamic-hamstring-stretch-dark.mp4");
    expect(dynamicHamstring?.timing).toBe("continuous");
    for (const time of [0, 1, 2, 3, 4, 6, 7.5]) expect(motionPhaseAt(time, dynamicHamstring!)).toBe("move");
    const dynamicCalf = motionSpecForUrl("/exercise-guides/ai-v3/dynamic-calf-stretch-dark.mp4");
    expect(dynamicCalf?.timing).toBe("continuous");
    for (const time of [0, 1, 2, 3, 4, 6, 7.5]) expect(motionPhaseAt(time, dynamicCalf!)).toBe("move");
    const upperTrap = motionSpecForUrl("/exercise-guides/ai-v3/upper-trap-stretch.mp4");
    expect(upperTrap?.timing).toBe("stretch");
    expect(motionPhaseAt(3, upperTrap!)).toBe("peak");
    const wristExtensor = motionSpecForUrl("/exercise-guides/ai-v3/wrist-extensor-stretch.mp4");
    expect(wristExtensor?.timing).toBe("stretch");
    expect(motionPhaseAt(3, wristExtensor!)).toBe("peak");
    const stepCalf = motionSpecForUrl("/exercise-guides/ai-v3/step-calf-stretch.mp4");
    expect(stepCalf?.timing).toBe("stretch");
    expect(motionPhaseAt(3, stepCalf!)).toBe("peak");
    const quad = motionSpecForUrl("/exercise-guides/ai-v3/standing-quad-stretch.mp4");
    expect(quad?.timing).toBe("stretch");
    expect(motionPhaseAt(3, quad!)).toBe("peak");
    const doorway = motionSpecForUrl("/exercise-guides/ai-v3/doorway-chest-stretch.mp4");
    expect(doorway?.timing).toBe("stretch");
    expect(motionPhaseAt(3, doorway!)).toBe("peak");
    const corner = motionSpecForUrl("/exercise-guides/ai-v3/corner-pec-stretch-dark.mp4");
    expect(corner?.timing).toBe("stretch");
    expect(motionPhaseAt(3, corner!)).toBe("peak");
    expect(latStretch?.timing).toBe("stretch");
    expect(motionPhaseAt(3, latStretch!)).toBe("peak");
    for (const [alias, source] of [["seated-leg-curl", "seated-leg-curl-2"], ["close-grip-bench-press", "close-grip-bench-press-2"], ["cossack-squat-2", "cossack-squat"]]) {
      const aliasSpec = motionSpecForUrl(`/exercise-guides/ai-v3/${alias}.mp4`);
      const sourceSpec = motionSpecForUrl(`/exercise-guides/ai-v3/${source}.mp4`);
      expect(aliasSpec).not.toBeNull();
      expect(sourceSpec).not.toBeNull();
      for (const t of [0, 1, 3, 4, 6, 7.5]) expect(motionPhaseAt(t, aliasSpec!)).toBe(motionPhaseAt(t, sourceSpec!));
    }
    expect(glute?.timing).toBe("stretch");
    expect(motionPhaseAt(3, glute!)).toBe("peak");
    expect(reversePress?.timing).toBe("continuous");
    expect(motionPhaseAt(4, reversePress!)).toBe("move");
    const hamstring = motionSpecForUrl("/exercise-guides/ai-v3/seated-hamstring-stretch.mp4");
    expect(hamstring?.timing).toBe("stretch");
    expect(motionPhaseAt(3, hamstring!)).toBe("peak");
    const tempo = motionSpecForUrl("/exercise-guides/ai-v3/tempo-lateral-raise.mp4");
    const tempoCurl = motionSpecForUrl("/exercise-guides/ai-v3/tempo-curl-dark.mp4");
    expect(tempoCurl?.timing).toBe("continuous");
    for (const t of [0, 1, 3, 4, 5, 7.5]) expect(motionPhaseAt(t, tempoCurl!)).toBe("move");
    expect(tempo?.timing).toBe("continuous");
    for (const time of [0, 2, 3.5, 6, 7.5]) expect(motionPhaseAt(time, tempo!)).toBe("move");
    const ankleRock = motionSpecForUrl("/exercise-guides/ai-v3/ankle-rock.mp4");
    expect(ankleRock?.timing).toBe("continuous");
    for (const time of [0, 1, 3, 6, 7.5]) expect(motionPhaseAt(time, ankleRock!)).toBe("move");
  });
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

it("keeps continuous circles on the movement instruction across every frame and loop boundary", () => {
  const spec: MotionSpec = { panels: 16, cycle: "full", timing: "continuous" };
  const steps = ["prepare", "circle forward", "return"];
  for (let frame = -192; frame <= 384; frame++) {
    const phase = motionPhaseAt(frame / 24, spec);
    expect(phase, String(frame)).toBe("move");
    expect(captionFor(steps, slotOfPhase(phase))).toBe("circle forward");
  }
});

it("matches the neck clip's two-second movement, three-second hold and controlled return", () => {
  const spec: MotionSpec = { panels: 16, cycle: "reverse", timing: "stretch" };
  for (const offset of [-8, 0, 8]) {
    expect(motionPhaseAt(offset, spec)).toBe("start");
    expect(motionPhaseAt(offset + 0.1, spec)).toBe("move");
    expect(motionPhaseAt(offset + 1, spec)).toBe("move");
    expect(motionPhaseAt(offset + 2, spec)).toBe("peak");
    expect(motionPhaseAt(offset + 4.9, spec)).toBe("peak");
    expect(motionPhaseAt(offset + 5, spec)).toBe("return");
    expect(motionPhaseAt(offset + 6.5, spec)).toBe("return");
    expect(motionPhaseAt(offset + 7, spec)).toBe("start");
  }
});
