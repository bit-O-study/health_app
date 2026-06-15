"use client";

import { useEffect, useRef, useState } from "react";
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
  const [kind, setKind] = useState<RestSoundKind>("voice");
  const [hasCustom, setHasCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setKind(readSoundKind());
    setHasCustom(hasCustomSound());
  }, []);

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

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
          <Bell aria-hidden="true" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
            휴식 종료 알림음
          </p>
          <p className="mt-0.5 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
            휴식이 끝나면 어떤 소리로 알릴지 고릅니다. (위 ‘소리’ 스위치가 켜져
            있을 때 납니다.)
          </p>

          {/* 종류 선택 */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {OPTIONS.map((o) => {
              const active = kind === o.kind;
              return (
                <button
                  key={o.kind}
                  type="button"
                  onClick={() => choose(o.kind)}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-center transition ${
                    active
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-emerald-300"
                  }`}
                >
                  <span
                    className={`text-sm font-bold ${
                      active
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {o.label}
                  </span>
                  <span className="text-[10px] leading-3 text-zinc-500 dark:text-zinc-400">
                    {o.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 업로드 / 미리듣기 */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition hover:bg-zinc-50 dark:hover:bg-zinc-700/50 disabled:opacity-50"
            >
              <Upload aria-hidden="true" size={13} />
              {hasCustom ? "내 소리 변경" : "내 소리 올리기"}
            </button>
            {hasCustom ? (
              <button
                type="button"
                onClick={removeCustom}
                className="inline-flex items-center rounded-full border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
              >
                삭제
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void playRestAlert(ctxRef, kind)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500"
            >
              <Play aria-hidden="true" size={13} />
              미리듣기
            </button>
          </div>

          {err ? (
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
              <Volume2 aria-hidden="true" size={12} />
              {err}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
