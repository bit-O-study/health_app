import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  bodyViewFor,
  cueForSet,
  speechForNextExercise,
  speechForNextSet,
  speechForSetStart,
  speakable,
} from "@/features/workout-timer/workout-voice";
import { guideFor } from "@/features/workout-timer/exercise-guides";
import { musclesForExerciseBody } from "@/features/workout-timer/muscle-body-view";

describe("음성 코치 문장 — 화면 글자가 아니라 말로", () => {
  it("다음 세트: '3 슬래시 4'·'케이지' 로 읽히지 않게", () => {
    const t = speechForNextSet({ nextSet: 3, totalSets: 4, reps: 12, timed: false, weightKg: 120 });
    expect(t).toBe("10초 뒤 3세트, 12회 120킬로.");
    expect(t).not.toMatch(/\/|kg/);
  });
  it("마지막 세트·시간 운동·맨몸·소수 무게", () => {
    expect(speechForNextSet({ nextSet: 3, totalSets: 3, reps: 45, timed: true, weightKg: null })).toBe(
      "10초 뒤 마지막 3세트, 45초 맨몸.",
    );
    expect(speechForNextSet({ nextSet: 2, totalSets: 3, reps: 10, timed: false, weightKg: 22.5 })).toContain("22점5킬로");
  });
  it("다음 운동", () => {
    expect(speechForNextExercise("펙덱 플라이")).toBe("10초 뒤 다음 운동, 펙덱 플라이.");
  });
  it("세트 시작 — 두괄식: 몇 세트·몇 회·무게 먼저, 요령은 '—' 앞 핵심만", () => {
    expect(speechForSetStart({ setNo: 2, totalSets: 4, reps: 12, weightKg: 60, cue: "팔꿈치 45도 — 옆구리에서 너무 벌리지 않기" })).toBe(
      "2세트, 12회 60킬로. 팔꿈치 45도.",
    );
    expect(speechForSetStart({ setNo: 4, totalSets: 4, reps: 30, timed: true, weightKg: null, cue: null })).toBe("마지막 4세트, 30초 맨몸.");
    expect(speechForSetStart({ setNo: 1, totalSets: 3, reps: 10, weightKg: 20, cue: "x", introFirst: "등받이에 등 붙이기" })).toBe(
      "1세트, 10회 20킬로. 처음이니 준비부터. 등받이에 등 붙이기.",
    );
    expect(speechForSetStart({ setNo: 1, cue: null })).toBe("1세트.");
  });
  it("🔴 '화살표'라고 읽지 않는다 — 기호를 말로", () => {
    expect(speakable("점프해서 정점 → 천천히 내려옴 (3~5초)")).toBe("점프해서 정점, 천천히 내려옴, 3에서 5초");
    expect(speakable("손바닥을 안→밖으로 돌리며 전면·측면 자극")).toBe("손바닥을 안에서 밖으로 돌리며 전면, 측면 자극");
    expect(speakable("측면 삼각근 개입↑ · 20kg")).toBe("측면 삼각근 개입 증가, 20킬로");
    expect(speakable("정점에서 1초 멈춤 + 둔근 짜내듯")).toBe("정점에서 1초 멈춤, 둔근 짜내듯");
    expect(speakable("머리 뒤로 X")).toBe("머리 뒤로 금지");
  });
  it("🔴 실제 요령 문구 전부 — 음성으로 바꾸면 기호가 하나도 안 남는다", () => {
    const ids = ["bench-press", "squat", "deadlift", "pull-up", "lat-pulldown", "lateral-raise", "arnold-press", "hip-thrust", "dips", "plank", "leg-press", "barbell-row"];
    for (const id of ids) {
      const g = guideFor(id);
      for (const line of [...g.cues, g.setup]) {
        expect(speechForSetStart({ setNo: 1, cue: line })).not.toMatch(/[→↑↓~∼()·+×>/]|kg/);
      }
    }
  });
  it("세트마다 다른 요령(돌아가며)", () => {
    expect(cueForSet(["a", "b", "c"], 0)).toBe("a");
    expect(cueForSet(["a", "b", "c"], 4)).toBe("b");
    expect(cueForSet([], 1)).toBeNull();
  });
});

describe("자극 부위 그림 — 등 운동은 뒷모습", () => {
  it("뒤쪽 근육이 많으면 posterior, 아니면 anterior", () => {
    expect(bodyViewFor(["upper-back", "trapezius", "biceps"])).toBe("posterior");
    expect(bodyViewFor(["chest", "triceps", "front-deltoids"])).toBe("anterior");
    expect(bodyViewFor([])).toBe("anterior");
  });
  it("실제 운동: 바벨 로우·데드리프트는 뒤, 벤치프레스·스쿼트는 앞", () => {
    const v = (id: string, name: string, target: string) => bodyViewFor(musclesForExerciseBody(id, name, target));
    expect(v("barbell-row", "로우", "광배근 · 능형근·이두근")).toBe("posterior");
    expect(v("bench-press", "벤치프레스", "대흉근 · 삼두근·전면삼각근")).toBe("anterior");
  });
});

describe("화면 가드 — 3단계", () => {
  const gw = readFileSync("src/features/workout-timer/guided-workout.tsx", "utf8");
  const rest = readFileSync("src/features/workout-timer/rest-timer.tsx", "utf8");
  const voice = readFileSync("src/features/workout-timer/workout-voice.ts", "utf8");
  it("🔴 음성 코치는 기본 꺼짐", () => {
    expect(voice).toContain('localStorage.getItem(WORKOUT_VOICE_KEY) === "on"');
    expect(gw).toContain("<VoiceToggle");
  });
  it("휴식 10초 전 음성, 꺼져 있으면 문장 자체를 안 넘긴다", () => {
    expect(rest).toContain("remainingSec <= REST_VOICE_LEAD_SEC");
    expect(gw).toMatch(/voice: voiceOn\s*\?\s*speechForNextSet/);
    expect(gw).toContain("voice: voiceOn ? speechForNextExercise(upcoming.name) : null");
  });
  it("🔴 자극 부위·화살표는 미디어 위에만 — 한 줄 자막을 가리지 않는다", () => {
    expect(gw).toMatch(/<ItemVisual\s+item=\{item\}\s+hideCaption=\{showIntro\}\s+overlay=/);
    expect(gw).toMatch(/<div className="relative">\s*<MediaEmbed/);
  });
});
