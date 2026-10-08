/**
 * 운동모드 음성 코치 — 한 줄 코치 3단계(2026-09-29).
 *
 * 화면을 안 봐도 되게: 세트를 시작할 때 동작 요령 한 줄, 휴식이 끝나기 10초 전에 다음 세트를
 * 읽어 준다. **기본은 꺼짐** — 헬스장에서 갑자기 소리가 나면 당황스럽다(보고서 결정 2).
 * 런닝 모드(기본 켜짐)와 설정을 따로 둔다. 말하기는 운동모드 전용 speak()(speech.ts, ko-KR) — 런닝 쪽 파일에 기대지 않는다.
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
 * 말로 읽을 수 있게 — 화면용 기호를 말로 바꾼다(2026-10-08).
 * 🔴 요령 문구에 '→'가 120군데 넘게 있어 음성이 "화살표"라고 읽었다. 기호는 쉼표·말로,
 * '3~5초'는 '3에서 5초', 'kg'는 '킬로'. 괄호는 벗기고 내용만 남긴다.
 */
export function speakable(text: string): string {
  return text
    .replace(/(\d+(?:\.\d+)?)\s*kg/gi, "$1킬로")
    .replace(/(\d+)\s*[~∼〜]\s*(\d+)/g, "$1에서 $2")
    .replace(/([가-힣])\s*[~∼〜]\s*([가-힣])/g, "$1에서 $2")
    .replace(/[~∼〜]/g, " ")
    .replace(/(\d+)\s*%/g, "$1퍼센트")
    .replace(/\s*↑/g, " 증가")
    .replace(/\s*↓/g, " 감소")
    .replace(/([가-힣]+)→([가-힣])/g, "$1에서 $2")
    .replace(/\s*[→⇒➜➔>+]\s*/g, ", ")
    .replace(/\s*[·•|/]\s*/g, ", ")
    .replace(/\s*[(（]\s*/g, ", ")
    .replace(/\s*[)）]\s*/g, " ")
    .replace(/[×✕]/g, " ")
    .replace(/\sX(?=\s|$|[,.])/g, " 금지")
    .replace(/[“”"'‘’]/g, "")
    .replace(/\s*,\s*(,\s*)+/g, ", ")
    .replace(/\s+([,.])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .trim();
}

/** 요령 한 줄을 말로 — '—' 뒤 설명은 빼고 핵심만(두괄식). */
function cueSpeech(cue: string): string {
  const head = cue.split(/\s[—–-]\s/)[0];
  const s = speakable(head);
  return /[.!?요다]$/.test(s) ? s : `${s}.`;
}

/** "3세트, 12회 120킬로" — 몇 세트·몇 회·무게를 먼저. */
function setTarget(o: { setNo: number; totalSets?: number; reps?: number | null; timed?: boolean; weightKg?: number | null }): string {
  const last = o.totalSets && o.totalSets > 1 && o.setNo >= o.totalSets ? "마지막 " : "";
  const head = `${last}${o.setNo}세트`;
  if (!o.reps) return head;
  const reps = o.timed ? `${o.reps}초` : `${o.reps}회`;
  const w = o.weightKg == null ? "맨몸" : `${formatKg(o.weightKg)}킬로`;
  return `${head}, ${reps} ${w}`;
}

/**
 * 휴식 끝 10초 전 — 두괄식 "10초 뒤 3세트, 12회 120킬로."
 * 화면 글자("세트 3/4 · 12회 · 120kg")를 그대로 읽히면 "3 슬래시 4", "케이지"로 읽혀서 말로 바꾼다.
 */
export function speechForNextSet(o: {
  nextSet: number;
  totalSets: number;
  reps: number;
  timed: boolean;
  weightKg: number | null;
}): string {
  return `10초 뒤 ${setTarget({ setNo: o.nextSet, totalSets: o.totalSets, reps: o.reps, timed: o.timed, weightKg: o.weightKg })}.`;
}

/** 다음 운동으로 넘어가는 휴식 — "10초 뒤 다음 운동, 펙덱 플라이." */
export function speechForNextExercise(name: string): string {
  return `10초 뒤 다음 운동, ${speakable(name)}.`;
}

/**
 * 세트 시작 — 두괄식: 몇 세트·목표를 먼저, 요령은 한 줄만.
 * "2세트, 12회 60킬로. 무릎은 발끝 방향." / 처음 하는 운동이면 "1세트, 12회 60킬로. 처음이니 준비부터. 등받이에 등 붙이기."
 */
export function speechForSetStart(o: {
  setNo: number;
  cue: string | null;
  introFirst?: string | null;
  totalSets?: number;
  reps?: number | null;
  timed?: boolean;
  weightKg?: number | null;
}): string {
  const head = `${setTarget(o)}.`;
  if (o.introFirst) return `${head} 처음이니 준비부터. ${cueSpeech(o.introFirst)}`;
  return o.cue ? `${head} ${cueSpeech(o.cue)}` : head;
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
