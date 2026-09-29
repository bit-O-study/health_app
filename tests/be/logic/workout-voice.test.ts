import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  bodyViewFor,
  cueForSet,
  speechForNextExercise,
  speechForNextSet,
  speechForSetStart,
} from "@/features/workout-timer/workout-voice";
import { musclesForExerciseBody } from "@/features/workout-timer/muscle-body-view";

describe("음성 코치 문장 — 화면 글자가 아니라 말로", () => {
  it("다음 세트: '3 슬래시 4'·'케이지' 로 읽히지 않게", () => {
    const t = speechForNextSet({ nextSet: 3, totalSets: 4, reps: 12, timed: false, weightKg: 120 });
    expect(t).toBe("3세트째, 12회, 120킬로. 10초 남았어요.");
    expect(t).not.toMatch(/\/|kg/);
  });
  it("마지막 세트·시간 운동·맨몸·소수 무게", () => {
    expect(speechForNextSet({ nextSet: 3, totalSets: 3, reps: 45, timed: true, weightKg: null })).toBe(
      "마지막 3세트째, 45초, 맨몸. 10초 남았어요.",
    );
    expect(speechForNextSet({ nextSet: 2, totalSets: 3, reps: 10, timed: false, weightKg: 22.5 })).toContain("22점5킬로");
  });
  it("다음 운동", () => {
    expect(speechForNextExercise("펙덱 플라이")).toBe("다음은 펙덱 플라이. 10초 남았어요.");
  });
  it("세트 시작: 요령 한 줄, 처음 하는 운동이면 준비 첫 단계", () => {
    expect(speechForSetStart({ setNo: 2, cue: "무릎은 발끝 방향" })).toBe("2세트. 무릎은 발끝 방향");
    expect(speechForSetStart({ setNo: 1, cue: "x", introFirst: "등받이에 등 붙이기" })).toBe(
      "처음 해 보는 운동이에요. 등받이에 등 붙이기",
    );
    expect(speechForSetStart({ setNo: 1, cue: null })).toBe("1세트.");
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
