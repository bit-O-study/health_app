"use client";

import { useEffect, useRef, useState } from "react";

import {
  isLookingUp,
  laneFromYaw,
  runIntensityFromBounce,
  type Lane,
} from "@/features/running/controls";
import {
  createGame,
  stepGame,
  GAME_TUNING,
  type GameState,
} from "@/features/running/game";

/* MediaPipe(tasks-vision) 를 런타임 CDN ESM 으로 로드 — 번들러(Turbopack/webpack)가
 * 정적 분석하지 못하도록 new Function 으로 네이티브 import 를 만든다. */
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

const YAW_SIGN = 1; // 고개 방향이 반대로 느껴지면 -1 로 (좌우 보정)
const YAW_THRESHOLD = 12;
const PITCH_JUMP_THRESHOLD = 14;
const HEAD_Y_HISTORY = 18;

type Phase = "intro" | "loading" | "calibrating" | "playing" | "over" | "error";

/** 4x4 변환행렬(열 우선)에서 yaw(좌우)·pitch(상하) 추출(deg). */
function headAngles(m: ArrayLike<number>): { yaw: number; pitch: number } {
  const r02 = m[8],
    r12 = m[9],
    r22 = m[10];
  const yaw = Math.atan2(r02, r22) * (180 / Math.PI);
  const pitch = Math.atan2(-r12, Math.hypot(r02, r22)) * (180 / Math.PI);
  return { yaw, pitch };
}

