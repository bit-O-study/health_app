/**
 * 운동모드 음성 코치 — 한 줄 코치 3단계(2026-09-29).
 *
 * 화면을 안 봐도 되게: 세트를 시작할 때 동작 요령 한 줄, 휴식이 끝나기 10초 전에 다음 세트를
 * 읽어 준다. **기본은 꺼짐** — 헬스장에서 갑자기 소리가 나면 당황스럽다(보고서 결정 2).
 * 런닝 모드(기본 켜짐)와 설정을 따로 둔다. 말하기 자체는 런닝의 speak()(ko-KR)를 같이 쓴다.
 *
 * 문장 만드는 부분은 순수 함수 — 단위테스트로 지킨다.
 */

export const WORKOUT_VOICE_KEY = "jimkkun.workout.voice";

/** 켠 적이 있을 때만 켜짐(기본 꺼짐). 저장소를 못 읽으면 꺼짐. */
export function readWorkoutVoice(): boolean {
  try {
    return window.localStorage.getItem(WORKOUT_VOICE_KEY) === "on";
  } catch {
    return false;
  }
}

export function writeWorkoutVoice(on: boolean): void {
  try {
    window.localStorage.setItem(WORKOUT_VOICE_KEY, on ? "on" : "off");
  } catch {
    /* 저장 못 해도 이번 운동에는 적용 */
  }
}

/**
 * 휴식 끝 10초 전 — "3세트째, 12회, 120킬로. 10초 남았어요."
 * 화면 글자("세트 3/4 · 12회 · 120kg")를 그대로 읽히면 "3 슬래시 4", "케이지"로 읽혀서 말로 바꾼다.
 */
export function speechForNextSet(o: {
  nextSet: number;
  totalSets: number;
  reps: number;
  timed: boolean;
  weightKg: number | null;
}): string {
  const last = o.nextSet >= o.totalSets ? "마지막 " : "";
  const reps = o.timed ? `${o.reps}초` : `${o.reps}회`;
  const w = o.weightKg === null ? "맨몸" : `${formatKg(o.weightKg)}킬로`;
  return `${last}${o.nextSet}세트째, ${reps}, ${w}. 10초 남았어요.`;
}

/** 다음 운동으로 넘어가는 휴식 — "다음은 펙덱 플라이. 10초 남았어요." */
export function speechForNextExercise(name: string): string {
  return `다음은 ${name}. 10초 남았어요.`;
}

/** 세트 시작 — 요령 한 줄. 처음 하는 운동이면 준비 첫 단계를 먼저. */
export function speechForSetStart(o: { setNo: number; cue: string | null; introFirst?: string | null }): string {
  if (o.introFirst) return `처음 해 보는 운동이에요. ${o.introFirst}`;
  const head = `${o.setNo}세트.`;
  return o.cue ? `${head} ${o.cue}` : head;
}

/** 세트마다 다른 요령 — 같은 말만 반복하면 안 듣게 된다. */
export function cueForSet(cues: readonly string[], setIndex: number): string | null {
  if (cues.length === 0) return null;
  return cues[((setIndex % cues.length) + cues.length) % cues.length];
}

function formatKg(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : String(Math.round(kg * 10) / 10).replace(".", "점");
}

/**
 * 자극 부위 그림을 앞에서 볼지 뒤에서 볼지 — 뒤쪽 근육(등·엉덩이·햄스트링)이 더 많으면 뒷모습.
 * 예전엔 늘 앞모습이라 등 운동은 작은 그림이 텅 비어 보였다.
 */
const POSTERIOR = new Set(["trapezius", "upper-back", "lower-back", "back-deltoids", "gluteal", "hamstring"]);
const ANTERIOR = new Set(["chest", "obliques", "abs", "biceps", "front-deltoids", "quadriceps"]);

export function bodyViewFor(muscles: readonly string[]): "anterior" | "posterior" {
  let back = 0;
  let front = 0;
  for (const m of muscles) {
    if (POSTERIOR.has(m)) back += 1;
    else if (ANTERIOR.has(m)) front += 1;
  }
  return back > front ? "posterior" : "anterior";
}
