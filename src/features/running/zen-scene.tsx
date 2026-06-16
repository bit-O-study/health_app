"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/* 귀여운 로봇 캐릭터(Running/Idle 내장). 자체 호스팅. 지연 로드 모듈이라 preload 안전. */
const ROBOT_URL = "/models/runner-robot.glb";
if (typeof window !== "undefined") useGLTF.preload(ROBOT_URL);

const MAX_SCROLL = 8; // 달리기 강도 1일 때 초당 월드 이동량

export type ZenHud = { dist: React.RefObject<HTMLSpanElement | null> };

export default function ZenScene({
  runRef,
  hud,
}: {
  runRef: React.MutableRefObject<number>;
  hud: ZenHud;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0.6, 2.4, 12], fov: 40 }}
      onCreated={({ camera }) => camera.lookAt(3.4, 2.1, -8)}
      className="absolute inset-0"
    >
      <Sky />
      <hemisphereLight args={["#fdf3ff", "#bfe6a8", 1.35]} />
      <directionalLight
        position={[7, 10, 6]}
        intensity={1.9}
        color="#fff2cf"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <World runRef={runRef} hud={hud} />
    </Canvas>
  );
}

/** 부드러운 파스텔 그라데이션 하늘 + 해(은은한 글로우) + 옅은 안개. */
function Sky() {
  const { scene } = useThree();
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#bfe9ff"); // 맑은 하늘
    g.addColorStop(0.45, "#dff3ff");
    g.addColorStop(0.78, "#fff1e6");
    g.addColorStop(1, "#ffe6c2"); // 따뜻한 지평선
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => {
    const prev = scene.background;
    scene.background = tex;
    scene.fog = new THREE.Fog("#eaf6ec", 30, 64);
    return () => {
      scene.background = prev;
    };
  }, [scene, tex]);
  return (
    <group position={[11, 7.5, -34]}>
      {/* 글로우 */}
      <mesh>
        <circleGeometry args={[5.2, 40]} />
        <meshBasicMaterial color="#fff7d6" transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.1]}>
        <circleGeometry args={[2.8, 40]} />
        <meshBasicMaterial color="#fff4bf" />
      </mesh>
    </group>
  );
}

