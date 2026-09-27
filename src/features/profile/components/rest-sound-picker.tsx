"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Bell, Play, Upload, Volume2 } from "lucide-react";

import {
  clearCustomSound,
  hasCustomSound,
  playRestAlert,
  readSoundKind,
  saveCustomSound,
  writeSoundKind,
  type RestSoundKind,
} from "@/features/workout-timer/rest-sound";

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

const OPTIONS: { kind: RestSoundKind; label: string; desc: string }[] = [
  { kind: "voice", label: "음성", desc: '"운동 시작하세요" 음성 안내' },
  { kind: "beep", label: "비프", desc: "짧은 삐 소리" },
  { kind: "custom", label: "내 소리", desc: "직접 올린 소리" },
];

/**
 * 휴식 종료 알림음 종류 선택 + 사용자 소리 업로드. 기기-로컬 저장(localStorage +
 * IndexedDB)이라 서버 스키마 변경 없이 동작한다. '휴식 종료 소리' 토글이 켜져 있을 때만
 * 실제로 소리가 난다.
 */
export function RestSoundPicker() {
  const storedKind = useSyncExternalStore(subscribeStorage, readSoundKind, () => "voice" as RestSoundKind);
  const storedCustom = useSyncExternalStore(subscribeStorage, hasCustomSound, () => false);
  const [selectedKind, setKind] = useState<RestSoundKind | null>(null);
  const [customOverride, setHasCustom] = useState<boolean | null>(null);
  const kind = selectedKind ?? storedKind;
  const hasCustom = customOverride ?? storedCustom;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);


  function choose(next: RestSoundKind) {
    if (next === "custom" && !hasCustomSound()) {
      fileRef.current?.click();
      return;
    }
    setKind(next);
    writeSoundKind(next);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 다시 선택 가능하게
    if (!file) return;
    setErr(null);
    if (!file.type.startsWith("audio/")) {
      setErr("오디오 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErr("파일이 너무 큽니다(최대 2MB). 짧은 소리를 올려주세요.");
      return;
    }
    setBusy(true);
    try {
      await saveCustomSound(file);
      setHasCustom(true);
      setKind("custom");
      writeSoundKind("custom");
    } catch {
      setErr("저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCustom() {
    await clearCustomSound();
    setHasCustom(false);
    if (kind === "custom") {
      setKind("voice");
      writeSoundKind("voice");
    }
  }

  // 목록 한 줄(아이콘 · 제목 · 미리듣기) 아래 세그먼트 — 설명 문장은 뺐다(2026-09-16 8단계).
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300">
          <Bell aria-hidden="true" size={16} />
        </span>
        <span className="min-w-0 flex-1 truncate text-base text-zinc-900 dark:text-zinc-100">
          휴식 종료 알림음
        </span>
        <button
          type="button"
          onClick={() => void playRestAlert(ctxRef, kind)}
          className="app-press inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2.5 text-xs font-semibold text-brand dark:bg-white/[0.08]"
        >
          <Play aria-hidden="true" size={12} />
          미리듣기
        </button>
      </div>

      <div className="mt-2 pl-10">
        {/* 종류 선택 — 아이폰 세그먼트 */}
        <div className="grid grid-cols-3 gap-1 rounded-[10px] bg-zinc-100 p-0.5 dark:bg-white/[0.08]">
          {OPTIONS.map((o) => {
            const active = kind === o.kind;
            return (
              <button
                key={o.kind}
                type="button"
                onClick={() => choose(o.kind)}
                aria-pressed={active}
                className={`h-7 rounded-lg text-xs font-semibold transition ${
                  active
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        {/* 업로드 / 삭제 */}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={onFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand disabled:opacity-50"
          >
            <Upload aria-hidden="true" size={12} />
            {hasCustom ? "내 소리 변경" : "내 소리 올리기"}
          </button>
          {hasCustom ? (
            <button
              type="button"
              onClick={removeCustom}
              className="text-xs font-semibold text-danger"
            >
              삭제
            </button>
          ) : null}
        </div>

        {err ? (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-danger">
            <Volume2 aria-hidden="true" size={12} />
            {err}
          </p>
        ) : null}
      </div>
    </div>
  );
}
