"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import {
  isLookingUp,
  laneFromLean,
  runIntensityFromBounce,
  type Lane,
} from "@/features/running/controls";
import { createGame, type GameState } from "@/features/running/game";
import { recordRunAsCooldownAction } from "@/features/running/run-record-actions";

/* 무거운 3D 엔진(three + R3F + 2.1MB 모델)은 '시작하기' 전까지 로드하지 않는다.
 * /running 첫 진입(인트로)에 거대한 번들을 끌어오면 PWA 웹뷰 등에서 "page couldn't
 * load" 가 날 수 있어, next/dynamic(ssr:false)로 활성화될 때만 지연 로드한다. */
const Running3D = dynamic(() => import("@/features/running/running-3d"), {
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

// 레인 이동은 '고개 돌리기'(yaw)가 아니라 '좌우로 기울이기/옮기기'(머리 가로 위치)로.
// 제자리 달리기 중에도 화면을 보면서 조작 가능. 좌우가 반대면 LEAN_SIGN 을 -1↔1 뒤집기.
const LEAN_SIGN = -1; // 셀피(전면)카메라 기준 기본값 — 반대로 가면 1 로
const LEAN_THRESHOLD = 0.045; // 코끝 가로 위치(0..1) 변화 임계
const PITCH_JUMP_THRESHOLD = 11; // 위 보기 점프 — 달리면서도 쉽게(살짝 낮춤)
const HEAD_Y_HISTORY = 18;

export type Phase =
  | "intro"
  | "loading"
  | "calibrating"
  | "playing"
  | "over"
  | "error";
export type Control = { targetLane: Lane; runIntensity: number };

/** 4x4 변환행렬(열 우선)에서 yaw·pitch(deg). */
function headAngles(m: ArrayLike<number>): { yaw: number; pitch: number } {
  const r02 = m[8],
    r12 = m[9],
    r22 = m[10];
  const yaw = Math.atan2(r02, r22) * (180 / Math.PI);
  const pitch = Math.atan2(-r12, Math.hypot(r02, r22)) * (180 / Math.PI);
  return { yaw, pitch };
}

export function RunningGame({ onExit }: { onExit?: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState({ distance: 0, coins: 0 });
  // 트레드밀처럼 하단에서 수동 설정하는 속도(km/h)·경사도. 기록에 그대로 저장.
  const [speed, setSpeed] = useState(8);
  const [incline, setIncline] = useState(1);
  const speedRef = useRef(8);
  const inclineRef = useRef(1);
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
  const gameRef = useRef<GameState>(createGame());
  const controlRef = useRef<Control>({ targetLane: 0, runIntensity: 0 });
  const jumpPendingRef = useRef(false);
  // 정면 기준값: pitch(점프용)·x(코끝 가로 위치, 기울이기 레인용).
  const neutralRef = useRef<{ pitch: number; x: number } | null>(null);
  const calibSamplesRef = useRef<{ pitch: number; x: number }[]>([]);
  const headYRef = useRef<number[]>([]);
  const jumpArmedRef = useRef(true);
  const overRef = useRef(false);
  const playStartRef = useRef(0); // 플레이 시작 시각(마무리 자동기록용 운동시간)
  const rafRef = useRef(0);
  const phaseRef = useRef<Phase>("intro");
  phaseRef.current = phase;
  const distRef = useRef<HTMLSpanElement | null>(null);
  const coinRef = useRef<HTMLSpanElement | null>(null);
  const gaugeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      // MediaPipe FaceLandmarker(WASM+GPU 델리게이트) 해제 — 안 하면 화면 재진입마다
      // 네이티브 메모리가 누적돼 저사양 폰에서 OOM(팅김).
      (landmarkerRef.current as { close?: () => void } | null)?.close?.();
      landmarkerRef.current = null;
    };
  }, []);

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
          outputFacialTransformationMatrixes: true,
        });
      let landmarker: unknown;
      try {
        landmarker = await make("GPU");
      } catch {
        landmarker = await make("CPU");
      }
      landmarkerRef.current = landmarker;

      calibSamplesRef.current = [];
      neutralRef.current = null;
      gameRef.current = createGame();
      controlRef.current = { targetLane: 0, runIntensity: 0 };
      jumpPendingRef.current = false;
      headYRef.current = [];
      jumpArmedRef.current = true;
      overRef.current = false;
      setPhase("calibrating");
      cancelAnimationFrame(rafRef.current); // 겹치기 방지
      rafRef.current = requestAnimationFrame(visionLoop);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      setError(
        /denied|permission/i.test(msg)
          ? "카메라 권한이 필요합니다. 브라우저 설정에서 허용해 주세요."
          : `시작 실패: ${msg}`,
      );
      setPhase("error");
    }
  }

  /** 비전 루프 — 머리 자세→조작(controlRef/jumpPendingRef). 게임 전진/렌더는 R3F 가. */
  function visionLoop(ts: number) {
    const v = videoRef.current;
    const landmarker = landmarkerRef.current as {
      detectForVideo: (
        v: HTMLVideoElement,
        ts: number,
      ) => {
        faceLandmarks?: { x: number; y: number }[][];
        facialTransformationMatrixes?: { data: number[] }[];
      };
    } | null;
    if (!v || !landmarker) return;

    let pitch = 0;
    let noseX = 0.5; // 코끝 가로 위치(0..1) — 좌우 기울이기 레인용
    let face = false;
    if (v.readyState >= 2) {
      const res = landmarker.detectForVideo(v, ts);
      const mtx = res.facialTransformationMatrixes?.[0]?.data;
      const lm = res.faceLandmarks?.[0];
      if (mtx && lm) {
        face = true;
        pitch = headAngles(mtx).pitch;
        noseX = lm[1]?.x ?? 0.5;
        const noseY = lm[1]?.y ?? 0.5;
        const hist = headYRef.current;
        hist.push(noseY);
        if (hist.length > HEAD_Y_HISTORY) hist.shift();
      }
    }

    if (phaseRef.current === "calibrating") {
      if (face) calibSamplesRef.current.push({ pitch, x: noseX });
      if (calibSamplesRef.current.length >= 30) {
        const s = calibSamplesRef.current;
        neutralRef.current = {
          pitch: s.reduce((a, b) => a + b.pitch, 0) / s.length,
          x: s.reduce((a, b) => a + b.x, 0) / s.length,
        };
        playStartRef.current = Date.now();
        setPhase("playing");
      }
    } else if (phaseRef.current === "playing") {
      const n = neutralRef.current ?? { pitch: 0, x: 0.5 };
      // 레인: 정면 대비 머리 가로 위치(기울이기) — 고개를 돌리지 않아도 됨.
      const dx = LEAN_SIGN * (noseX - n.x);
      const relPitch = pitch - n.pitch;
      controlRef.current = {
        targetLane: laneFromLean(dx, LEAN_THRESHOLD),
        runIntensity: runIntensityFromBounce(headYRef.current),
      };
      const up = isLookingUp(relPitch, PITCH_JUMP_THRESHOLD);
      if (up && jumpArmedRef.current) {
        jumpPendingRef.current = true;
        jumpArmedRef.current = false;
      }
      if (!up) jumpArmedRef.current = true;
    }
    // 게임 종료(over) 후엔 루프를 멈춘다 — 안 그러면 매 프레임 얼굴추론을 계속 돌려
    // CPU/GPU를 태우고, restart 때 두 번째 루프가 겹쳐 팅김의 원인이 된다.
    if (phaseRef.current !== "over") {
      rafRef.current = requestAnimationFrame(visionLoop);
    }
  }

  function handleOver(distance: number, coins: number) {
    setScore({ distance, coins });
    setPhase("over");
    // 오늘 마무리 운동에 자동 기록 — 시간(분) + 하단에서 설정한 속도·경사.
    const durationMin = Math.max(
      1,
      Math.round((Date.now() - playStartRef.current) / 60000),
    );
    void recordRunAsCooldownAction({
      durationMin,
      avgKmh: speedRef.current,
      incline: inclineRef.current,
    }).catch(() => {});
  }

  function restart() {
    gameRef.current = createGame();
    controlRef.current = { targetLane: 0, runIntensity: 0 };
    jumpPendingRef.current = false;
    headYRef.current = [];
    jumpArmedRef.current = true;
    overRef.current = false;
    calibSamplesRef.current = [];
    neutralRef.current = null;
    setPhase("calibrating");
    cancelAnimationFrame(rafRef.current); // 이전 루프 겹치기 방지
    rafRef.current = requestAnimationFrame(visionLoop);
  }

  const active =
    phase === "playing" || phase === "calibrating" || phase === "over";

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0b1026] text-white">
      {active ? (
        <Running3D
          gameRef={gameRef}
          controlRef={controlRef}
          jumpPendingRef={jumpPendingRef}
          overRef={overRef}
          phaseRef={phaseRef}
          onOver={handleOver}
          hud={{ dist: distRef, coin: coinRef, gauge: gaugeRef }}
        />
      ) : null}

      {/* 카메라 PIP(거울) */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute right-3 top-3 z-20 h-24 w-32 -scale-x-100 rounded-xl object-cover ring-1 ring-white/30 ${
          active ? "" : "hidden"
        }`}
      />

      {/* HUD */}
      {phase === "playing" ? (
        <div className="pointer-events-none absolute left-4 top-3 z-20 select-none">
          <span ref={distRef} className="block font-mono text-xl font-black drop-shadow">
            0 m
          </span>
          <span ref={coinRef} className="block font-mono text-sm font-bold text-amber-400 drop-shadow">
            ◉ 0
          </span>
          <div className="mt-1 h-2 w-28 overflow-hidden rounded-full bg-white/20">
            <div ref={gaugeRef} className="h-full w-0 bg-emerald-400" />
          </div>
        </div>
      ) : null}

      {/* 하단 수동 설정 — 트레드밀처럼 속도(km/h)·경사도. 기록에 그대로 저장된다. */}
      {phase === "playing" ? (
        <div className="absolute inset-x-0 bottom-[max(env(safe-area-inset-bottom),1rem)] z-20 flex justify-center px-4">
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

      {/* 오버레이 */}
      {phase === "intro" || phase === "error" ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/70 px-6 text-center">
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className="absolute left-4 top-[max(env(safe-area-inset-top),1rem)] inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/90 active:scale-95"
            >
              ← 나가기
            </button>
          ) : null}
          <h1 className="text-3xl font-extrabold">런닝 모드 🏃</h1>
          <p className="max-w-xs text-sm leading-6 text-zinc-300">
            카메라로 머리를 인식해요. 제자리에서 <b>달리면</b> 캐릭터가 달리고,
            멈추면 캐릭터도 멈춰요. 화면을 보면서 몸을 <b>왼쪽/오른쪽</b>으로
            기울이면 레인 이동, <b>위로</b> 보면 점프!
          </p>
          <p className="max-w-xs rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-emerald-200">
            ⚠ 카메라 권한이 필요해요. 시작을 누르면 전면 카메라 권한을 요청합니다.
          </p>
          {error ? (
            <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={start}
            className="rounded-full bg-emerald-500 px-8 py-3 text-lg font-bold text-white shadow-lg active:scale-95"
          >
            시작하기
          </button>
        </div>
      ) : null}

      {phase === "loading" ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 text-sm text-zinc-200">
          카메라·3D 캐릭터 불러오는 중…
        </div>
      ) : null}

      {phase === "calibrating" ? (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center">
          <span className="rounded-full bg-black/60 px-4 py-2 text-sm font-bold">
            정면을 바라봐 주세요… (자세 보정)
          </span>
        </div>
      ) : null}

      {phase === "over" ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/75 px-6 text-center">
          <h2 className="text-2xl font-extrabold">게임 오버</h2>
          <p className="text-lg">
            거리 <b className="text-emerald-400">{score.distance}m</b> · 코인{" "}
            <b className="text-amber-400">{score.coins}</b>
          </p>
          <button
            type="button"
            onClick={restart}
            className="rounded-full bg-emerald-500 px-8 py-3 text-lg font-bold text-white active:scale-95"
          >
            다시 하기
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
