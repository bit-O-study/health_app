"use client";

import { useEffect, useState } from "react";

import { RunningGame } from "@/features/running/running-game";
import { ZenRun } from "@/features/running/zen-run";

/** 휴대폰(터치 + 좁은 화면 / 모바일 UA)에서만 런닝 모드를 띄운다. */
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua);
  const touch = (navigator.maxTouchPoints ?? 0) > 0 || "ontouchstart" in window;
  const narrow = Math.min(window.innerWidth, window.innerHeight) <= 820;
  return mobileUa || (touch && narrow);
}

type Mode = "camera" | "zen";

export function RunningMobileGate() {
  const [state, setState] = useState<"checking" | "ok" | "desktop">("checking");
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    setState(isMobileDevice() ? "ok" : "desktop");
  }, []);

  if (state === "checking") {
    return <div className="h-[100dvh] w-full bg-zinc-950" />;
  }

  if (state === "desktop") {
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-white">
        <span className="text-5xl">📱</span>
        <h1 className="text-2xl font-extrabold">런닝 모드는 휴대폰 전용입니다</h1>
        <p className="max-w-xs text-sm leading-6 text-zinc-400">
          움직임을 인식해 달리는 게임이라, 휴대폰에서
          <br />
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-emerald-300">
            /running
          </code>{" "}
          으로 접속해 주세요.
        </p>
      </div>
    );
  }

  if (mode === "camera") return <RunningGame />;
  if (mode === "zen") return <ZenRun />;

  // 모드 선택 화면
  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-zinc-950 to-zinc-900 px-6 text-center text-white">
      <div>
        <h1 className="text-3xl font-extrabold">런닝 모드</h1>
        <p className="mt-2 text-sm text-zinc-400">원하는 모드를 골라주세요</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={() => setMode("camera")}
          className="flex items-center gap-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-left transition active:scale-[0.98]"
        >
          <span className="text-4xl">🏃</span>
          <span className="min-w-0">
            <span className="block text-lg font-extrabold">카메라 런닝</span>
            <span className="block text-xs text-zinc-400">
              카메라로 머리 움직임을 인식해 달리는 게임
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMode("zen")}
          className="flex items-center gap-4 rounded-2xl border border-lime-400/40 bg-lime-400/10 p-4 text-left transition active:scale-[0.98]"
        >
          <span className="text-4xl">🌿</span>
          <span className="min-w-0">
            <span className="block text-lg font-extrabold">힐링 러닝</span>
            <span className="block text-xs text-zinc-400">
              제자리 달리기 모션으로 자연 속을 달리는 힐링 모드
            </span>
          </span>
        </button>
      </div>

      <p className="max-w-xs text-[11px] leading-5 text-zinc-500">
        카메라 런닝은 얼굴 인식(전면 카메라), 힐링 러닝은 움직임 센서를 사용합니다.
      </p>
    </div>
  );
}
