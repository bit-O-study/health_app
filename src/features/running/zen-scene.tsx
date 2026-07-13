"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/* 귀여운 로봇 캐릭터(Running/Idle 내장). 자체 호스팅. 지연 로드 모듈이라 preload 안전. */
const ROBOT_URL = "/models/runner-robot.glb";
if (typeof window !== "undefined") useGLTF.preload(ROBOT_URL);

const MAX_SCROLL = 8; // 달리기 강도 1일 때 초당 월드 이동량
const SEGMENT_M = 250; // 이 거리마다 다음 맵으로 전환

/** 맵(테마) 팔레트 — 하늘/안개/조명/지면/식생 색을 한 세트로. */
export type MapPreset = {
  name: string;
  sky: [string, string, string, string]; // 위→아래 그라데이션
  fog: string;
  sunGlow: string;
  sunCore: string;
  hemiSky: string;
  hemiGround: string;
  dirColor: string;
  ground: string;
  grassBase: string;
  grassBladeA: string;
  grassBladeB: string;
  path: string;
  trees: [string, string, string];
  flowers: [string, string, string, string];
  nearHill: string;
  farHill: string;
  mountain: string;
  cloud: string;
};

const MAPS: MapPreset[] = [
  {
    name: "초원",
    sky: ["#bfe9ff", "#dff3ff", "#fff1e6", "#ffe6c2"],
    fog: "#eaf6ec",
    sunGlow: "#fff7d6",
    sunCore: "#fff4bf",
    hemiSky: "#fdf3ff",
    hemiGround: "#bfe6a8",
    dirColor: "#fff2cf",
    ground: "#a6e285",
    grassBase: "#9bd877",
    grassBladeA: "#a8e085",
    grassBladeB: "#90d069",
    path: "#f1ddb4",
    trees: ["#74c95f", "#86d36c", "#65bd7e"],
    flowers: ["#ff9ec4", "#fff1a8", "#ffffff", "#c9a8ff"],
    nearHill: "#aedd82",
    farHill: "#cdecaa",
    mountain: "#c4e3da",
    cloud: "#ffffff",
  },
  {
    name: "노을",
    sky: ["#ffd08a", "#ffb27a", "#ff8f9e", "#c86fb0"],
    fog: "#f7d9c4",
    sunGlow: "#ffe0a0",
    sunCore: "#ffd27a",
    hemiSky: "#ffe3c0",
    hemiGround: "#e0a878",
    dirColor: "#ffd9a0",
    ground: "#cdae7f",
    grassBase: "#cdae7f",
    grassBladeA: "#d8bd8f",
    grassBladeB: "#c2a374",
    path: "#e9cfa8",
    trees: ["#b98a5a", "#a9764d", "#c99a63"],
    flowers: ["#ff9ec4", "#ffd27a", "#ffffff", "#ffb0a0"],
    nearHill: "#c9a06f",
    farHill: "#d8b98a",
    mountain: "#b98fa8",
    cloud: "#ffe3d0",
  },
  {
    name: "벚꽃길",
    sky: ["#ffe6f2", "#ffeef7", "#fff4ef", "#ffe9d6"],
    fog: "#fbe6ef",
    sunGlow: "#fff0f6",
    sunCore: "#ffe6f0",
    hemiSky: "#fff0f6",
    hemiGround: "#e8c0d0",
    dirColor: "#fff0e6",
    ground: "#bfe0a0",
    grassBase: "#b8dc98",
    grassBladeA: "#c6e6a8",
    grassBladeB: "#aed488",
    path: "#f0dcc0",
    trees: ["#ffb7d5", "#ffc9e0", "#ff9ec4"],
    flowers: ["#ff9ec4", "#ffffff", "#ffd6e8", "#c9a8ff"],
    nearHill: "#c4e2a0",
    farHill: "#d6ecb6",
    mountain: "#e0c4d4",
    cloud: "#ffffff",
  },
  {
    name: "별밤",
    sky: ["#1b2450", "#2a3566", "#3f4a80", "#5a4a78"],
    fog: "#2a3560",
    sunGlow: "#aeb8ff",
    sunCore: "#dfe6ff",
    hemiSky: "#3a4680",
    hemiGround: "#1e2a4a",
    dirColor: "#c8d0ff",
    ground: "#2f6b4a",
    grassBase: "#2c6446",
    grassBladeA: "#357552",
    grassBladeB: "#245539",
    path: "#4a5570",
    trees: ["#2f7a52", "#286a47", "#358a5c"],
    flowers: ["#9ec4ff", "#c9a8ff", "#ffffff", "#a8ffe0"],
    nearHill: "#2a6b4a",
    farHill: "#356b52",
    mountain: "#3a4670",
    cloud: "#5a6690",
  },
];

export type ZenHud = {
  dist: React.RefObject<HTMLSpanElement | null>;
  /** 선택: 현재 맵 이름을 표시할 요소. */
  map?: React.RefObject<HTMLSpanElement | null>;
};

