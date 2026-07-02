"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import { Flame } from "lucide-react";

import type { RankedMember } from "@/features/groups/ranking";
import { wolfScale } from "@/features/groups/gym";

const MODEL = "/wolf/wolf.glb";
useGLTF.preload(MODEL);

// 바닥 배회 범위.
const BX = 3.1;
const BZ = 1.5;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

type WolfProps = {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
  fit: number;
  level: number;
  start: [number, number, number];
  selected: boolean;
  onSelect: () => void;
};

function Wolf({ scene, animations, fit, level, start, selected, onSelect }: WolfProps) {
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned]);
  const ref = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3(rand(-BX, BX), 0, rand(-BZ, BZ)));
  const speed = useRef(rand(0.35, 0.7));
  const pauseT = useRef(0);

  useEffect(() => {
    const walk =
      THREE.AnimationClip.findByName(animations, "Walk") ??
      animations.find((a) => /walk/i.test(a.name)) ??
      animations[0];
    const idle =
      THREE.AnimationClip.findByName(animations, "Idle") ??
      animations.find((a) => /idle/i.test(a.name)) ??
      walk;
    // 이름표를 위해 사용자데이터에 저장
    (cloned.userData as { walk?: THREE.AnimationClip; idle?: THREE.AnimationClip }).walk = walk;
    (cloned.userData as { idle?: THREE.AnimationClip }).idle = idle;
    const action = mixer.clipAction(walk);
    action.play();
    return () => {
      mixer.stopAllAction();
    };
  }, [animations, mixer, cloned]);

  useFrame((_, dt) => {
    mixer.update(dt);
    const g = ref.current;
    if (!g) return;
    if (pauseT.current > 0) {
      pauseT.current -= dt;
      return;
    }
    const pos = g.position;
    const dir = target.current.clone().sub(pos);
    dir.y = 0;
    const dist = dir.length();
    if (dist < 0.12) {
      // 도착 → 잠깐 쉬고 새 목적지
      pauseT.current = rand(0.4, 1.6);
      target.current.set(rand(-BX, BX), 0, rand(-BZ, BZ));
      return;
    }
    dir.normalize();
    pos.addScaledVector(dir, speed.current * dt);
    // 진행 방향 바라보기(부드럽게)
    const wanted = Math.atan2(dir.x, dir.z);
    let diff = wanted - g.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    g.rotation.y += diff * Math.min(1, dt * 8);
  });

  const s = fit * wolfScale(level);
  return (
    <group ref={ref} position={start}>
      <group
        scale={s}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <primitive object={cloned} />
      </group>
      {selected ? (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.6, 40]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.9} />
        </mesh>
      ) : null}
    </group>
  );
}

function Dumbbell({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 12]} />
        <meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-0.28, 0.28].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.14, 20]} />
          <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function GymScene({
  members,
  selId,
  onSelect,
}: {
  members: RankedMember[];
  selId: string | null;
  onSelect: (id: string) => void;
}) {
  const { scene, animations } = useGLTF(MODEL);
  // 모델 높이로 스케일 자동 맞춤(≈0.9 유닛).
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    return 0.95 / (size.y || 1);
  }, [scene]);

  const n = members.length;
  return (
    <>
      <hemisphereLight args={["#ffffff", "#b8c0cc", 0.9]} />
      <directionalLight position={[4, 7, 4]} intensity={1.15} />
      <directionalLight position={[-4, 4, -2]} intensity={0.35} />

      {/* 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[14, 9]} />
        <meshStandardMaterial color="#e6ddca" />
      </mesh>
      {/* 운동 매트 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0.4]}>
        <planeGeometry args={[6, 3.2]} />
        <meshStandardMaterial color="#4f7cac" />
      </mesh>
      {/* 뒷벽 */}
      <mesh position={[0, 2, -2.4]}>
        <planeGeometry args={[14, 5]} />
        <meshStandardMaterial color="#dbe7f2" />
      </mesh>
      {/* 거울(벽 포인트) */}
      <mesh position={[-4, 1.5, -2.36]}>
        <planeGeometry args={[2.4, 2.6]} />
        <meshStandardMaterial color="#aac4dc" metalness={0.7} roughness={0.15} />
      </mesh>

      <Dumbbell position={[3.4, 0.16, -1.4]} />
      <Dumbbell position={[3.9, 0.16, -1.1]} />
      {/* 벤치 */}
      <mesh position={[-3.4, 0.25, -1]}>
        <boxGeometry args={[1.4, 0.12, 0.5]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {members.map((m, i) => {
        const start: [number, number, number] = [
          (i - (n - 1) / 2) * 1.1,
          0,
          i % 2 === 0 ? 0.4 : -0.5,
        ];
        return (
          <Wolf
            key={m.userId}
            scene={scene}
            animations={animations}
            fit={fit}
            level={m.level}
            start={start}
            selected={selId === m.userId}
            onSelect={() => onSelect(m.userId)}
          />
        );
      })}

      <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={12} blur={2.4} far={4} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.28}
        maxPolarAngle={Math.PI * 0.46}
        rotateSpeed={0.5}
      />
    </>
  );
}

/** 3D 헬스장 — 그룹원 늑대들이 걸어다니고, 클릭하면 위에 닉네임 + 오늘 칼로리. */
export function Gym3D({ members }: { members: RankedMember[] }) {
  const [selId, setSelId] = useState<string | null>(members[0]?.userId ?? null);
  const sel = members.find((m) => m.userId === selId) ?? members[0] ?? null;

  return (
    <div className="mb-4">
      <div className="mb-1 flex min-h-[2.25rem] items-center justify-center rounded-xl bg-zinc-100 px-3 py-1.5 dark:bg-zinc-800/60">
        {sel ? (
          <p className="flex flex-wrap items-center justify-center gap-x-2 text-sm">
            <span className="font-extrabold text-zinc-900 dark:text-zinc-100">
              {sel.name}
              {sel.isMe ? (
                <span className="ml-1 text-[10px] font-bold text-emerald-600">나</span>
              ) : null}
            </span>
            <span className="rounded-full bg-violet-500 px-1.5 text-[10px] font-bold text-white">
              Lv.{sel.level}
            </span>
            <span className="flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400">
              <Flame aria-hidden="true" size={13} /> 오늘 {sel.todayBurned.toLocaleString()}kcal
            </span>
          </p>
        ) : (
          <p className="text-xs text-zinc-400">아직 그룹원이 없어요.</p>
        )}
      </div>

      <div className="h-56 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-b from-sky-100 to-zinc-100 dark:border-zinc-800 dark:from-sky-950/40 dark:to-zinc-900">
        <Canvas shadows={false} dpr={[1, 1.6]} camera={{ position: [0, 3, 5.6], fov: 34 }}>
          <color attach="background" args={["#eaf1f8"]} />
          <GymScene members={members} selId={selId} onSelect={setSelId} />
        </Canvas>
      </div>
      <p className="mt-1 text-center text-[10px] text-zinc-400">
        드래그해서 둘러보기 · 늑대를 누르면 정보가 나와요
      </p>
    </div>
  );
}
