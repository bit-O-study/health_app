"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { stepGame, type GameState } from "@/features/running/game";
import type { Control, Phase } from "@/features/running/running-game";

/* 실제 리깅 캐릭터(군인) + Run 애니메이션. three.js 예제 모델을 자체 호스팅.
 * ⚠ 이 모듈(three/R3F 포함)은 RunningGame 에서 next/dynamic(ssr:false)로 '시작하기'
 *   이후에만 로드된다 — /running 첫 진입(인트로)에 무거운 3D 번들을 끌어오지 않기 위함.
 *   (PWA 웹뷰에서 큰 번들을 한 번에 받다 "page couldn't load" 나던 문제 회피.) */
const RUNNER_URL = "/models/runner.glb";
useGLTF.preload(RUNNER_URL);

// 3D 월드 스케일
const LANE_W = 1.5;
const Z_WORLD = 1.15;
const JUMP_WORLD = 2.3;
const POOL = 24;

type SlotRefs = { group: THREE.Group; block: THREE.Mesh; coin: THREE.Mesh };

export type Hud = {
  dist: React.RefObject<HTMLSpanElement | null>;
  coin: React.RefObject<HTMLSpanElement | null>;
  gauge: React.RefObject<HTMLDivElement | null>;
};

export default function Running3D(props: {
  gameRef: React.MutableRefObject<GameState>;
  controlRef: React.MutableRefObject<Control>;
  jumpPendingRef: React.MutableRefObject<boolean>;
  overRef: React.MutableRefObject<boolean>;
  phaseRef: React.MutableRefObject<Phase>;
  onOver: (distance: number, coins: number) => void;
  hud: Hud;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 2.7, 5.6], fov: 55 }}
      onCreated={({ camera }) => camera.lookAt(0, 1.1, -4)}
      className="absolute inset-0"
    >
      <Scene {...props} />
    </Canvas>
  );
}

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
  hud: Hud;
}) {
  const playerRef = useRef<THREE.Group>(null);
  const runActionRef = useRef<THREE.AnimationAction | null>(null);
  const slotRefs = useRef<SlotRefs[]>([]);
  const slotById = useRef<Map<number, number>>(new Map());

  const roadTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#141a30";
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(128 / 3 - 1.5, 0, 3, 256);
    ctx.fillRect((128 * 2) / 3 - 1.5, 0, 3, 256);
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
  // 수동 생성한 CanvasTexture는 R3F가 자동 해제하지 않는다 → 언마운트 시 직접 dispose
  // (안 하면 런닝모드 재진입마다 GPU 텍스처 메모리가 새서 팅김에 기여).
  useEffect(() => () => roadTex.dispose(), [roadTex]);

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta);
    const playing = phaseRef.current === "playing";

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

    const p = playerRef.current;
    if (p) {
      p.position.x = s.playerLane * LANE_W;
      p.position.y = s.jumpY * JUMP_WORLD;
      p.rotation.z = (s.playerLane - s.targetLane) * 0.18;
    }
    if (runActionRef.current) {
      runActionRef.current.timeScale = playing
        ? THREE.MathUtils.clamp(s.speed / 6, 0.15, 2.4)
        : 0.15;
    }

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

    roadTex.offset.y = (s.distance * 0.085) % 1;

    if (hud.dist.current) hud.dist.current.textContent = `${Math.round(s.distance)} m`;
    if (hud.coin.current) hud.coin.current.textContent = `◉ ${s.coins}`;
    if (hud.gauge.current) {
      const g = THREE.MathUtils.clamp((s.speed - 2.5) / (15 - 2.5), 0, 1);
      hud.gauge.current.style.width = `${g * 100}%`;
    }

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
        shadow-mapSize={[768, 768]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]} receiveShadow>
        <planeGeometry args={[LANE_W * 3, 80]} />
        <meshStandardMaterial map={roadTex} color="#5b6cab" />
      </mesh>

      <group ref={playerRef} position={[0, 0, 0]}>
        <Suspense fallback={<FallbackRunner />}>
          <Runner runActionRef={runActionRef} />
        </Suspense>
      </group>

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
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[1.0, 1.2, 1.0]} />
            <meshStandardMaterial color="#ef4444" roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.38, 0.13, 12, 24]} />
            <meshStandardMaterial
              color="#fbbf24"
              metalness={0.7}
              roughness={0.25}
              emissive="#7a5300"
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Runner({
  runActionRef,
}: {
  runActionRef: React.MutableRefObject<THREE.AnimationAction | null>;
}) {
  const { scene, animations } = useGLTF(RUNNER_URL);
  const ref = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, ref);

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

function FallbackRunner() {
  return (
    <mesh position={[0, 0.9, 0]} castShadow>
      <capsuleGeometry args={[0.35, 0.9, 6, 12]} />
      <meshStandardMaterial color="#10b981" />
    </mesh>
  );
}
