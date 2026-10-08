"use client";

import { speakable } from "@/features/workout-timer/workout-voice";

type NativeSpeech = { speak: (options: { text: string }) => Promise<void>; stop: () => Promise<void> };
function nativeSpeech(): NativeSpeech | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: { Plugins?: { WorkoutSpeech?: NativeSpeech } } }).Capacitor?.Plugins?.WorkoutSpeech;
}
let speechGeneration = 0;
export function stopSpeaking(): void {
  speechGeneration += 1;
  try { window.speechSynthesis?.cancel(); } catch { /* unsupported */ }
  void nativeSpeech()?.stop().catch(() => {});
}

/** Native Android TTS first; browser/iPhone speech synthesis otherwise. */
export function speak(raw: string): void {
  // 화면용 기호(→ · ~ kg)를 말로 — 어디서 부르든 "화살표"라고 읽지 않게(2026-10-08).
  const text = speakable(raw);
  if (!text || typeof window === "undefined") return;
  const generation = ++speechGeneration;
  const native = nativeSpeech();
  if (native) { void native.speak({ text }).catch(() => { if (generation === speechGeneration) browserSpeak(text); }); return; }
  browserSpeak(text);
}
function browserSpeak(text: string): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.voice = synth.getVoices().find((v) => v.lang.startsWith("ko")) ?? null;
    utterance.rate = 1.05;
    synth.speak(utterance);
  } catch { /* Coaching text remains visible if audio is unavailable. */ }
}
