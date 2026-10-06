"use client";

/**
 * 런닝 음성·진동 안내(2026-09-29 런닝 3단계). 브라우저·WebView 의 speechSynthesis(ko-KR)로 짧게 말한다.
 * 지원하지 않거나 막혀 있으면 조용히 넘어간다 — 안내가 안 된다고 달리기가 멈추면 안 된다.
 */
export const VOICE_STORAGE_KEY = "heltch.running.voice";

/** 기본 켜짐(보고서 결정 2). 끈 적이 있으면 'off'. */
export function readVoicePref(): boolean {
  try {
    return localStorage.getItem(VOICE_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeVoicePref(on: boolean): void {
  try {
    localStorage.setItem(VOICE_STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* 저장 못 해도 이번엔 적용 */
  }
}

export function speak(text: string): void {
  if (!text) return;
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return;
    synth.cancel(); // 앞 문장이 밀려 늦게 나오지 않게
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 1.05;
    synth.speak(u);
  } catch {
    /* 음성 안내 실패는 무시 */
  }
}

export function buzz(pattern: number | number[] = 200): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* 진동 미지원 */
  }
}
