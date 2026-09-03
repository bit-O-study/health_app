"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { RunningGame } from "@/features/running/running-game";
import { OutdoorRun } from "@/features/running/outdoor-run";
import type { RunningMode } from "@/features/running/run-session";

/** 휴대폰(터치 + 좁은 화면 / 모바일 UA)에서만 런닝 모드를 띄운다. */
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua);
  const touch = (navigator.maxTouchPoints ?? 0) > 0 || "ontouchstart" in window;
  const narrow = Math.min(window.innerWidth, window.innerHeight) <= 820;
  return mobileUa || (touch && narrow);
}

export function RunningMobileGate({
  initialMode = null,
}: {
  initialMode?: RunningMode | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok" | "desktop">("checking");
  const [mode, setMode] = useState<RunningMode | null>(initialMode);
  const exitToSelect = () => setMode(null); // 시작 화면 '나가기' → 모드 선택으로

  useEffect(() => {
    // SSR에서는 브라우저의 터치·화면 정보를 확인할 수 없다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  if (mode === "indoor") return <RunningGame onExit={exitToSelect} />;
  if (mode === "outdoor") return <OutdoorRun onExit={exitToSelect} />;

  // 모드 선택 화면 — 실내(카메라) / 야외(GPS)
  return (
    <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-zinc-950 to-zinc-900 px-6 text-center text-white">
      {/* 나가기 → 운동 화면으로 */}
      <button
        type="button"
        onClick={() => router.push("/routine")}
        className="absolute left-4 top-[max(env(safe-area-inset-top),1rem)] z-10 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/90 active:scale-95"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        나가기
      </button>
      <div>
        <h1 className="text-3xl font-extrabold">런닝 모드</h1>
        <p className="mt-2 text-sm text-zinc-400">원하는 모드를 골라주세요</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={() => setMode("indoor")}
          className="flex items-center gap-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-left transition active:scale-[0.98]"
        >
          <span className="text-4xl">🏠</span>
          <span className="min-w-0">
            <span className="block text-lg font-extrabold">실내 런닝</span>
            <span className="block text-xs text-zinc-400">
              카메라로 제자리 달리기를 인식해 캐릭터가 달려요
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMode("outdoor")}
          className="flex items-center gap-4 rounded-2xl border border-sky-400/40 bg-sky-400/10 p-4 text-left transition active:scale-[0.98]"
        >
          <span className="text-4xl">📍</span>
          <span className="min-w-0">
            <span className="block text-lg font-extrabold">야외 런닝</span>
            <span className="block text-xs text-zinc-400">
              GPS로 거리·시속·페이스를 기록하며 캐릭터가 함께 달려요
            </span>
          </span>
        </button>
      </div>

      <p className="max-w-xs text-[11px] leading-5 text-zinc-500">
        실내는 전면 카메라(얼굴 인식), 야외는 위치(GPS)를 사용합니다. 끝나면 오늘
        마무리 운동에 자동 기록돼요.
      </p>
    </div>
  );
}
