"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import {
  isLookingUp,
  laneFromYaw,
  runIntensityFromBounce,
  type Lane,
} from "@/features/running/controls";
import { createGame, stepGame, type GameState } from "@/features/running/game";

/* 실제 리깅 캐릭터(군인) + Run 애니메이션. three.js 예제 모델을 자체 호스팅. */
const RUNNER_URL = "/models/runner.glb";
if (typeof window !== "undefined") useGLTF.preload(RUNNER_URL);

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

const YAW_SIGN = 1; // 좌우가 반대로 느껴지면 -1
const YAW_THRESHOLD = 12;
const PITCH_JUMP_THRESHOLD = 14;
const HEAD_Y_HISTORY = 18;

// 3D 월드 스케일
const LANE_W = 1.5; // 레인 간격(월드)
const Z_WORLD = 1.15; // 게임 z → 월드 거리
const JUMP_WORLD = 2.3; // 게임 jumpY → 월드 높이
const POOL = 24; // 장애물 메쉬 풀 크기

type Phase = "intro" | "loading" | "calibrating" | "playing" | "over" | "error";

type Control = { targetLane: Lane; runIntensity: number };

/** 4x4 변환행렬(열 우선)에서 yaw·pitch(deg). */
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
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState({ distance: 0, coins: 0 });

  // 게임/입력 공유 상태 — 렌더 루프(useFrame)와 비전 루프가 ref 로 공유.
  const landmarkerRef = useRef<unknown>(null);
  const gameRef = useRef<GameState>(createGame());
  const controlRef = useRef<Control>({ targetLane: 0, runIntensity: 0 });
  const jumpPendingRef = useRef(false);
  const neutralRef = useRef<{ yaw: number; pitch: number } | null>(null);
  const calibSamplesRef = useRef<{ yaw: number; pitch: number }[]>([]);
  const headYRef = useRef<number[]>([]);
  const jumpArmedRef = useRef(true);
  const overRef = useRef(false);
  const rafRef = useRef(0);
  const phaseRef = useRef<Phase>("intro");
  phaseRef.current = phase;
  // HUD DOM refs(매 프레임 React 리렌더 없이 갱신)
  const distRef = useRef<HTMLSpanElement | null>(null);
  const coinRef = useRef<HTMLSpanElement | null>(null);
  const gaugeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
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

      // 리셋 + 보정 시작
      calibSamplesRef.current = [];
      neutralRef.current = null;
      gameRef.current = createGame();
      controlRef.current = { targetLane: 0, runIntensity: 0 };
      jumpPendingRef.current = false;
      headYRef.current = [];
      jumpArmedRef.current = true;
      overRef.current = false;
      setPhase("calibrating");
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

  /** 비전 루프 — 머리 자세→조작(controlRef/jumpPendingRef). 게임 전진/렌더는 useFrame 이. */
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

    let yaw = 0;
    let pitch = 0;
    let face = false;
    if (v.readyState >= 2) {
      const res = landmarker.detectForVideo(v, ts);
      const mtx = res.facialTransformationMatrixes?.[0]?.data;
      const lm = res.faceLandmarks?.[0];
      if (mtx && lm) {
        face = true;
        const a = headAngles(mtx);
        yaw = a.yaw;
        pitch = a.pitch;
        const noseY = lm[1]?.y ?? 0.5;
        const hist = headYRef.current;
        hist.push(noseY);
        if (hist.length > HEAD_Y_HISTORY) hist.shift();
      }
    }

    if (phaseRef.current === "calibrating") {
      if (face) calibSamplesRef.current.push({ yaw, pitch });
      if (calibSamplesRef.current.length >= 30) {
        const s = calibSamplesRef.current;
        neutralRef.current = {
          yaw: s.reduce((a, b) => a + b.yaw, 0) / s.length,
          pitch: s.reduce((a, b) => a + b.pitch, 0) / s.length,
        };
        setPhase("playing");
      }
    } else if (phaseRef.current === "playing") {
      const n = neutralRef.current ?? { yaw: 0, pitch: 0 };
      const relYaw = YAW_SIGN * (yaw - n.yaw);
      const relPitch = pitch - n.pitch;
      controlRef.current = {
        targetLane: laneFromYaw(relYaw, YAW_THRESHOLD),
        runIntensity: runIntensityFromBounce(headYRef.current),
      };
      const up = isLookingUp(relPitch, PITCH_JUMP_THRESHOLD);
      if (up && jumpArmedRef.current) {
        jumpPendingRef.current = true;
        jumpArmedRef.current = false;
      }
      if (!up) jumpArmedRef.current = true;
    }
    rafRef.current = requestAnimationFrame(visionLoop);
  }

  function handleOver(distance: number, coins: number) {
    setScore({ distance, coins });
    setPhase("over");
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
    rafRef.current = requestAnimationFrame(visionLoop);
  }

  const active = phase === "playing" || phase === "calibrating" || phase === "over";

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0b1026] text-white">
      {/* 3D 게임 */}
      {active ? (
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 2.7, 5.6], fov: 55 }}
          onCreated={({ camera }) => camera.lookAt(0, 1.1, -4)}
          className="absolute inset-0"
        >
          <Scene
            gameRef={gameRef}
            controlRef={controlRef}
            jumpPendingRef={jumpPendingRef}
            overRef={overRef}
            phaseRef={phaseRef}
            onOver={handleOver}
            hud={{ dist: distRef, coin: coinRef, gauge: gaugeRef }}
          />
        </Canvas>
      ) : null}

      {/* 카메라 PIP(거울) — 분석용 비디오를 코너에 보여준다. */}
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

      {/* 오버레이 */}
      {phase === "intro" || phase === "error" ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/70 px-6 text-center">
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

/* ── 3D 씬 ──────────────────────────────────────────────────────────────── */
type SlotRefs = { group: THREE.Group; block: THREE.Mesh; coin: THREE.Mesh };

function Scene({
  gameRef,
  controlRef,
  jumpPendingRef,
  overRef,
  phaseRef,
  onOver,
  hud,
}: {
  gameRef: React.MutableRefObject<GameState>;
  controlRef: React.MutableRefObject<Control>;
  jumpPendingRef: React.MutableRefObject<boolean>;
  overRef: React.MutableRefObject<boolean>;
  phaseRef: React.MutableRefObject<Phase>;
  onOver: (distance: number, coins: number) => void;
  hud: {
    dist: React.RefObject<HTMLSpanElement | null>;
    coin: React.RefObject<HTMLSpanElement | null>;
    gauge: React.RefObject<HTMLDivElement | null>;
  };
}) {
  const playerRef = useRef<THREE.Group>(null);
  const runActionRef = useRef<THREE.AnimationAction | null>(null);
  const slotRefs = useRef<SlotRefs[]>([]);
  const slotById = useRef<Map<number, number>>(new Map());

  // 스크롤하는 도로 텍스처(속도감)
  const roadTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#141a30";
    ctx.fillRect(0, 0, 128, 256);
    // 레인 경계선 2개(세로)
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(128 / 3 - 1.5, 0, 3, 256);
    ctx.fillRect((128 * 2) / 3 - 1.5, 0, 3, 256);
    // 각 레인 중앙 점선(속도감)
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (const cx of [128 / 6, 128 / 2, (128 * 5) / 6]) {
      for (let y = 0; y < 256; y += 64) ctx.fillRect(cx - 2, y, 4, 34);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 26);
    t.anisotropy = 4;
    return t;
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta);
    const playing = phaseRef.current === "playing";

    // 1) 게임 전진
    if (playing && gameRef.current.status === "playing") {
      const jump = jumpPendingRef.current;
      jumpPendingRef.current = false;
      gameRef.current = stepGame(
        gameRef.current,
        {
          targetLane: controlRef.current.targetLane,
          jump,
          runIntensity: controlRef.current.runIntensity,
        },
        dt * 1000,
      );
    }
    const s = gameRef.current;

    // 2) 플레이어(레인/점프/기울임)
    const p = playerRef.current;
    if (p) {
      p.position.x = s.playerLane * LANE_W;
      p.position.y = s.jumpY * JUMP_WORLD;
      p.rotation.z = (s.playerLane - s.targetLane) * 0.18;
    }
    // 달리기 클립 속도 = 게임 속도
    if (runActionRef.current) {
      runActionRef.current.timeScale = playing
        ? THREE.MathUtils.clamp(s.speed / 6, 0.15, 2.4)
        : 0.15;
    }

    // 3) 장애물 풀 — id→슬롯 유지(팝핑 방지)
    const slots = slotRefs.current;
    if (slots.length === POOL) {
      const prev = slotById.current;
      const occupied = new Array(POOL).fill(false);
      const cur = new Map<number, number>();
      for (const o of s.obstacles) {
        const ps = prev.get(o.id);
        if (ps !== undefined && !occupied[ps]) {
          occupied[ps] = true;
          cur.set(o.id, ps);
        }
      }
      let f = 0;
      for (const o of s.obstacles) {
        if (cur.has(o.id)) continue;
        while (f < POOL && occupied[f]) f++;
        if (f >= POOL) break;
        occupied[f] = true;
        cur.set(o.id, f);
      }
      slotById.current = cur;
      for (let i = 0; i < POOL; i++) slots[i].group.visible = false;
      for (const o of s.obstacles) {
        const slot = cur.get(o.id);
        if (slot === undefined) continue;
        const sl = slots[slot];
        sl.group.visible = true;
        sl.group.position.set(o.lane * LANE_W, 0, -o.z * Z_WORLD);
        const isCoin = o.kind === "coin";
        sl.block.visible = !isCoin;
        sl.coin.visible = isCoin && !o.got;
        if (isCoin) sl.coin.rotation.y += dt * 4;
      }
    }

    // 4) 도로 스크롤
    roadTex.offset.y = (s.distance * 0.085) % 1;

    // 5) HUD
    if (hud.dist.current) hud.dist.current.textContent = `${Math.round(s.distance)} m`;
    if (hud.coin.current) hud.coin.current.textContent = `◉ ${s.coins}`;
    if (hud.gauge.current) {
      const g = THREE.MathUtils.clamp((s.speed - 2.5) / (15 - 2.5), 0, 1);
      hud.gauge.current.style.width = `${g * 100}%`;
    }

    // 6) 게임오버
    if (s.status === "over" && !overRef.current) {
      overRef.current = true;
      onOver(Math.round(s.distance), s.coins);
    }
  });

  return (
    <>
      <fog attach="fog" args={["#0b1026", 12, 36]} />
      <hemisphereLight args={["#aab9ff", "#0b1026", 1.1]} />
      <directionalLight
        position={[5, 11, 6]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* 도로 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]} receiveShadow>
        <planeGeometry args={[LANE_W * 3, 80]} />
        <meshStandardMaterial map={roadTex} color="#5b6cab" />
      </mesh>

      {/* 플레이어 */}
      <group ref={playerRef} position={[0, 0, 0]}>
        <Suspense fallback={<FallbackRunner />}>
          <Runner runActionRef={runActionRef} />
        </Suspense>
      </group>

      {/* 장애물 풀 */}
      {Array.from({ length: POOL }).map((_, i) => (
        <group
          key={i}
          visible={false}
          ref={(g) => {
            if (!g) return;
            slotRefs.current[i] = {
              group: g,
              block: g.children[0] as THREE.Mesh,
              coin: g.children[1] as THREE.Mesh,
            };
          }}
        >
          {/* block */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[1.0, 1.2, 1.0]} />
            <meshStandardMaterial color="#ef4444" roughness={0.5} />
          </mesh>
          {/* coin */}
          <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.38, 0.13, 12, 24]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.25} emissive="#7a5300" />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** GLB 실제 캐릭터 + Run 애니메이션. 모델 크기를 자동으로 키 1.7m 에 맞춘다. */
function Runner({
  runActionRef,
}: {
  runActionRef: React.MutableRefObject<THREE.AnimationAction | null>;
}) {
  const { scene, animations } = useGLTF(RUNNER_URL);
  const ref = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, ref);

  // 자동 스케일/발 위치 보정 + 그림자
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const h = size.y || 1;
    const scale = 1.7 / h;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = true;
    });
    return { scale, yOffset: -box.min.y * (1.7 / h) };
  }, [scene]);

  useEffect(() => {
    // Run 클립 재생(없으면 첫 클립).
    const run = actions["Run"] ?? Object.values(actions)[0] ?? null;
    if (run) {
      run.reset().play();
      runActionRef.current = run;
    }
    return () => {
      run?.stop();
    };
  }, [actions, runActionRef]);

  return (
    <group ref={ref} position={[0, fit.yOffset, 0]} scale={fit.scale}>
      <primitive object={scene} />
    </group>
  );
}

/** 모델 로딩 동안/실패 시 임시 캡슐(거의 안 보임). */
function FallbackRunner() {
  return (
    <mesh position={[0, 0.9, 0]} castShadow>
      <capsuleGeometry args={[0.35, 0.9, 6, 12]} />
      <meshStandardMaterial color="#10b981" />
    </mesh>
  );
}
