"use client";

/**
 * 휴식 종료 알림음. 세 종류 중 선택:
 *  - "voice"  : 음성으로 "운동 시작하세요" (기본). 비프 대신 사람이 알아듣는 안내.
 *  - "beep"   : 기존 짧은 비프음(삐삐).
 *  - "custom" : 사용자가 설정에서 직접 업로드한 소리(IndexedDB 보관).
 *
 * 종류 선택값은 localStorage, 업로드 파일은 IndexedDB 에 둔다(서버 스키마 변경 없이
 * 기기-로컬로 동작). 재생은 사용자 제스처(운동 시작 탭)로 오디오가 unlock 된 뒤 호출된다.
 */

export type RestSoundKind = "voice" | "beep" | "custom";

const KIND_KEY = "heltch.rest.sound.kind";
const HAS_CUSTOM_KEY = "heltch.rest.sound.hasCustom";
const VOICE_TEXT = "운동 시작하세요";

/** 임의 입력을 유효한 종류로 정규화(순수 — 테스트 가능). 기본 voice. */
export function normalizeSoundKind(raw: unknown): RestSoundKind {
  return raw === "beep" || raw === "custom" || raw === "voice"
    ? raw
    : "voice";
}

export function readSoundKind(): RestSoundKind {
  if (typeof window === "undefined") return "voice";
  try {
    return normalizeSoundKind(window.localStorage.getItem(KIND_KEY));
  } catch {
    return "voice";
  }
}

export function writeSoundKind(kind: RestSoundKind) {
  try {
    window.localStorage.setItem(KIND_KEY, kind);
  } catch {
    /* noop */
  }
}

export function hasCustomSound(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(HAS_CUSTOM_KEY) === "1";
  } catch {
    return false;
  }
}

// ── IndexedDB (custom 사운드 blob 보관) ──────────────────────────────────────
const DB_NAME = "heltch-rest-sound";
const STORE = "sound";
const ENTRY = "custom";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCustomSound(blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, ENTRY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  try {
    window.localStorage.setItem(HAS_CUSTOM_KEY, "1");
  } catch {
    /* noop */
  }
}

export async function loadCustomSound(): Promise<Blob | null> {
  try {
    const db = await openDb();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(ENTRY);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return blob;
  } catch {
    return null;
  }
}

export async function clearCustomSound(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(ENTRY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    /* noop */
  }
  try {
    window.localStorage.removeItem(HAS_CUSTOM_KEY);
  } catch {
    /* noop */
  }
}

// ── 재생 ─────────────────────────────────────────────────────────────────────

/** 짧은 비프 두 번(Web Audio). 제스처로 unlock 된 ctx 재사용. */
export function playBeep(ctxRef: { current: AudioContext | null }) {
  try {
    type WindowWithAudio = Window &
      typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const w = window as WindowWithAudio;
    const AC = window.AudioContext ?? w.webkitAudioContext;
    if (!AC) return;
    if (!ctxRef.current) ctxRef.current = new AC();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") void ctx.resume();
    [0, 0.18].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      const start = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
      osc.start(start);
      osc.stop(start + 0.16);
    });
  } catch {
    /* noop */
  }
}

function speak(text: string): boolean {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return false;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 1;
    synth.cancel();
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}

async function playCustom(): Promise<boolean> {
  const blob = await loadCustomSound();
  if (!blob) return false;
  return new Promise<boolean>((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve(true);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };
      void audio.play().catch(() => {
        URL.revokeObjectURL(url);
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * 선택된 종류로 휴식 종료 알림을 낸다. 종류 생략 시 저장된 설정을 읽는다.
 * 각 종류가 불가하면 자연스럽게 폴백(custom→voice→beep, voice→beep).
 */
export async function playRestAlert(
  ctxRef: { current: AudioContext | null },
  kind: RestSoundKind = readSoundKind(),
) {
  if (kind === "beep") {
    playBeep(ctxRef);
    return;
  }
  if (kind === "custom") {
    const ok = await playCustom();
    if (ok) return;
    // 업로드 소리 재생 실패 → 음성 → 비프 순으로 폴백
  }
  if (!speak(VOICE_TEXT)) {
    playBeep(ctxRef);
  }
}

export { VOICE_TEXT };
