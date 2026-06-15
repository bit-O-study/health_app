"use client";

import { useEffect, useState } from "react";

import { RunningGame } from "@/features/running/running-game";

/** 휴대폰(터치 + 좁은 화면 / 모바일 UA)에서만 런닝 모드를 띄운다. */
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua);
  const touch = (navigator.maxTouchPoints ?? 0) > 0 || "ontouchstart" in window;
  const narrow = Math.min(window.innerWidth, window.innerHeight) <= 820;
  return mobileUa || (touch && narrow);
}

export function RunningMobileGate() {
  const [state, setState] = useState<"checking" | "ok" | "desktop">("checking");

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
          카메라로 몸의 움직임을 인식해 달리는 게임이라, 휴대폰에서
          <br />
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-emerald-300">
            /running
          </code>{" "}
          으로 접속해 주세요.
        </p>
      </div>
    );
  }

  return <RunningGame />;
}