export function RunningGame() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState({ distance: 0, coins: 0 });

  // 게임/세션 상태(렌더 루프 안에서만 변경 → ref).
  const landmarkerRef = useRef<unknown>(null);
  const gameRef = useRef<GameState>(createGame());
  const neutralRef = useRef<{ yaw: number; pitch: number } | null>(null);
  const calibSamplesRef = useRef<{ yaw: number; pitch: number }[]>([]);
  const headYRef = useRef<number[]>([]);
  const jumpArmedRef = useRef(true); // 점프 에지(내렸다 올릴 때만)
  const lastTsRef = useRef(0);
  const rafRef = useRef(0);
  const phaseRef = useRef<Phase>("intro");
  phaseRef.current = phase;

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      const v = videoRef.current;
      const stream = v?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    setError(null);
    setPhase("loading");
    try {
      // 1) 카메라
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();

      // 2) MediaPipe FaceLandmarker
      const vision = (await nativeImport(VISION_URL)) as {
        FilesetResolver: {
          forVisionTasks: (p: string) => Promise<unknown>;
        };
        FaceLandmarker: {
          createFromOptions: (
            fileset: unknown,
            opts: unknown,
          ) => Promise<unknown>;
        };
      };
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
      const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFacialTransformationMatrixes: true,
      });
      landmarkerRef.current = landmarker;

      // 3) 보정(정면 1.5초) → 플레이
      calibSamplesRef.current = [];
      neutralRef.current = null;
      gameRef.current = createGame();
      headYRef.current = [];
      jumpArmedRef.current = true;
      lastTsRef.current = 0;
      setPhase("calibrating");
      rafRef.current = requestAnimationFrame(loop);
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

  function loop(ts: number) {
    const v = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current as {
      detectForVideo: (
        v: HTMLVideoElement,
        ts: number,
      ) => {
        faceLandmarks?: { x: number; y: number }[][];
        facialTransformationMatrixes?: { data: number[] }[];
      };
    } | null;
    if (!v || !canvas || !landmarker) return;

    const dt = lastTsRef.current ? ts - lastTsRef.current : 16;
    lastTsRef.current = ts;

    let yaw = 0;
    let pitch = 0;
    let faceFound = false;
    if (v.readyState >= 2) {
      const res = landmarker.detectForVideo(v, ts);
      const mtx = res.facialTransformationMatrixes?.[0]?.data;
      const lm = res.faceLandmarks?.[0];
      if (mtx && lm) {
        faceFound = true;
        const a = headAngles(mtx);
        yaw = a.yaw;
        pitch = a.pitch;
        // 머리 수직 흔들림용 코끝 y(정규화)
        const noseY = lm[1]?.y ?? 0.5;
        const hist = headYRef.current;
        hist.push(noseY);
        if (hist.length > HEAD_Y_HISTORY) hist.shift();
      }
    }

    if (phaseRef.current === "calibrating") {
      if (faceFound) calibSamplesRef.current.push({ yaw, pitch });
      if (calibSamplesRef.current.length >= 30) {
        const s = calibSamplesRef.current;
        neutralRef.current = {
          yaw: s.reduce((a, b) => a + b.yaw, 0) / s.length,
          pitch: s.reduce((a, b) => a + b.pitch, 0) / s.length,
        };
        setPhase("playing");
      }
      renderFrame(canvas, v, gameRef.current, "calibrating");
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    if (phaseRef.current === "playing") {
      const neutral = neutralRef.current ?? { yaw: 0, pitch: 0 };
      const relYaw = YAW_SIGN * (yaw - neutral.yaw);
      const relPitch = pitch - neutral.pitch;
      const targetLane: Lane = laneFromYaw(relYaw, YAW_THRESHOLD);
      const lookingUp = isLookingUp(relPitch, PITCH_JUMP_THRESHOLD);
      const jump = lookingUp && jumpArmedRef.current;
      if (jump) jumpArmedRef.current = false;
      if (!lookingUp) jumpArmedRef.current = true; // 내려야 다시 점프 가능(에지)
      const runIntensity = runIntensityFromBounce(headYRef.current);

      const next = stepGame(gameRef.current, { targetLane, jump, runIntensity }, dt);
      gameRef.current = next;
      renderFrame(canvas, v, next, "playing");

      if (next.status === "over") {
        setScore({ distance: Math.round(next.distance), coins: next.coins });
        setPhase("over");
        return;
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  function restart() {
    gameRef.current = createGame();
    headYRef.current = [];
    jumpArmedRef.current = true;
    lastTsRef.current = 0;
    calibSamplesRef.current = [];
    neutralRef.current = null;
    setPhase("calibrating");
    rafRef.current = requestAnimationFrame(loop);
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-zinc-950 text-white">
      {/* 카메라 — 보이지 않게 두고(분석용) PIP 로 따로 그린다. */}
      <video ref={videoRef} playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* 오버레이 UI */}
      {phase === "intro" || phase === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/70 px-6 text-center">
          <h1 className="text-3xl font-extrabold">런닝 모드 🏃</h1>
          <p className="max-w-xs text-sm leading-6 text-zinc-300">
            카메라로 머리를 인식해요. 제자리에서 <b>달리면</b> 캐릭터가 달리고,
            고개를 <b>왼쪽/오른쪽</b>으로 돌리면 레인 이동, <b>위로</b> 보면 점프!
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm text-zinc-200">
          카메라·모델 불러오는 중…
        </div>
      ) : null}

      {phase === "calibrating" ? (
        <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center">
          <span className="rounded-full bg-black/60 px-4 py-2 text-sm font-bold">
            정면을 바라봐 주세요… (자세 보정)
          </span>
        </div>
      ) : null}

      {phase === "over" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/75 px-6 text-center">
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

/* ── 캔버스 렌더링 — 의사 3D 3레인 러너 ─────────────────────────── */
function renderFrame(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  s: GameState,
  phase: "calibrating" | "playing",
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
    canvas.width = W * dpr;
    canvas.height = H * dpr;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const horizonY = H * 0.34;
  const groundY = H * 0.9;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const project = (lane: number, z: number) => {
    const t = Math.max(0, Math.min(1, z / GAME_TUNING.SPAWN_Z));
    const y = lerp(groundY, horizonY, t);
    const spread = lerp(W * 0.32, W * 0.05, t);
    const scale = lerp(1, 0.16, t);
    return { x: W / 2 + lane * spread, y, scale };
  };

  // 하늘 + 바닥
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  sky.addColorStop(0, "#0b1026");
  sky.addColorStop(1, "#27306a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizonY);
  const ground = ctx.createLinearGradient(0, horizonY, 0, H);
  ground.addColorStop(0, "#1c2540");
  ground.addColorStop(1, "#10162b");
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizonY, W, H - horizonY);

  // 레인 경계선(원근)
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  for (const edge of [-1.5, -0.5, 0.5, 1.5]) {
    const a = project(edge, 0);
    const b = project(edge, GAME_TUNING.SPAWN_Z);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // 장애물(멀리→가까이 순서로 그리기)
  const sorted = [...s.obstacles].sort((a, b) => b.z - a.z);
  for (const o of sorted) {
    if (o.kind === "coin" && o.got) continue;
    const p = project(o.lane, Math.max(0, o.z));
    if (o.kind === "coin") {
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(p.x, p.y - 22 * p.scale, 16 * p.scale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const w = 64 * p.scale;
      const h = 70 * p.scale;
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(p.x - w / 2, p.y - h, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(p.x - w / 2, p.y - h, w, h * 0.25);
    }
  }

  // 플레이어 캐릭터(z=0)
  const pp = project(s.playerLane, 0);
  const px = pp.x;
  const jump = s.jumpY * 120;
  const py = groundY - jump;
  drawRunner(ctx, px, py, s.speed, phase === "playing");

  // 카메라 PIP(거울)
  const pipW = Math.min(140, W * 0.32);
  const pipH = pipW * 0.75;
  ctx.save();
  ctx.translate(W - pipW - 10, 10);
  ctx.beginPath();
  ctx.roundRect(0, 0, pipW, pipH, 10);
  ctx.clip();
  ctx.translate(pipW, 0);
  ctx.scale(-1, 1); // 거울
  try {
    ctx.drawImage(video, 0, 0, pipW, pipH);
  } catch {
    /* 첫 프레임 등 — 무시 */
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.strokeRect(W - pipW - 10, 10, pipW, pipH);

  // HUD
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${Math.round(s.distance)} m`, 14, 30);
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(`◉ ${s.coins}`, 14, 54);

  // 달리기 게이지
  const gi = Math.max(0, Math.min(1, (s.speed - GAME_TUNING.SPEED_MIN) / (GAME_TUNING.SPEED_MAX - GAME_TUNING.SPEED_MIN)));
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(14, 66, 120, 8);
  ctx.fillStyle = "#34d399";
  ctx.fillRect(14, 66, 120 * gi, 8);
}

function drawRunner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  speed: number,
  running: boolean,
) {
  const t = running ? (performance.now() / 90) * Math.max(0.3, speed / 6) : 0;
  const swing = running ? Math.sin(t) * 8 : 0;
  ctx.save();
  ctx.translate(x, y);
  // 그림자
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // 다리
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-4, -34);
  ctx.lineTo(-4 - swing, -2);
  ctx.moveTo(4, -34);
  ctx.lineTo(4 + swing, -2);
  ctx.stroke();
  // 몸통
  ctx.fillStyle = "#10b981";
  ctx.beginPath();
  ctx.roundRect(-14, -70, 28, 40, 10);
  ctx.fill();
  // 팔
  ctx.strokeStyle = "#0d9488";
  ctx.beginPath();
  ctx.moveTo(-12, -60);
  ctx.lineTo(-12 + swing, -42);
  ctx.moveTo(12, -60);
  ctx.lineTo(12 - swing, -42);
  ctx.stroke();
  // 머리
  ctx.fillStyle = "#fcd34d";
  ctx.beginPath();
  ctx.arc(0, -84, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
