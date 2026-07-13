"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { runIntensityFromBounce } from "@/features/running/controls";
import { formatDuration } from "@/features/running/geo";
import { recordRunAsCooldownAction } from "@/features/running/run-record-actions";

/* 무거운 3D 씬(힐링과 동일)은 '시작하기' 후에만 지연 로드(PWA 안전). */
const ZenScene = dynamic(() => import("@/features/running/zen-scene"), {
  ssr: false,
  loading: () => null,
});

/* MediaPipe(tasks-vision) 런타임 CDN ESM 로드 — 번들러가 정적분석 못 하게 native import. */
const VISION_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/vision_bundle.mjs";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
const nativeImport = new Function("u", "return import(u)") as (
  u: string,
) => Promise<Record<string, unknown>>;

const HEAD_Y_HISTORY = 18;

type Phase = "intro" | "loading" | "playing" | "done" | "error";

/**
 * 실내 런닝 — 카메라로 '제자리 달리기'를 감지해 힐링 풍경(ZenScene) 속 캐릭터가 달린다.
 * (힐링 모드와 같은 예쁜 씬·맵 전환. 실내는 입력만 카메라.) 하단에서 속도·경사 설정.
 */
export function RunningGame({ onExit }: { onExit?: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(8);
  const [incline, setIncline] = useState(1);
  const [elapsedSec, setElapsedSec] = useState(0);
  const speedRef = useRef(8);
  const inclineRef = useRef(1);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  function changeSpeed(d: number) {
    setSpeed((s) => {
      const n = Math.round(Math.min(20, Math.max(1, s + d)) * 10) / 10;
      speedRef.current = n;
      return n;
    });
  }
  function changeIncline(d: number) {
    setIncline((s) => {
      const n = Math.min(15, Math.max(0, s + d));
      inclineRef.current = n;
      return n;
    });
  }

  const landmarkerRef = useRef<unknown>(null);
  const headYRef = useRef<number[]>([]);
  const runRef = useRef(0); // 0..1 — ZenScene 이 매 프레임 읽어 캐릭터/풍경 구동
  const targetRef = useRef(0);
  const rafRef = useRef(0);
  const phaseRef = useRef<Phase>("intro");
  phaseRef.current = phase;
  const playStartRef = useRef(0);
  const distRef = useRef<HTMLSpanElement | null>(null);
  const mapRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    // MediaPipe FaceLandmarker(WASM+GPU) 해제 — 안 하면 재진입마다 네이티브 메모리 누적(팅김).
    (landmarkerRef.current as { close?: () => void } | null)?.close?.();
    landmarkerRef.current = null;
  }

  async function start() {
    setError(null);
    setPhase("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();

      const vision = (await nativeImport(VISION_URL)) as {
        FilesetResolver: { forVisionTasks: (p: string) => Promise<unknown> };
        FaceLandmarker: {
          createFromOptions: (f: unknown, o: unknown) => Promise<unknown>;
        };
      };
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
      const make = (delegate: "GPU" | "CPU") =>
        vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: "VIDEO",
          numFaces: 1,
        });
      let landmarker: unknown;
      try {
        landmarker = await make("GPU");
      } catch {
        landmarker = await make("CPU");
      }
      landmarkerRef.current = landmarker;

      headYRef.current = [];
      runRef.current = 0;
      targetRef.current = 0;
      playStartRef.current = Date.now();
      setElapsedSec(0);
      setPhase("playing");
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(visionLoop);
      tickRef.current = setInterval(() => {
        setElapsedSec((Date.now() - playStartRef.current) / 1000);
      }, 1000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      setError(
        /denied|permission/i.test(msg)
          ? "카메라 권한이 필요합니다. 권한을 허용해 주세요."
          : `시작 실패: ${msg}`,
      );
      setPhase("error");
    }
  }

  /** 비전 루프 — 머리 수직 흔들림으로 달리기 강도. 풍경/캐릭터 전진은 ZenScene 이 runRef 로. */
  function visionLoop(ts: number) {
    const v = videoRef.current;
    const landmarker = landmarkerRef.current as {
      detectForVideo: (
        v: HTMLVideoElement,
        ts: number,
      ) => { faceLandmarks?: { x: number; y: number }[][] };
    } | null;
    if (v && landmarker && v.readyState >= 2) {
      const res = landmarker.detectForVideo(v, ts);
      const lm = res.faceLandmarks?.[0];
      const noseY = lm?.[1]?.y;
      if (typeof noseY === "number") {
        const hist = headYRef.current;
        hist.push(noseY);
        if (hist.length > HEAD_Y_HISTORY) hist.shift();
        targetRef.current = runIntensityFromBounce(hist);
      }
    }
    // 부드럽게 보간 — 달리면 캐릭터가 달리고 멈추면 같이 멈춘다.
    runRef.current += (targetRef.current - runRef.current) * 0.15;
    if (phaseRef.current !== "done") {
      rafRef.current = requestAnimationFrame(visionLoop);
    }
  }

  function finish() {
    stopCamera();
    setPhase("done");
    const sec = (Date.now() - playStartRef.current) / 1000;
    const durationMin = Math.max(1, Math.round(sec / 60));
    void recordRunAsCooldownAction({
      durationMin,
      durationSec: sec,
      avgKmh: speedRef.current,
      incline: inclineRef.current,
    }).catch(() => {});
  }

  const active = phase === "playing" || phase === "done";

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#bfeaff] text-white">
      {active ? <ZenScene runRef={runRef} hud={{ dist: distRef, map: mapRef }} /> : null}

      {/* 카메라 — 화면엔 안 보이게(감지용으로만 사용). display:none 은 일부 브라우저에서
          프레임이 멈춰 감지가 안 되므로 opacity 0 + 1px 로 렌더는 유지한다. */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
      />

      {/* 거리 + 맵 HUD */}
      {phase === "playing" ? (
        <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-col items-start gap-1">
          <span
            ref={distRef}
            className="rounded-full bg-white/70 px-3 py-1 font-mono text-lg font-black text-emerald-700 shadow"
          >
            0 m
          </span>
          <span className="rounded-full bg-black/45 px-3 py-0.5 font-mono text-sm font-bold text-white shadow backdrop-blur">
            {formatDuration(elapsedSec)}
          </span>
          <span
            ref={mapRef}
            className="rounded-full bg-black/40 px-3 py-0.5 text-xs font-bold text-white shadow backdrop-blur"
          >
            초원
          </span>
        </div>
      ) : null}

      {/* 하단: 종료(위) + 속도·경사 설정(아래). 홈버튼/제스처 바와 안 겹치게 safe-area+여백. */}
      {phase === "playing" ? (
        <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] z-20 flex flex-col items-center gap-3 px-4">
          <button
            type="button"
            onClick={finish}
            className="rounded-full bg-red-500 px-10 py-3 text-lg font-bold text-white shadow-lg active:scale-95"
          >
            종료
          </button>
          <div className="flex items-center gap-3 rounded-2xl bg-black/55 px-4 py-2.5 backdrop-blur">
            <Stepper
              label="속도"
              value={`${speed.toFixed(1)}`}
              unit="km/h"
              onMinus={() => changeSpeed(-0.5)}
              onPlus={() => changeSpeed(0.5)}
            />
            <span className="h-8 w-px bg-white/20" />
            <Stepper
              label="경사"
              value={`${incline}`}
              unit="%"
              onMinus={() => changeIncline(-1)}
              onPlus={() => changeIncline(1)}
            />
          </div>
        </div>
      ) : null}

      {/* 인트로 / 에러 */}
      {phase === "intro" || phase === "error" ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-sky-400 to-emerald-200 px-6 text-center text-emerald-950">
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className="absolute left-4 top-[max(env(safe-area-inset-top),1rem)] inline-flex items-center gap-1 rounded-full bg-black/10 px-3 py-1.5 text-sm font-semibold text-emerald-950 active:scale-95"
            >
              ← 나가기
            </button>
          ) : null}
          <h1 className="text-3xl font-extrabold drop-shadow-sm">실내 런닝 🏠</h1>
          <p className="max-w-xs text-sm font-medium leading-6">
            카메라가 <b>제자리 달리기</b>를 감지하면 풍경 속 캐릭터가 함께 달려요.
            멈추면 같이 쉬어요. 하단에서 속도·경사를 설정하고, 끝나면 오늘 마무리
            운동으로 기록됩니다.
          </p>
          <p className="max-w-xs rounded-lg bg-black/10 px-3 py-2 text-xs font-semibold text-emerald-950">
            ⚠ 카메라 권한이 필요해요. 시작을 누르면 전면 카메라 권한을 요청합니다.
          </p>
          {error ? (
            <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={start}
            className="rounded-full bg-emerald-600 px-8 py-3 text-lg font-bold text-white shadow-lg active:scale-95"
          >
            시작하기
          </button>
        </div>
      ) : null}

      {phase === "loading" ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 text-sm text-white">
          카메라·풍경 불러오는 중…
        </div>
      ) : null}

      {phase === "done" ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/70 px-6 text-center">
          <h2 className="text-2xl font-extrabold">런닝 완료 🏁</h2>
          <p className="text-sm text-zinc-300">오늘 마무리 운동에 기록했어요.</p>
          <button
            type="button"
            onClick={() => setPhase("intro")}
            className="rounded-full bg-emerald-500 px-8 py-3 text-lg font-bold text-white active:scale-95"
          >
            확인
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** 하단 수동 설정용 −/+ 스테퍼(속도·경사). */
function Stepper({
  label,
  value,
  unit,
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  unit: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`${label} 줄이기`}
        onClick={onMinus}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xl font-black text-white active:scale-90"
      >
        −
      </button>
      <div className="min-w-14 text-center leading-tight">
        <span className="block font-mono text-lg font-black tabular-nums text-white">
          {value}
          <span className="ml-0.5 text-[10px] font-semibold text-white/70">
            {unit}
          </span>
        </span>
        <span className="block text-[10px] font-semibold text-white/60">
          {label}
        </span>
      </div>
      <button
        type="button"
        aria-label={`${label} 늘리기`}
        onClick={onPlus}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xl font-black text-white active:scale-90"
      >
        +
      </button>
    </div>
  );
}
