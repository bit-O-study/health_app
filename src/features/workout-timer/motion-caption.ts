/**
 * 운동모드 '영상에 맞춘 한 줄 자막' — 순수 로직(2026-09-29 한 줄 코치 1단계).
 *
 * AI 동작 영상(ai-v3)은 포즈 패널을 정해진 순서로 이어 붙인 **정확히 8초** 영상이다
 * (tools/media/manage-motion-guides.mjs). 그래서 재생 시각만 알면 지금 화면의 동작이
 * 시작 자세 / 가는 중 / 정점 / 돌아오는 중 중 어디인지 정확히 계산된다.
 * 그 구간에 맞는 운동법 한 줄을 보여 준다 — 영상은 그대로, 설명만 동작을 따라간다.
 *
 * 자막은 운동법 3단계(준비 → 동작 → 정점·돌아오기)를 구간에 대응시킨다.
 * 영상 사양은 `motion-specs.json`(tools/media/build-motion-specs.mjs 로 생성).
 */

import MOTION_SPECS from "@/features/workout-timer/motion-specs.json";

export type MotionSpec = { panels: 8 | 16; cycle: "reverse" | "full"; timing?: "smooth" | "hold" };
export type MotionPhase = "start" | "move" | "peak" | "return";
/** 자막 칸 — 0 준비(시작 자세) · 1 동작 · 2 정점·돌아오기. */
export type CaptionSlot = 0 | 1 | 2;

/** 영상 길이(초) — 모든 ai-v3 영상 공통. */
export const MOTION_SECONDS = 8;

const specs = MOTION_SPECS as Record<string, MotionSpec>;

/** 이 영상 주소가 사양을 아는 ai-v3 영상이면 그 사양. 아니면 null(시간 기반 자막). */
export function motionSpecForUrl(url: string | null | undefined): MotionSpec | null {
  const m = url ? /\/exercise-guides\/ai-v3\/([a-z0-9-]+?)(?:-dark)?\.mp4$/.exec(url.split(/[?#]/)[0]) : null;
  return m ? specs[m[1]] ?? null : null;
}

/** 패널 재생 순서 — manage-motion-guides.mjs 의 order 와 **같아야** 한다(테스트가 지킨다). */
export function motionOrder(spec: MotionSpec): number[] {
  const range = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => f(i));
  if (spec.panels === 16) {
    const cycle16 = [0, 0, 0, ...range(15, (i) => i + 1), 15, 15];
    return spec.cycle === "full"
      ? [...cycle16, ...cycle16]
      : [0, 0, ...range(16, (i) => i), 15, 15, ...range(16, (i) => 15 - i), 0, 0, 0, 0];
  }
  return spec.cycle === "full"
    ? [0, 0, 1, 2, 3, 4, 5, 6, 7, 7, 0, 0, 1, 2, 3, 4, 5, 6, 7, 7]
    : [0, 0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0];
}

/** 재생 시각(초) → 지금 동작 구간. 영상이 반복되므로 8초로 나눈 나머지를 본다. */
export function motionPhaseAt(seconds: number, spec: MotionSpec): MotionPhase {
  const t = ((seconds % MOTION_SECONDS) + MOTION_SECONDS) % MOTION_SECONDS;
  if (spec.timing === "hold") return "move";
  if (spec.timing === "smooth") {
    if (t < 0.4 || t >= 7.6) return "start";
    if (t >= 3.8 && t <= 4.2) return "peak";
    return t < 4 ? "move" : "return";
  }
  const order = motionOrder(spec);
  const k = Math.min(order.length - 1, Math.floor((t / MOTION_SECONDS) * order.length));
  const p = order[k];
  const last = spec.panels - 1;
  if (p === 0) return "start";
  if (spec.cycle === "full") {
    // full 은 패널 한 벌이 '시작→끝→시작 직전' 한 주기 — 앞 절반은 가는 중, 뒤 절반은 돌아오는 중.
    return p <= last / 2 ? "move" : "return";
  }
  if (p === last) return "peak";
  return k > 0 && order[k - 1] > p ? "return" : "move";
}

export function slotOfPhase(phase: MotionPhase): CaptionSlot {
  return phase === "start" ? 0 : phase === "move" ? 1 : 2;
}

/** 칸 이름 — 자막 앞 작은 말머리. */
export const SLOT_LABEL: Record<CaptionSlot, string> = { 0: "준비", 1: "동작", 2: "돌아오기" };

/**
 * 사진 두 장(시작·끝) 교차 재생 — 몇 번째 사진이 보이는지로 자막 칸을 정한다.
 * CSS(ex-photo-a/b): 0~44% 는 시작 사진, 44~94% 는 끝 사진. 끝 사진 칸은 한 번은 '동작',
 * 다음 번은 '돌아오기' 로 번갈아 운동법 세 줄을 모두 보여 준다.
 */
export function photoSlotAt(elapsedMs: number, cycleMs: number): CaptionSlot {
  const cycle = Math.floor(elapsedMs / cycleMs);
  const f = (elapsedMs % cycleMs) / cycleMs;
  if (f < 0.44 || f >= 0.94) return 0;
  return cycle % 2 === 0 ? 1 : 2;
}

/**
 * 운동법 문장 다듬기 — 확장 카탈로그 1,237개는 틀 문장이라 조사가 "바벨을(를)" 처럼 남아 있다.
 * 앞 글자의 받침으로 을/를 을 고른다. 근육 이름 뒤 "로" 는 받침이 있으면 "으로"(이두근로 → 이두근으로).
 */
export function cleanMethodText(s: string): string {
  // 받침이 있으면 "을". 영문·숫자는 한국어로 읽은 끝소리로(TRX=엑스 → 를, EZ바 는 한글이라 위 규칙).
  const hasBatchim = (ch: string) => {
    const c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 !== 0;
    if (/[lmnrLMNR]/.test(ch)) return true; // 엘·엠·엔·알
    if (/[013678]/.test(ch)) return true; // 영·일·삼·육·칠·팔
    return false;
  };
  const pick = (_: string, ch: string) => `${ch}${hasBatchim(ch) ? "을" : "를"}`;
  return s
    .replace(/([가-힣A-Za-z0-9])\s?을\(를\)/g, pick)
    .replace(/([가-힣A-Za-z0-9])\s?를\(을\)/g, pick)
    .replace(/근로(?=\s)/g, "근으로");
}

/** 칸에 맞는 한 줄. 운동법이 3줄보다 적으면 있는 줄 안에서 고른다. 없으면 빈 문자열. */
export function captionFor(steps: readonly string[], slot: CaptionSlot): string {
  if (steps.length === 0) return "";
  return steps[Math.min(slot, steps.length - 1)];
}

/** 휴식 카드의 '다음' 한 줄 — 같은 운동 다음 세트. */
export function nextSetHint(o: {
  nextSet: number;
  totalSets: number;
  reps: number;
  timed: boolean;
  weightKg: number | null;
}): string {
  const reps = o.timed ? `${o.reps}초` : `${o.reps}회`;
  const w = o.weightKg === null ? "맨몸" : `${o.weightKg}kg`;
  return `세트 ${o.nextSet}/${o.totalSets} · ${reps} · ${w}`;
}
