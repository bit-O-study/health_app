"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { accelMagnitude, runIntensityFromAccel } from "@/features/running/motion";

// 무거운 3D 씬은 '시작' 이후에만 지연 로드(첫 진입 번들 가볍게 — PWA 안전).
const ZenScene = dynamic(() => import("@/features/running/zen-scene"), {
  ssr: false,
  loading: () => null,
});

type DeviceMotionWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const WINDOW = 24;

export function ZenRun() {
  const [phase, setPhase] = useState<"intro" | "playing">("intro");
  const [noSensor, setNoSensor] = useState(false); // 모션 센서 없음/거부
  const runRef = useRef(0); // 현재 달리기 강도 0..1 (씬이 매 프레임 읽음)
  const magsRef = useRef<number[]>([]);
  const rafRef = useRef(0);
  const distRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("devicemotion", onMotion);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onMotion(e: DeviceMotionEvent) {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x === null) return;
    const m = accelMagnitude(a.x ?? 0, a.y ?? 0, a.z ?? 0);
    const arr = magsRef.current;
    arr.push(m);
    if (arr.length > WINDOW) arr.shift();
  }

  // 오직 모션 센서(제자리 달리기)로만 전진. 화면 터치로는 움직이지 않는다.
  function controlLoop() {
    const target = runIntensityFromAccel(magsRef.current);
    runRef.current += (target - runRef.current) * 0.15; // 부드럽게
    rafRef.current = requestAnimationFrame(controlLoop);
  }

  async function start() {
    // iOS 13+ 는 사용자 제스처에서 모션 권한 요청 필요.
    const DM = window.DeviceMotionEvent as DeviceMotionWithPermission | undefined;
    let hasSensor = false;
    try {
      if (DM && typeof DM.requestPermission === "function") {
        const res = await DM.requestPermission();
        hasSensor = res === "granted";
      } else if (DM) {
        hasSensor = true;
      }
    } catch {
      hasSensor = false;
    }
    if (hasSensor) window.addEventListener("devicemotion", onMotion);
    setNoSensor(!hasSensor); // 센서 없으면 안내(터치 조작은 없음 — 센서 전용)
    magsRef.current = [];
    runRef.current = 0;
    setPhase("playing");
    rafRef.current = requestAnimationFrame(controlLoop);
  }

  return (
    <div className="relative h-[100dvh] w-full select-none overflow-hidden bg-[#bfeaff] text-white">
      {phase === "playing" ? (
        <>
          <ZenScene runRef={runRef} hud={{ dist: distRef }} />

          {/* 거리 HUD */}
          <div className="pointer-events-none absolute left-4 top-4 z-20">
            <span
              ref={distRef}
              className="rounded-full bg-white/70 px-3 py-1 font-mono text-lg font-black text-emerald-700 shadow"
            >
              0 m
            </span>
          </div>

          {/* 안내 (조작은 없음 — 제자리 달리기 감지로만 전진) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-4">
            <span className="rounded-full bg-black/40 px-4 py-2 text-center text-sm font-semibold backdrop-blur">
              {noSensor
                ? "⚠ 이 기기는 모션 센서가 없어요 — 휴대폰에서 열어주세요"
                : "제자리에서 달리면 캐릭터가 달려요 🏃 멈추면 같이 쉬어요"}
            </span>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-sky-300 to-amber-100 px-6 text-center text-emerald-900">
          <h1 className="text-3xl font-extrabold drop-shadow-sm">힐링 러닝 🌿</h1>
          <p className="max-w-xs text-sm font-medium leading-6">
            카메라 없이, <b>제자리에서 달리기만</b> 하면 돼요. 폰이 흔들림을
            느껴 캐릭터가 같이 달리고, 멈추면 함께 쉽니다. 조작(터치)은 없어요 —
            예쁜 풍경 속을 달려보세요.
          </p>
          <button
            type="button"
            onClick={start}
            className="rounded-full bg-emerald-500 px-8 py-3 text-lg font-bold text-white shadow-lg transition active:scale-95"
          >
            시작하기
          </button>
        </div>
      )}
    </div>
  );
}
