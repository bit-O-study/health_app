"use client";

/**
 * 운동모드 음성 — 브라우저·WebView 의 speechSynthesis(ko-KR)로 짧게 말한다(한 줄 코치 3단계).
 * 지원하지 않거나 막혀 있으면 조용히 넘어간다 — 음성이 안 된다고 운동이 멈추면 안 된다.
 *
 * 런닝 모드의 음성 유틸과 같은 방식이지만 운동모드 전용으로 둔다(두 기능의 설정·배포가 따로 간다).
 */
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
