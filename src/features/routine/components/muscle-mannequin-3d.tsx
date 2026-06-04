"use client";

/**
 * 3D 근육 마네킹 — three.js / react-three-fiber.
 *
 * - 살색의 유기적인 인체 실루엣(머리·목·몸통·팔·다리)을 베이스로 깐다.
 * - 세부 근육(이두 장두/단두, 삼두 3갈래, 가슴 상중하·내측 등)은 평소엔 보이지
 *   않다가, 선택/호버하면 그 사람 몸 위에서 빛난다(글로우). 보이지 않을 때도
 *   레이캐스트는 되므로 탭/클릭은 가능하다.
 * - OrbitControls 로 한 손가락 회전(앞↔뒤), 두 손가락 핀치 줌.
 * - 부드러운 조명 + 바닥 ContactShadows 로 기계 느낌을 줄인다.
 * - WebGL 캔버스는 키보드·E2E 로 클릭이 어려워, 부모(피커)가 접근성 칩을 함께
 *   렌더한다. 이 컴포넌트는 캔버스만 책임진다.
 *
 * GLTF 해부학/휴먼 모델 드롭인:
 *   public/models/anatomy.glb 를 넣고 ANATOMY_MODEL_URL 을 그 경로로 바꾸면
 *   절차적 인체 대신 그 모델을 쓰고, 메쉬 이름을 세부근육 id 로 매핑한다.
 *   로드 실패 시 자동으로 절차적 인체로 폴백한다.
 *
 * 이 파일은 부모에서 next/dynamic(ssr:false) 로 불러온다(WebGL = 클라이언트 전용).
 */