export default function ZenScene({
  runRef,
  hud,
}: {
  runRef: React.MutableRefObject<number>;
  hud: ZenHud;
}) {
  const [mapIndex, setMapIndex] = useState(0);
  const preset = MAPS[mapIndex];

  // 현재 맵 이름 HUD 갱신.
  useEffect(() => {
    if (hud.map?.current) hud.map.current.textContent = preset.name;
  }, [preset, hud]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0.6, 2.4, 12], fov: 40 }}
      onCreated={({ camera }) => camera.lookAt(3.4, 2.1, -8)}
      className="absolute inset-0"
    >
      <Sky preset={preset} />
      <hemisphereLight args={[preset.hemiSky, preset.hemiGround, 1.35]} />
      <directionalLight
        position={[7, 10, 6]}
        intensity={1.9}
        color={preset.dirColor}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <World
        runRef={runRef}
        hud={hud}
        preset={preset}
        onAdvanceMap={() => setMapIndex((i) => (i + 1) % MAPS.length)}
      />
    </Canvas>
  );
}

/** 부드러운 그라데이션 하늘 + 해/달(은은한 글로우) + 옅은 안개. 맵 프리셋에 따라 색이 바뀐다. */
function Sky({ preset }: { preset: MapPreset }) {
  const { scene } = useThree();
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, preset.sky[0]);
    g.addColorStop(0.45, preset.sky[1]);
    g.addColorStop(0.78, preset.sky[2]);
    g.addColorStop(1, preset.sky[3]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 256);
    return new THREE.CanvasTexture(c);
  }, [preset]);
  useEffect(() => {
    const prev = scene.background;
    const prevFog = scene.fog;
    scene.background = tex;
    scene.fog = new THREE.Fog(preset.fog, 30, 64);
    return () => {
      scene.background = prev;
      scene.fog = prevFog;
      tex.dispose(); // 수동 생성 텍스처 GPU 메모리 해제
    };
  }, [scene, tex, preset.fog]);
  return (
    <group position={[11, 7.5, -34]}>
      {/* 글로우 */}
      <mesh>
        <circleGeometry args={[5.2, 40]} />
        <meshBasicMaterial color={preset.sunGlow} transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.1]}>
        <circleGeometry args={[2.8, 40]} />
        <meshBasicMaterial color={preset.sunCore} />
      </mesh>
    </group>
  );
}

function World({
  runRef,
  hud,
  preset,
  onAdvanceMap,
}: {
  runRef: React.MutableRefObject<number>;
  hud: ZenHud;
  preset: MapPreset;
  onAdvanceMap: () => void;
}) {
  const groundMat = useRef<THREE.MeshStandardMaterial>(null);
  const trees = useRef<THREE.Group[]>([]);
  const flowers = useRef<THREE.Group[]>([]);
  const nearHills = useRef<THREE.Mesh[]>([]);
  const farHills = useRef<THREE.Mesh[]>([]);
  const mountains = useRef<THREE.Mesh[]>([]);
  const clouds = useRef<THREE.Group[]>([]);
  const distRef = useRef(0);
  const nextSwitchRef = useRef(SEGMENT_M);

  const grassTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = preset.grassBase;
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = i % 2 ? preset.grassBladeB : preset.grassBladeA;
      ctx.fillRect((i * 53) % 128, (i * 31) % 128, 3, 6);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(24, 7);
    return t;
  }, [preset]);
  useEffect(() => () => grassTex.dispose(), [grassTex]); // 언마운트/맵변경 시 GPU 텍스처 해제

  // 나무/꽃 배치는 고정, 색만 프리셋에서(달릴 때 순환).
  const treeLayout = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        x: -18 + i * 4.6,
        z: -2.2 - (i % 3) * 1.1,
        s: 0.85 + ((i * 7) % 5) / 8,
        ci: i % 3,
      })),
    [],
  );
  const flowerLayout = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        x: -16 + i * 2.1,
        z: i % 2 ? 1.7 + (i % 3) * 0.6 : -1.4 - (i % 3) * 0.5,
        ci: i % 4,
      })),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta);
    const run = runRef.current;
    const dx = run * MAX_SCROLL * dt;
    distRef.current += dx;

    // 일정 거리마다 다음 맵으로.
    if (distRef.current >= nextSwitchRef.current) {
      nextSwitchRef.current += SEGMENT_M;
      onAdvanceMap();
    }

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

    recycle(trees.current, 1, -20, treeLayout.length * 4.6);
    recycle(flowers.current, 1, -18, flowerLayout.length * 2.1);
    recycle(nearHills.current, 0.5, -34, nearHills.current.length * 14);
    recycle(farHills.current, 0.3, -48, farHills.current.length * 18);
    recycle(mountains.current, 0.16, -64, mountains.current.length * 26);
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
        <meshStandardMaterial ref={groundMat} map={grassTex} color={preset.ground} />
      </mesh>
      {/* 캐릭터 발밑 오솔길 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <planeGeometry args={[140, 2.4]} />
        <meshStandardMaterial color={preset.path} />
      </mesh>

      {/* 먼 산 */}
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
          <meshStandardMaterial color={preset.mountain} flatShading />
        </mesh>
      ))}
      {/* 먼 언덕 */}
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
          <meshStandardMaterial color={preset.farHill} />
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
          <meshStandardMaterial color={preset.nearHill} />
        </mesh>
      ))}

      {/* 나무 */}
      {treeLayout.map((t, i) => (
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
            <meshStandardMaterial color={preset.trees[t.ci]} />
          </mesh>
          <mesh position={[0.5, 1.3, 0.2]} castShadow>
            <sphereGeometry args={[0.58, 14, 12]} />
            <meshStandardMaterial color={preset.trees[t.ci]} />
          </mesh>
        </group>
      ))}

      {/* 꽃 */}
      {flowerLayout.map((f, i) => (
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
            <meshStandardMaterial color={preset.flowers[f.ci]} />
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
              <meshStandardMaterial color={preset.cloud} />
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