function World({
  runRef,
  hud,
}: {
  runRef: React.MutableRefObject<number>;
  hud: ZenHud;
}) {
  const groundMat = useRef<THREE.MeshStandardMaterial>(null);
  const trees = useRef<THREE.Group[]>([]);
  const flowers = useRef<THREE.Group[]>([]);
  const nearHills = useRef<THREE.Mesh[]>([]);
  const farHills = useRef<THREE.Mesh[]>([]);
  const mountains = useRef<THREE.Mesh[]>([]);
  const clouds = useRef<THREE.Group[]>([]);
  const distRef = useRef(0);

  const grassTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#9bd877";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = i % 2 ? "#90d069" : "#a8e085";
      ctx.fillRect((i * 53) % 128, (i * 31) % 128, 3, 6);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(24, 7);
    return t;
  }, []);

  const treeData = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        x: -18 + i * 4.6,
        z: -2.2 - (i % 3) * 1.1,
        s: 0.85 + ((i * 7) % 5) / 8,
        c: ["#74c95f", "#86d36c", "#65bd7e"][i % 3],
      })),
    [],
  );
  const flowerData = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        x: -16 + i * 2.1,
        z: i % 2 ? 1.7 + (i % 3) * 0.6 : -1.4 - (i % 3) * 0.5,
        c: ["#ff9ec4", "#fff1a8", "#ffffff", "#c9a8ff"][i % 4],
      })),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta);
    const run = runRef.current;
    const dx = run * MAX_SCROLL * dt;
    distRef.current += dx;

    if (groundMat.current?.map) groundMat.current.map.offset.x += dx * 0.05;

    const recycle = (
      arr: (THREE.Object3D | undefined)[],
      pf: number,
      left: number,
      span: number,
    ) =>
      arr.forEach((o) => {
        if (!o) return;
        o.position.x -= dx * pf;
        if (o.position.x < left) o.position.x += span;
      });

    recycle(trees.current, 1, -20, treeData.length * 4.6);
    recycle(flowers.current, 1, -18, flowerData.length * 2.1);
    recycle(nearHills.current, 0.5, -34, nearHills.current.length * 14);
    recycle(farHills.current, 0.3, -48, farHills.current.length * 18);
    recycle(mountains.current, 0.16, -64, mountains.current.length * 26);
    // 구름은 자체 드리프트도 살짝
    clouds.current.forEach((g) => {
      if (!g) return;
      g.position.x -= dx * 0.14 + dt * 0.22;
      if (g.position.x < -42) g.position.x += clouds.current.length * 14;
    });

    if (hud.dist.current)
      hud.dist.current.textContent = `${Math.round(distRef.current)} m`;
  });

  return (
    <>
      {/* 지면(풀밭) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[140, 40]} />
        <meshStandardMaterial ref={groundMat} map={grassTex} color="#a6e285" />
      </mesh>
      {/* 캐릭터 발밑 오솔길 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <planeGeometry args={[140, 2.4]} />
        <meshStandardMaterial color="#f1ddb4" />
      </mesh>

      {/* 먼 산(가장 옅게) — 지평선 위로 살짝 솟은 봉우리 */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={`mt${i}`}
          ref={(m) => {
            if (m) mountains.current[i] = m;
          }}
          position={[-64 + i * 26, -0.6, -36]}
          scale={[1.4, 1, 1]}
        >
          <coneGeometry args={[7, 6.5, 5]} />
          <meshStandardMaterial color="#c4e3da" flatShading />
        </mesh>
      ))}
      {/* 먼 언덕 — 넓고 낮은 둔덕(납작한 구) */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={`fh${i}`}
          ref={(m) => {
            if (m) farHills.current[i] = m;
          }}
          position={[-48 + i * 18, -1.7, -25]}
          scale={[2.0, 0.42, 1]}
        >
          <sphereGeometry args={[7, 24, 16]} />
          <meshStandardMaterial color="#cdecaa" />
        </mesh>
      ))}
      {/* 가까운 언덕 */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={`nh${i}`}
          ref={(m) => {
            if (m) nearHills.current[i] = m;
          }}
          position={[-34 + i * 14, -1.2, -15]}
          scale={[1.8, 0.45, 1]}
        >
          <sphereGeometry args={[6, 24, 16]} />
          <meshStandardMaterial color="#aedd82" />
        </mesh>
      ))}

      {/* 나무 */}
      {treeData.map((t, i) => (
        <group
          key={`t${i}`}
          ref={(g) => {
            if (g) trees.current[i] = g;
          }}
          position={[t.x, 0, t.z]}
          scale={t.s}
        >
          <mesh position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.22, 1.4, 8]} />
            <meshStandardMaterial color="#c0915f" />
          </mesh>
          <mesh position={[0, 1.75, 0]} castShadow>
            <sphereGeometry args={[0.9, 16, 14]} />
            <meshStandardMaterial color={t.c} />
          </mesh>
          <mesh position={[0.5, 1.3, 0.2]} castShadow>
            <sphereGeometry args={[0.58, 14, 12]} />
            <meshStandardMaterial color={t.c} />
          </mesh>
        </group>
      ))}

      {/* 꽃 */}
      {flowerData.map((f, i) => (
        <group
          key={`f${i}`}
          ref={(g) => {
            if (g) flowers.current[i] = g;
          }}
          position={[f.x, 0, f.z]}
        >
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.32, 5]} />
            <meshStandardMaterial color="#6fae54" />
          </mesh>
          <mesh position={[0, 0.34, 0]} castShadow>
            <sphereGeometry args={[0.11, 10, 8]} />
            <meshStandardMaterial color={f.c} />
          </mesh>
        </group>
      ))}

      {/* 구름 */}
      {Array.from({ length: 6 }).map((_, i) => (
        <group
          key={`c${i}`}
          ref={(g) => {
            if (g) clouds.current[i] = g;
          }}
          position={[-42 + i * 14, 6.8 + (i % 3) * 0.8, -16]}
        >
          {[
            [0, 0, 0.95],
            [0.85, 0.1, 0.72],
            [-0.85, 0.05, 0.68],
            [0.25, 0.42, 0.62],
          ].map(([x, y, r], j) => (
            <mesh key={j} position={[x, y, 0]}>
              <sphereGeometry args={[r, 14, 12]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      ))}

      <Robot runRef={runRef} />
    </>
  );
}

/** 로봇 캐릭터 — 달릴 때 Running, 멈추면 Idle. 화면 오른쪽(+X)을 보고 달린다. */
function Robot({ runRef }: { runRef: React.MutableRefObject<number> }) {
  const { scene, animations } = useGLTF(ROBOT_URL);
  const ref = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, ref);
  const activeRef = useRef<THREE.AnimationAction | null>(null);
  const bobRef = useRef(0);

  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = 1.5 / (size.y || 1);
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = true;
    });
    return { scale, yOffset: -box.min.y * (1.5 / (size.y || 1)) };
  }, [scene]);

  useEffect(() => {
    const idle = actions["Idle"] ?? null;
    idle?.reset().play();
    activeRef.current = idle;
  }, [actions]);

  useFrame((_, delta) => {
    const run = runRef.current;
    const running = run > 0.06;
    const want = running ? actions["Running"] : actions["Idle"];
    if (want && want !== activeRef.current) {
      activeRef.current?.fadeOut(0.25);
      want.reset().fadeIn(0.25).play();
      activeRef.current = want;
    }
    if (running && actions["Running"]) {
      actions["Running"].timeScale = 0.7 + run * 1.4;
    }
    bobRef.current += running ? delta * (6 + run * 6) : 0;
    if (ref.current) {
      ref.current.position.y =
        fit.yOffset + (running ? Math.abs(Math.sin(bobRef.current)) * 0.12 : 0);
    }
  });

  return (
    <group
      ref={ref}
      position={[2.2, fit.yOffset, 0]}
      scale={fit.scale}
      rotation={[0, Math.PI / 2, 0]}
    >
      <primitive object={scene} />
    </group>
  );
}