import {
  Component,
  Suspense,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import {
  Box3,
  Color,
  MeshStandardMaterial,
  Vector3,
  type Group,
  type Mesh,
} from "three";

import { subMuscleColor } from "@/features/routine/muscle-detail";
import type { MuscleId } from "@/features/routine/muscle-map";

/**
 * 해부학 GLB 경로. 이 파일을 public/models/anatomy.glb 로 넣으면 자동으로 그 모델을
 * 쓰고(메쉬 이름 자동 매핑), 없으면 절차적 인체로 자연스럽게 폴백한다.
 * (다른 경로/끄기를 원하면 이 값을 바꾸거나 null 로.)
 */
const ANATOMY_MODEL_URL: string | null = "/models/anatomy.glb";

/** 살색 톤 */
const SKIN = "#e7b48f";

export type MannequinGender = "male" | "female";

/** 성인 남/녀 체형 비율 — 어깨·허리·골반·사지 두께·가슴(여) 차이. */
type Proportion = {
  shoulderX: number; // 어깨(삼각근) 중심 x
  shoulderR: number;
  chestScaleX: number; // 가슴(상부 몸통) 가로 스케일
  waistScaleX: number; // 허리 가로 스케일
  hipScaleX: number; // 골반 가로 스케일
  armX: number; // 팔 중심 x
  limb: number; // 사지 굵기 배수
  legX: number; // 다리 중심 x
  bust: boolean; // 가슴 돌출(여)
  upperX: number; // 상체 근육 오버레이 x 배수
  lowerX: number; // 하체 근육 오버레이 x 배수
};

const PROPORTION: Record<MannequinGender, Proportion> = {
  // 성인 남성: 넓은 어깨 + V 테이퍼 + 두꺼운 사지 + 좁은 골반
  male: {
    shoulderX: 0.47,
    shoulderR: 0.17,
    chestScaleX: 1.5,
    waistScaleX: 1.08,
    hipScaleX: 1.12,
    armX: 0.56,
    limb: 1.0,
    legX: 0.16,
    bust: false,
    upperX: 1,
    lowerX: 1,
  },
  // 성인 여성: 좁은 어깨 + 잘록한 허리 + 넓은 골반(엉덩이) + 가는 사지 + 가슴
  female: {
    shoulderX: 0.37,
    shoulderR: 0.135,
    chestScaleX: 1.18,
    waistScaleX: 0.86,
    hipScaleX: 1.42,
    armX: 0.46,
    limb: 0.82,
    legX: 0.18,
    bust: true,
    upperX: 0.82,
    lowerX: 1.12,
  },
};

type MannequinProps = {
  /** 체형 (성인 남/녀) */
  gender?: MannequinGender;
  /** 현재 하이라이트할 세부 근육 id 집합 */
  activeSubs: ReadonlySet<string>;
  /** 세부 근육 메쉬를 탭했을 때 */
  onSelectSub: (subId: string) => void;
};

/* ───────────────────────── 살색 인체 베이스 (비클릭) ───────────────────────── */

function Skin(props: {
  position: [number, number, number];
  scale?: [number, number, number];
  children: ReactNode;
}) {
  return (
    <mesh position={props.position} scale={props.scale}>
      {props.children}
      <meshStandardMaterial color={SKIN} roughness={0.72} metalness={0.02} />
    </mesh>
  );
}

/** 좌우 대칭 살 부위 한 쌍 */
function SkinPair(props: {
  pos: [number, number, number];
  scale?: [number, number, number];
  children: ReactNode;
}) {
  const [x, y, z] = props.pos;
  return (
    <>
      <Skin position={[x, y, z]} scale={props.scale}>
        {props.children}
      </Skin>
      <Skin position={[-x, y, z]} scale={props.scale}>
        {props.children}
      </Skin>
    </>
  );
}

function HumanBody({ gender }: { gender: MannequinGender }) {
  const g = PROPORTION[gender] ?? PROPORTION.male;
  const armR = 0.092 * g.limb;
  const foreR = 0.075 * g.limb;
  return (
    <group>
      {/* 머리 · 목 (성인 비율 — 머리 작게) */}
      <Skin position={[0, 1.67, 0]} scale={[0.9, 1.08, 0.92]}>
        <sphereGeometry args={[0.165, 28, 28]} />
      </Skin>
      <Skin position={[0, 1.52, 0]}>
        <capsuleGeometry args={[0.07, 0.09, 8, 16]} />
      </Skin>

      {/* 몸통 — 가슴(어깨너비) → 허리(잘록) → 골반 */}
      <Skin position={[0, 1.16, 0]} scale={[g.chestScaleX, 1, 0.62]}>
        <capsuleGeometry args={[0.26, 0.2, 10, 24]} />
      </Skin>
      <Skin position={[0, 0.8, 0]} scale={[g.waistScaleX, 1, 0.6]}>
        <capsuleGeometry args={[0.2, 0.2, 10, 24]} />
      </Skin>
      <Skin position={[0, 0.48, 0]} scale={[g.hipScaleX, 1, 0.8]}>
        <capsuleGeometry args={[0.2, 0.08, 10, 24]} />
      </Skin>

      {/* 가슴 돌출 (여성) */}
      {g.bust ? (
        <SkinPair pos={[0.12, 1.08, 0.16]} scale={[1, 0.95, 0.95]}>
          <sphereGeometry args={[0.085, 18, 18]} />
        </SkinPair>
      ) : null}

      {/* 어깨(삼각근 캡) */}
      <SkinPair pos={[g.shoulderX, 1.32, 0]} scale={[1, 1, 0.9]}>
        <sphereGeometry args={[g.shoulderR, 20, 20]} />
      </SkinPair>

      {/* 팔 — 상완 · 팔꿈치 · 전완 · 손 */}
      <SkinPair pos={[g.armX, 1.02, 0]}>
        <capsuleGeometry args={[armR, 0.32, 8, 16]} />
      </SkinPair>
      <SkinPair pos={[g.armX + 0.02, 0.79, 0]}>
        <sphereGeometry args={[foreR + 0.005, 16, 16]} />
      </SkinPair>
      <SkinPair pos={[g.armX + 0.02, 0.55, 0]}>
        <capsuleGeometry args={[foreR, 0.3, 8, 16]} />
      </SkinPair>
      <SkinPair pos={[g.armX + 0.03, 0.32, 0]} scale={[1, 1.25, 0.7]}>
        <sphereGeometry args={[0.075, 16, 16]} />
      </SkinPair>

      {/* 다리 — 허벅지 · 무릎 · 정강이 · 발 (성인 비율 — 다리 길게) */}
      <SkinPair pos={[g.legX, -0.08, 0]} scale={[1.05, 1, 0.95]}>
        <capsuleGeometry args={[0.14 * g.limb + 0.02, 0.42, 10, 20]} />
      </SkinPair>
      <SkinPair pos={[g.legX, -0.4, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
      </SkinPair>
      <SkinPair pos={[g.legX, -0.7, 0]}>
        <capsuleGeometry args={[0.095, 0.44, 10, 20]} />
      </SkinPair>
      <SkinPair pos={[g.legX, -1.02, 0.06]} scale={[1, 0.7, 1.9]}>
        <sphereGeometry args={[0.09, 14, 14]} />
      </SkinPair>
    </group>
  );
}

/* ───────────────────────── 세부근육 오버레이(클릭·글로우) ───────────────────────── */

type Shape = "box" | "sphere" | "capsule";
type SubMesh = {
  id: string;
  shape: Shape;
  /** box: [w,h,d] · sphere: [r] · capsule: [r,len] */
  args: number[];
  pos: [number, number, number];
  mirror?: boolean;
};

/** 세부 근육 오버레이 배치 — 살 표면보다 살짝 바깥에 둬서 글로우가 잘 보인다. */
const SUB_MESHES: SubMesh[] = [
  // 가슴 (정면 z+)
  { id: "chest-upper", shape: "box", args: [0.2, 0.13, 0.1], pos: [0.14, 1.22, 0.2], mirror: true },
  { id: "chest-mid", shape: "box", args: [0.2, 0.12, 0.1], pos: [0.14, 1.1, 0.21], mirror: true },
  { id: "chest-lower", shape: "box", args: [0.2, 0.11, 0.1], pos: [0.14, 0.99, 0.2], mirror: true },
  { id: "chest-inner", shape: "box", args: [0.08, 0.32, 0.08], pos: [0, 1.1, 0.22] },
  // 코어 (정면)
  { id: "core-upper-abs", shape: "box", args: [0.28, 0.16, 0.08], pos: [0, 0.78, 0.19] },
  { id: "core-lower-abs", shape: "box", args: [0.24, 0.16, 0.08], pos: [0, 0.58, 0.18] },
  { id: "core-obliques", shape: "box", args: [0.08, 0.28, 0.1], pos: [0.21, 0.66, 0.13], mirror: true },
  // 등 (후면 z-)
  { id: "back-traps", shape: "box", args: [0.34, 0.16, 0.08], pos: [0, 1.28, -0.16] },
  { id: "back-rhomboids", shape: "box", args: [0.3, 0.16, 0.08], pos: [0, 1.12, -0.17] },
  { id: "back-lats", shape: "box", args: [0.15, 0.32, 0.08], pos: [0.16, 0.98, -0.16], mirror: true },
  { id: "back-erector", shape: "box", args: [0.1, 0.36, 0.08], pos: [0, 0.74, -0.16] },
  // 어깨 (전/측/후)
  { id: "shoulder-front", shape: "sphere", args: [0.1], pos: [0.41, 1.3, 0.12], mirror: true },
  { id: "shoulder-side", shape: "sphere", args: [0.1], pos: [0.53, 1.3, 0], mirror: true },
  { id: "shoulder-rear", shape: "sphere", args: [0.1], pos: [0.41, 1.3, -0.12], mirror: true },
  // 팔 — 이두(앞) 장두 외측 / 단두 내측, 삼두(뒤) 장두·외측·내측, 전완
  { id: "arm-biceps-long", shape: "capsule", args: [0.055, 0.24], pos: [0.55, 1.0, 0.08], mirror: true },
  { id: "arm-biceps-short", shape: "capsule", args: [0.055, 0.24], pos: [0.47, 1.0, 0.08], mirror: true },
  { id: "arm-triceps-long", shape: "capsule", args: [0.05, 0.24], pos: [0.51, 1.02, -0.09], mirror: true },
  { id: "arm-triceps-lateral", shape: "capsule", args: [0.045, 0.22], pos: [0.59, 0.99, -0.06], mirror: true },
  { id: "arm-triceps-medial", shape: "capsule", args: [0.045, 0.22], pos: [0.44, 0.99, -0.06], mirror: true },
  { id: "arm-forearm", shape: "capsule", args: [0.06, 0.28], pos: [0.55, 0.55, 0.06], mirror: true },
  // 하체 — 대퇴사두(앞) 햄스트링(뒤) 내전근(안) 둔근 종아리
  { id: "lower-quads", shape: "capsule", args: [0.1, 0.34], pos: [0.16, -0.05, 0.1], mirror: true },
  { id: "lower-hamstrings", shape: "capsule", args: [0.095, 0.32], pos: [0.16, -0.05, -0.1], mirror: true },
  { id: "lower-adductors", shape: "capsule", args: [0.06, 0.28], pos: [0.07, -0.05, 0.04], mirror: true },
  { id: "lower-glutes", shape: "sphere", args: [0.12], pos: [0.13, 0.26, -0.13], mirror: true },
  { id: "lower-calves", shape: "capsule", args: [0.08, 0.32], pos: [0.15, -0.62, -0.08], mirror: true },
];

const MaterialContext = createContext<{
  color: string;
  active: boolean;
  hovered: boolean;
}>({ color: "#a1a1aa", active: false, hovered: false });

function GeometryFor({ shape, args }: { shape: Shape; args: number[] }) {
  if (shape === "box") return <boxGeometry args={[args[0], args[1], args[2]]} />;
  if (shape === "sphere") return <sphereGeometry args={[args[0], 18, 18]} />;
  return <capsuleGeometry args={[args[0], args[1], 8, 16]} />;
}

/** 평소엔 투명, 선택/호버 시 글로우. 보일 땐 살 위에 그려지도록 depthTest off. */
function MuscleSkinMesh({
  shape,
  args,
  position,
}: {
  shape: Shape;
  args: number[];
  position: [number, number, number];
}) {
  const { color, active, hovered } = useContext(MaterialContext);
  const visible = active || hovered;
  return (
    <mesh position={position} renderOrder={visible ? 3 : 0}>
      <GeometryFor shape={shape} args={args} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={active ? 0.85 : hovered ? 0.45 : 0}
        transparent
        opacity={active ? 0.92 : hovered ? 0.55 : 0}
        depthTest={!visible}
        depthWrite={false}
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  );
}

function SubMuscleMesh({
  def,
  active,
  hovered,
  onSelect,
  setHovered,
}: {
  def: SubMesh;
  active: boolean;
  hovered: boolean;
  onSelect: (id: string) => void;
  setHovered: (id: string | null) => void;
}) {
  const [x, y, z] = def.pos;
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect(def.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(def.id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(null);
        document.body.style.cursor = "default";
      }}
    >
      <MaterialContext.Provider
        value={{ color: subMuscleColor(def.id), active, hovered }}
      >
        <MuscleSkinMesh shape={def.shape} args={def.args} position={[x, y, z]} />
        {def.mirror ? (
          <MuscleSkinMesh
            shape={def.shape}
            args={def.args}
            position={[-x, y, z]}
          />
        ) : null}
      </MaterialContext.Provider>
    </group>
  );
}

function ProceduralBody({
  gender,
  activeSubs,
  onSelectSub,
}: {
  gender: MannequinGender;
  activeSubs: ReadonlySet<string>;
  onSelectSub: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const g = PROPORTION[gender] ?? PROPORTION.male;
  return (
    <group position={[0, -0.1, 0]}>
      <HumanBody gender={gender} />
      {SUB_MESHES.map((def) => {
        // 성별 체형에 맞춰 오버레이 가로 위치 보정 (상체/하체 따로)
        const sx = def.id.startsWith("lower-") ? g.lowerX : g.upperX;
        const scaled: SubMesh = {
          ...def,
          pos: [def.pos[0] * sx, def.pos[1], def.pos[2]],
        };
        return (
          <SubMuscleMesh
            key={def.id}
            def={scaled}
            active={activeSubs.has(def.id)}
            hovered={hovered === def.id}
            onSelect={onSelectSub}
            setHovered={setHovered}
          />
        );
      })}
    </group>
  );
}

/* ───────────────────────── GLTF 모델(드롭인) ───────────────────────── */

/**
 * 표준 해부학 메쉬 이름(영문·라틴) → 우리 세부근육 id 자동 매핑.
 * Z-Anatomy 등 대부분의 인체 모델 메쉬명이 이 규칙으로 대부분 자동 매핑된다.
 * 직접 매핑이 필요하면 MESH_NAME_OVERRIDE 에 추가.
 */
const MESH_NAME_OVERRIDE: Record<string, string> = {};

const KEYWORD_TO_SUB: [RegExp, string][] = [
  // 가슴
  [/clavicular|upper.*pec|pectoralis.*minor/, "chest-upper"],
  [/sternal|lower.*pec|abdominal.*head|costal/, "chest-lower"],
  [/pectoral/, "chest-mid"],
  // 어깨 (삼각근)
  [/anterior.*delt|deltoid.*anterior|clavicular.*delt/, "shoulder-front"],
  [/posterior.*delt|deltoid.*posterior|spinal.*delt/, "shoulder-rear"],
  [/deltoid/, "shoulder-side"],
  // 팔 — 이두/삼두/전완
  [/biceps.*long|long head.*bicep/, "arm-biceps-long"],
  [/biceps.*short|short head.*bicep/, "arm-biceps-short"],
  [/biceps/, "arm-biceps-long"],
  [/triceps.*lateral|lateral head/, "arm-triceps-lateral"],
  [/triceps.*medial|medial head/, "arm-triceps-medial"],
  [/triceps/, "arm-triceps-long"],
  [/brachioradialis|brachialis|flexor|extensor|forearm|pronator|carpi/, "arm-forearm"],
  // 등
  [/latissimus/, "back-lats"],
  [/trapezius/, "back-traps"],
  [/rhomboid/, "back-rhomboids"],
  [/erector|spinae|longissimus|iliocostalis|multifidus/, "back-erector"],
  // 코어
  [/oblique/, "core-obliques"],
  [/rectus abdominis|abdominis|abdominal/, "core-upper-abs"],
  // 하체
  [/rectus femoris|vastus|quadricep/, "lower-quads"],
  [/biceps femoris|semitendinosus|semimembranosus|hamstring/, "lower-hamstrings"],
  [/glute/, "lower-glutes"],
  [/adductor|gracilis|pectineus|sartorius/, "lower-adductors"],
  [/gastrocnemius|soleus|calf|calves|triceps surae/, "lower-calves"],
];

function subIdFromMeshName(name: string): string | null {
  if (!name) return null;
  if (MESH_NAME_OVERRIDE[name]) return MESH_NAME_OVERRIDE[name];
  const n = name.toLowerCase();
  for (const [re, id] of KEYWORD_TO_SUB) if (re.test(n)) return id;
  return null;
}

/**
 * 해부학 GLB 로더 — 모델을 화면에 맞게 자동 정렬/스케일하고, 메쉬 이름을 세부근육
 * id 로 매핑한다. 평소엔 살색, 선택/호버 시 그 근육만 글로우. 클릭은 그룹 단위로
 * 받아 e.object.name 으로 어느 근육인지 판별(임의 계층/리깅 모델 대응).
 */
function AnatomyModel({
  url,
  activeSubs,
  onSelectSub,
}: {
  url: string;
  activeSubs: ReadonlySet<string>;
  onSelectSub: (id: string) => void;
}) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  // 메쉬별 머티리얼(교체본) + sub 매핑 — ref 에 보관해 effect 안에서만 변형(렌더 중 변형 금지).
  const meshInfoRef = useRef<{ sub: string | null; mat: MeshStandardMaterial }[]>(
    [],
  );

  // 모델 로드 시: 우리 제어용 머티리얼로 교체 + 화면 중앙·적정 크기로 자동 정렬
  useEffect(() => {
    const arr: { sub: string | null; mat: MeshStandardMaterial }[] = [];
    scene.traverse((obj) => {
      const m = obj as Mesh;
      if (m.isMesh) {
        const mat = new MeshStandardMaterial({
          color: new Color(SKIN),
          roughness: 0.6,
          metalness: 0.05,
          transparent: true,
          opacity: 1,
        });
        m.material = mat;
        arr.push({ sub: subIdFromMeshName(m.name), mat });
      }
    });
    meshInfoRef.current = arr;

    const g = groupRef.current;
    if (g) {
      g.scale.set(1, 1, 1);
      g.position.set(0, 0, 0);
      const box = new Box3().setFromObject(scene);
      const size = new Vector3();
      const center = new Vector3();
      box.getSize(size);
      box.getCenter(center);
      const s = 2.7 / (size.y || 1);
      g.scale.setScalar(s);
      g.position.set(-center.x * s, -box.min.y * s - 1.05, -center.z * s);
    }
  }, [scene]);

  // 선택/호버 상태에 따라 머티리얼 색·글로우 갱신.
  // three.js 머티리얼을 명령형으로 갱신하는 정당한 패턴이라 immutability 규칙만 비활성화.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    for (const { sub, mat } of meshInfoRef.current) {
      const active = !!sub && activeSubs.has(sub);
      const hover = !!sub && hovered === sub;
      const col = sub ? subMuscleColor(sub) : SKIN;
      mat.color.set(active || hover ? col : SKIN);
      mat.emissive.set(col);
      mat.emissiveIntensity = active ? 0.7 : hover ? 0.35 : 0;
      mat.needsUpdate = true;
    }
  }, [scene, activeSubs, hovered]);
  /* eslint-enable react-hooks/immutability */

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        const sub = subIdFromMeshName(e.object.name || "");
        if (sub) onSelectSub(sub);
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        setHovered(subIdFromMeshName(e.object.name || ""));
      }}
      onPointerOut={() => setHovered(null)}
    >
      <primitive object={scene} />
    </group>
  );
}

class GltfBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/* ───────────────────────── 캔버스 ───────────────────────── */

export function MuscleMannequin3D({
  gender,
  activeSubs,
  onSelectSub,
}: MannequinProps) {
  // null/undefined/예상밖 값도 안전하게 정규화
  const sex: MannequinGender = gender === "female" ? "female" : "male";

  // GLB 파일이 실제로 있을 때만 로더를 띄운다 (없으면 404/에러 없이 절차적 인체).
  const [hasModel, setHasModel] = useState(false);
  useEffect(() => {
    if (!ANATOMY_MODEL_URL) return;
    let alive = true;
    fetch(ANATOMY_MODEL_URL, { method: "HEAD" })
      .then((r) => {
        if (alive && r.ok) setHasModel(true);
      })
      .catch(() => {
        /* 파일 없음 → 절차적 인체 유지 */
      });
    return () => {
      alive = false;
    };
  }, []);

  const procedural = (
    <ProceduralBody
      gender={sex}
      activeSubs={activeSubs}
      onSelectSub={onSelectSub}
    />
  );
  return (
    <div
      className="relative h-[360px] w-full overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-b from-sky-50 to-zinc-200 dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900 sm:h-[440px]"
      data-testid="muscle-mannequin-canvas"
    >
      <Canvas
        camera={{ position: [0, 0.25, 3.6], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        frameloop="demand"
      >
        {/* 부드러운 스튜디오 조명 */}
        <ambientLight intensity={0.65} />
        <hemisphereLight args={["#ffffff", "#b08968", 0.5]} />
        <directionalLight position={[3, 5, 4]} intensity={1.15} />
        <directionalLight position={[-4, 2, 2]} intensity={0.4} />
        <directionalLight position={[0, 3, -5]} intensity={0.55} />

        {ANATOMY_MODEL_URL && hasModel ? (
          <GltfBoundary fallback={procedural}>
            <Suspense fallback={procedural}>
              <AnatomyModel
                url={ANATOMY_MODEL_URL}
                activeSubs={activeSubs}
                onSelectSub={onSelectSub}
              />
            </Suspense>
          </GltfBoundary>
        ) : (
          procedural
        )}

        <ContactShadows
          position={[0, -1.18, 0]}
          opacity={0.35}
          scale={4}
          blur={2.6}
          far={3}
        />

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={2}
          maxDistance={5.5}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={(Math.PI * 5) / 6}
          target={[0, 0.3, 0]}
        />
      </Canvas>

      <p className="pointer-events-none absolute left-3 top-3 rounded-md bg-white/70 px-2 py-1 text-[11px] font-medium text-zinc-600 backdrop-blur dark:bg-zinc-900/70 dark:text-zinc-300">
        손가락으로 돌려 앞·뒤 보기 · 핀치로 확대/축소 · 근육 탭
      </p>
    </div>
  );
}

/* ───────────────────────── 부위별 밸런스 (점수 색상 히트맵) ───────────────────────── */

/** 세부근육 id → 상위 부위(MuscleId). "arm-biceps-long" → "arm" 등. */
function regionOf(subId: string): MuscleId {
  return subId.split("-")[0] as MuscleId;
}

/** 밸런스용 — 부위 색으로 칠한 불투명 근육 한 쌍. */
function BalanceSub({ def, color }: { def: SubMesh; color: string }) {
  const [x, y, z] = def.pos;
  return (
    <group>
      <mesh position={[x, y, z]}>
        <GeometryFor shape={def.shape} args={def.args} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.18}
          roughness={0.5}
          metalness={0.08}
        />
      </mesh>
      {def.mirror ? (
        <mesh position={[-x, y, z]}>
          <GeometryFor shape={def.shape} args={def.args} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.18}
            roughness={0.5}
            metalness={0.08}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function BalanceBody({
  gender,
  colors,
  subColors,
}: {
  gender: MannequinGender;
  colors: Partial<Record<MuscleId, string>>;
  /** 있으면 세부근육 단위로 색칠 (없으면 부위 단위) */
  subColors?: Partial<Record<string, string>>;
}) {
  const g = PROPORTION[gender] ?? PROPORTION.male;
  return (
    <group position={[0, -0.1, 0]}>
      <HumanBody gender={gender} />
      {SUB_MESHES.map((def) => {
        const region = regionOf(def.id);
        const sx = def.id.startsWith("lower-") ? g.lowerX : g.upperX;
        const scaled: SubMesh = {
          ...def,
          pos: [def.pos[0] * sx, def.pos[1], def.pos[2]],
        };
        const color =
          subColors?.[def.id] ?? colors[region] ?? "#a1a1aa";
        return <BalanceSub key={def.id} def={scaled} color={color} />;
      })}
    </group>
  );
}

/**
 * 부위별 밸런스 3D 마네킹 — 각 부위를 밸런스 색(균형/부족/심하게부족)으로 칠해
 * 회전·확대하며 약점 부위를 한눈에 보여준다. (선택/클릭 없음, 시각화 전용)
 */
export function MuscleBalanceMannequin3D({
  gender,
  colors,
  subColors,
}: {
  gender?: MannequinGender;
  colors: Partial<Record<MuscleId, string>>;
  /** 세부근육 단위 색칠(있으면 부위색 대신 세부근육색 사용) */
  subColors?: Partial<Record<string, string>>;
}) {
  const sex: MannequinGender = gender === "female" ? "female" : "male";
  return (
    <div
      className="relative h-[340px] w-full overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-b from-sky-50 to-zinc-200 dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900 sm:h-[400px]"
      data-testid="balance-mannequin-canvas"
    >
      <Canvas
        camera={{ position: [0, 0.25, 3.6], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        frameloop="demand"
      >
        <ambientLight intensity={0.7} />
        <hemisphereLight args={["#ffffff", "#b08968", 0.5]} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} />
        <directionalLight position={[-4, 2, 2]} intensity={0.4} />
        <directionalLight position={[0, 3, -5]} intensity={0.55} />

        <BalanceBody gender={sex} colors={colors} subColors={subColors} />

        <ContactShadows
          position={[0, -1.18, 0]}
          opacity={0.35}
          scale={4}
          blur={2.6}
          far={3}
        />
        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={2}
          maxDistance={5.5}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={(Math.PI * 5) / 6}
          target={[0, 0.3, 0]}
        />
      </Canvas>

      <p className="pointer-events-none absolute left-3 top-3 rounded-md bg-white/70 px-2 py-1 text-[11px] font-medium text-zinc-600 backdrop-blur dark:bg-zinc-900/70 dark:text-zinc-300">
        손가락으로 돌려 앞·뒤 · 핀치로 확대/축소
      </p>
    </div>
  );
}

export default MuscleMannequin3D;