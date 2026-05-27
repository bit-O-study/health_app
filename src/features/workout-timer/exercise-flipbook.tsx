"use client";

/**
 * 측면뷰 운동 일러스트 + 시각적 코칭 오버레이.
 * 텍스트 안내 없이 그림으로 이해할 수 있게:
 * - 손 잡는 위치 → 녹색 링 (Grip Ring)
 * - 모션 방향 → 큰 녹색 화살표
 * - 자극 부위 → 빨간 글로우 (active muscle) + 펄스
 * - 조심 부위 → 빨간 X 마크 (Caution X)
 * - 3프레임 페이드 cycle
 */

import type {
  ConditioningMotion,
  MotionCategory,
} from "@/features/workout-timer/exercise-motion";

const SKIN = "#e7e5e4";
const SHIRT = "#fb923c";
const PANTS = "#3f3f46";
const SHOE = "#18181b";
const HAIR = "#18181b";
const STROKE = "#0a0a0a";
const STROKE_W = 1.2;
const FLOOR = "#27272a";
const EQUIP = "#71717a";
const PLATE = "#dc2626";

// 시각적 코칭 마커 색상
const GRIP = "#10b981"; // emerald-500 — 잡는 위치
const ARROW = "#34d399"; // emerald-400 — 모션 방향
const MUSCLE = "#ef4444"; // red-500 — 자극 부위
const CAUTION = "#facc15"; // yellow-400 — 조심

/** 본운동(MotionCategory) 또는 워밍업·마무리(ConditioningMotion) 통합 일러스트 컨테이너. */
export function ExerciseFlipbook({
  category,
  conditioning,
}: {
  category?: MotionCategory;
  /** 워밍업/마무리일 때는 이 값으로 컨디셔닝 모션 선택 */
  conditioning?: ConditioningMotion;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-full w-full"
      role="img"
      aria-label="운동 동작 + 코칭 오버레이"
    >
      <defs>
        <radialGradient id="muscle-glow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={MUSCLE} stopOpacity="0.9" />
          <stop offset="50%" stopColor={MUSCLE} stopOpacity="0.5" />
          <stop offset="100%" stopColor={MUSCLE} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="grip-ring" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor={GRIP} stopOpacity="0" />
          <stop offset="80%" stopColor={GRIP} stopOpacity="1" />
          <stop offset="100%" stopColor={GRIP} stopOpacity="0" />
        </radialGradient>
        <filter id="glow-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <style>{`
          /* 3 frames flipbook */
          .frame-1 { animation: f1 var(--cycle,2400ms) infinite cubic-bezier(0.45,0,0.55,1); }
          .frame-2 { animation: f2 var(--cycle,2400ms) infinite cubic-bezier(0.45,0,0.55,1); }
          .frame-3 { animation: f3 var(--cycle,2400ms) infinite cubic-bezier(0.45,0,0.55,1); }
          @keyframes f1 {
            0%, 100% { opacity: 1; }
            20%, 80% { opacity: 0; }
          }
          @keyframes f2 {
            0%, 100% { opacity: 0; }
            25%, 75% { opacity: 1; }
            50%      { opacity: 0; }
          }
          @keyframes f3 {
            0%, 30%, 70%, 100% { opacity: 0; }
            45%, 55%           { opacity: 1; }
          }

          /* 코칭 마커 펄스 */
          .grip-pulse   { animation: gripPulse 1.8s ease-in-out infinite; transform-origin: center; }
          .muscle-pulse { animation: musclePulse 1.6s ease-in-out infinite; transform-origin: center; }
          .caution-pulse{ animation: cautionPulse 1.2s ease-in-out infinite; transform-origin: center; }
          .arrow-pulse  { animation: arrowPulse var(--cycle,2400ms) infinite cubic-bezier(0.45,0,0.55,1); transform-origin: center; }

          @keyframes gripPulse    { 0%, 100% { transform: scale(1);    opacity: 0.95; }  50% { transform: scale(1.25); opacity: 0.6; } }
          @keyframes musclePulse  { 0%, 100% { opacity: 0.45; transform: scale(1); } 50% { opacity: 0.95; transform: scale(1.15); } }
          @keyframes cautionPulse { 0%, 100% { transform: scale(1); }       50% { transform: scale(1.18); } }
          @keyframes arrowPulse   { 0%, 100% { opacity: 0.35; }              50% { opacity: 1; } }
        `}</style>
      </defs>

      {/* 바닥선 */}
      <line x1="0" y1="185" x2="200" y2="185" stroke={FLOOR} strokeWidth="2" />

      {conditioning ? (
        <ConditioningScene motion={conditioning} />
      ) : (
        <CategoryScene category={category ?? "static"} />
      )}
    </svg>
  );
}

function CategoryScene({ category }: { category: MotionCategory }) {
  if (category === "press") return <BenchPressScene />;
  if (category === "row") return <RowScene />;
  if (category === "pulldown") return <PulldownScene />;
  if (category === "squat") return <SquatScene />;
  if (category === "hinge") return <DeadliftScene />;
  if (category === "curl") return <CurlScene />;
  if (category === "extension") return <ExtensionScene />;
  if (category === "raise") return <LateralRaiseScene />;
  return <PlankScene />;
}

function ConditioningScene({ motion }: { motion: ConditioningMotion }) {
  if (motion === "run") return <RunScene />;
  if (motion === "step") return <StepScene />;
  if (motion === "cycle") return <CycleScene />;
  if (motion === "armCircle") return <ArmCircleScene />;
  if (motion === "spineFlow") return <SpineFlowScene />;
  if (motion === "bridge") return <BridgeScene />;
  if (motion === "hang") return <HangScene />;
  if (motion === "squatWarm") return <SquatWarmScene />;
  return <StretchScene />;
}

/* ─── 공통 시각적 마커 ─────────────────────────────────────── */

function StickHead({ cx, cy, r = 9 }: { cx: number; cy: number; r?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={SKIN} stroke={STROKE} strokeWidth={STROKE_W} />
      <path
        d={`M ${cx - r} ${cy - r * 0.4} Q ${cx - r * 0.6} ${cy - r * 1.2} ${cx + r * 0.4} ${cy - r * 1.05} Q ${cx + r * 0.6} ${cy - r * 0.4} ${cx + r * 0.85} ${cy - r * 0.1}`}
        fill={HAIR}
      />
      <circle cx={cx + r * 0.5} cy={cy - r * 0.1} r="0.9" fill={STROKE} />
    </>
  );
}

/** 잡는 위치 표시 — 손 주변 녹색 펄스 링 (텍스트 없이 시각적으로) */
function GripRing({ cx, cy, r = 7 }: { cx: number; cy: number; r?: number }) {
  return (
    <g className="grip-pulse">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={GRIP} strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r + 2.5} fill="none" stroke={GRIP} strokeWidth="1" opacity="0.5" />
    </g>
  );
}

/** 자극 부위 — 빨간 글로우 (펄스). 텍스트 라벨 없음. */
function MuscleGlow({
  cx,
  cy,
  rx = 18,
  ry = 18,
}: {
  cx: number;
  cy: number;
  rx?: number;
  ry?: number;
}) {
  return (
    <g className="muscle-pulse" filter="url(#glow-blur)">
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#muscle-glow)" />
    </g>
  );
}

/** 조심 마크 — 빨간 X (펄스). 위치만 시각적으로 알림. */
function CautionMark({ cx, cy }: { cx: number; cy: number }) {
  const r = 7;
  return (
    <g className="caution-pulse">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="#1f1f23"
        stroke={CAUTION}
        strokeWidth="1.8"
      />
      <line x1={cx - 3} y1={cy - 3} x2={cx + 3} y2={cy + 3} stroke={CAUTION} strokeWidth="2" strokeLinecap="round" />
      <line x1={cx + 3} y1={cy - 3} x2={cx - 3} y2={cy + 3} stroke={CAUTION} strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

/** 큰 모션 화살표 (양방향) — 운동 방향 표시. */
function MotionArrow({
  x,
  y1,
  y2,
  vertical = true,
}: {
  x: number;
  y1: number;
  y2: number;
  vertical?: boolean;
}) {
  const headSize = 6;
  return (
    <g className="arrow-pulse">
      {/* 본체 line */}
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={y2}
        stroke={ARROW}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* 위 화살표 머리 (y1 = 위) */}
      <polyline
        points={`${x - headSize},${y1 + headSize} ${x},${y1} ${x + headSize},${y1 + headSize}`}
        fill="none"
        stroke={ARROW}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 아래 화살표 머리 (y2 = 아래) */}
      <polyline
        points={`${x - headSize},${y2 - headSize} ${x},${y2} ${x + headSize},${y2 - headSize}`}
        fill="none"
        stroke={ARROW}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {vertical ? null : null}
    </g>
  );
}

/** 단방향 화살표 (시작 → 끝) */
function DirArrow({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const head = 7;
  const hx1 = x2 - head * Math.cos(ang - Math.PI / 6);
  const hy1 = y2 - head * Math.sin(ang - Math.PI / 6);
  const hx2 = x2 - head * Math.cos(ang + Math.PI / 6);
  const hy2 = y2 - head * Math.sin(ang + Math.PI / 6);
  return (
    <g className="arrow-pulse">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ARROW} strokeWidth="3.5" strokeLinecap="round" />
      <polyline
        points={`${hx1},${hy1} ${x2},${y2} ${hx2},${hy2}`}
        fill="none"
        stroke={ARROW}
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
  );
}

/* ─── 카테고리별 씬 ─────────────────────────────────────────── */

function BenchPressScene() {
  // 벤치 + 다리
  const Bench = (
    <g>
      <rect x="55" y="124" width="100" height="10" fill={SHOE} stroke={STROKE} strokeWidth={STROKE_W} />
      <line x1="62" y1="134" x2="62" y2="184" stroke={SHOE} strokeWidth="3" />
      <line x1="148" y1="134" x2="148" y2="184" stroke={SHOE} strokeWidth="3" />
    </g>
  );
  // 사람 (누운 자세)
  const Body = (
    <g>
      <StickHead cx={55} cy={118} r={8} />
      <rect x="63" y="113" width="60" height="14" rx="3" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      <rect x="120" y="115" width="14" height="11" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      <path d="M 134 120 L 158 130 L 158 175" fill="none" stroke={PANTS} strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="158" cy="180" rx="6" ry="3" fill={SHOE} />
    </g>
  );
  // 팔 + 바 (프레임별)
  const ArmsAndBar = (y: number) => (
    <g>
      <line x1="68" y1="115" x2="80" y2={y + 12} stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      <line x1="80" y1={y + 12} x2="100" y2={y} stroke={SKIN} strokeWidth="5.5" strokeLinecap="round" />
      <line x1="75" y1={y} x2="125" y2={y} stroke={EQUIP} strokeWidth="3" strokeLinecap="round" />
      <circle cx="72" cy={y} r="9" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
      <circle cx="128" cy={y} r="9" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
    </g>
  );

  return (
    <g>
      {/* 자극 부위: 가슴 (몸 위에 빨간 글로우) */}
      <MuscleGlow cx={95} cy={115} rx={22} ry={11} />
      {Bench}
      {Body}
      {/* 프레임 — 바 위치 변화 */}
      <g className="frame-1">{ArmsAndBar(70)}</g>
      <g className="frame-2">{ArmsAndBar(90)}</g>
      <g className="frame-3">{ArmsAndBar(108)}</g>
      {/* 모션 방향: 위·아래 양방향 화살표 (바 옆) */}
      <MotionArrow x={162} y1={70} y2={108} />
      {/* 잡는 위치 — 양손 그립 위치 (frame-2 기준) */}
      <g className="frame-2">
        <GripRing cx={100} cy={90} r={6} />
      </g>
      {/* 조심: 어깨 (어깨가 으쓱하지 않게) */}
      <CautionMark cx={70} cy={113} />
    </g>
  );
}

function SquatScene() {
  const Body = (knee: number, hipY: number, headY: number) => (
    <g>
      <StickHead cx={100} cy={headY} r={9} />
      <line x1="80" y1={headY + 12} x2="120" y2={headY + 12} stroke={EQUIP} strokeWidth="3" strokeLinecap="round" />
      <circle cx="76" cy={headY + 12} r="10" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
      <circle cx="124" cy={headY + 12} r="10" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
      <rect x="91" y={headY + 10} width="18" height={hipY - headY - 10} fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      <rect x="88" y={hipY} width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      <line x1="95" y1={hipY + 12} x2="92" y2={knee} stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="108" y1={hipY + 12} x2="108" y2={knee} stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="92" y1={knee} x2="90" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="108" y1={knee} x2="108" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="90" cy="183" rx="9" ry="4" fill={SHOE} />
      <ellipse cx="108" cy="183" rx="9" ry="4" fill={SHOE} />
      <line x1="91" y1={headY + 12} x2="82" y2={headY + 22} stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      <line x1="109" y1={headY + 12} x2="118" y2={headY + 22} stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
    </g>
  );

  return (
    <g>
      {/* 자극: 대퇴 + 둔근 */}
      <MuscleGlow cx={100} cy={145} rx={22} ry={28} />
      {/* 프레임 */}
      <g className="frame-1">{Body(140, 100, 40)}</g>
      <g className="frame-2">{Body(135, 115, 55)}</g>
      <g className="frame-3">{Body(125, 130, 70)}</g>
      {/* 모션 방향: 위·아래 */}
      <MotionArrow x={165} y1={70} y2={150} />
      {/* 잡는 위치 — 바 양끝 그립 (frame-2 기준 사람 머리 위) */}
      <g className="frame-2">
        <GripRing cx={82} cy={67} r={5} />
        <GripRing cx={118} cy={67} r={5} />
      </g>
      {/* 조심: 무릎 (안쪽으로 무너지지 않게) */}
      <CautionMark cx={70} cy={160} />
      <CautionMark cx={130} cy={160} />
    </g>
  );
}

function DeadliftScene() {
  const Bar = (
    <g>
      <line x1="60" y1="170" x2="140" y2="170" stroke={EQUIP} strokeWidth="4" strokeLinecap="round" />
      <circle cx="55" cy="170" r="14" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
      <circle cx="145" cy="170" r="14" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
    </g>
  );
  const Body = (hingeDeg: number, barY: number) => {
    const rad = (hingeDeg * Math.PI) / 180;
    const hipX = 100;
    const hipY = 130;
    const torsoLen = 50;
    const shoulderX = hipX + torsoLen * Math.sin(rad);
    const shoulderY = hipY - torsoLen * Math.cos(rad);
    const handX = shoulderX;
    const handY = barY;
    return (
      <g>
        <line x1="92" y1={hipY + 5} x2="90" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
        <line x1="108" y1={hipY + 5} x2="108" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
        <ellipse cx="90" cy="183" rx="9" ry="4" fill={SHOE} />
        <ellipse cx="108" cy="183" rx="9" ry="4" fill={SHOE} />
        <rect x={hipX - 12} y={hipY} width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
        <line
          x1={hipX}
          y1={hipY}
          x2={shoulderX}
          y2={shoulderY}
          stroke={SHIRT}
          strokeWidth="14"
          strokeLinecap="round"
        />
        <StickHead cx={shoulderX} cy={shoulderY - 10} r={9} />
        <line
          x1={shoulderX}
          y1={shoulderY + 2}
          x2={handX}
          y2={handY}
          stroke={SHIRT}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx={handX} cy={handY} r="3.5" fill={SKIN} stroke={STROKE} strokeWidth={STROKE_W} />
      </g>
    );
  };

  return (
    <g>
      {/* 자극: 햄스트링 + 둔근 */}
      <MuscleGlow cx={100} cy={140} rx={18} ry={25} />
      {Bar}
      <g className="frame-1">{Body(75, 170)}</g>
      <g className="frame-2">{Body(45, 140)}</g>
      <g className="frame-3">{Body(0, 90)}</g>
      {/* 화살표: 위로 (들어 올림) */}
      <DirArrow x1={170} y1={170} x2={170} y2={95} />
      {/* 잡는 위치 */}
      <GripRing cx={75} cy={170} r={6} />
      <GripRing cx={125} cy={170} r={6} />
      {/* 조심: 허리 (둥글지 않게) — 척추 위에 */}
      <g className="frame-1">
        <CautionMark cx={130} cy={150} />
      </g>
      <g className="frame-2">
        <CautionMark cx={120} cy={130} />
      </g>
    </g>
  );
}

function RowScene() {
  const Bar = (forearmAngle: number) => {
    const elbowX = 95;
    const elbowY = 110;
    const len = 40;
    const handX = elbowX + len * Math.cos((forearmAngle * Math.PI) / 180);
    const handY = elbowY + len * Math.sin((forearmAngle * Math.PI) / 180);
    return (
      <g>
        <line x1={elbowX} y1={elbowY} x2={handX} y2={handY} stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
        <line x1={handX - 22} y1={handY} x2={handX + 22} y2={handY} stroke={EQUIP} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={handX - 28} cy={handY} r="10" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
        <circle cx={handX + 28} cy={handY} r="10" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
      </g>
    );
  };

  const Body = (
    <g>
      <line x1="92" y1="130" x2="90" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="108" y1="130" x2="108" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="90" cy="183" rx="9" ry="4" fill={SHOE} />
      <ellipse cx="108" cy="183" rx="9" ry="4" fill={SHOE} />
      <rect x="88" y="118" width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      <line x1="100" y1="118" x2="60" y2="78" stroke={SHIRT} strokeWidth="14" strokeLinecap="round" />
      <StickHead cx={55} cy={70} r={9} />
      <line x1="68" y1="80" x2="95" y2="110" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
    </g>
  );

  return (
    <g>
      {/* 자극: 광배 */}
      <MuscleGlow cx={75} cy={90} rx={16} ry={20} />
      {Body}
      <g className="frame-1">{Bar(85)}</g>
      <g className="frame-2">{Bar(110)}</g>
      <g className="frame-3">{Bar(150)}</g>
      {/* 화살표: 위로 (당김) */}
      <DirArrow x1={150} y1={150} x2={130} y2={115} />
      {/* 잡는 위치 (frame-2) */}
      <g className="frame-2">
        <GripRing cx={111} cy={147} r={5} />
      </g>
      {/* 조심: 허리 */}
      <CautionMark cx={75} cy={115} />
    </g>
  );
}

function PulldownScene() {
  const Bar = (
    <g>
      <line x1="60" y1="30" x2="140" y2="30" stroke={EQUIP} strokeWidth="4" strokeLinecap="round" />
      <line x1="80" y1="0" x2="80" y2="30" stroke={EQUIP} strokeWidth="3" />
      <line x1="120" y1="0" x2="120" y2="30" stroke={EQUIP} strokeWidth="3" />
    </g>
  );
  const Body = (headY: number) => (
    <g>
      <StickHead cx={100} cy={headY} r={9} />
      <rect x="91" y={headY + 8} width="18" height="40" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      <rect x="88" y={headY + 48} width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      <line x1="95" y1={headY + 60} x2="93" y2={headY + 100} stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
      <line x1="105" y1={headY + 60} x2="107" y2={headY + 100} stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
      <line x1="92" y1={headY + 8} x2="82" y2="30" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      <line x1="108" y1={headY + 8} x2="118" y2="30" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
    </g>
  );

  return (
    <g>
      {Bar}
      {/* 자극: 광배 (frame-2 기준 위치) */}
      <g className="frame-2">
        <MuscleGlow cx={100} cy={90} rx={20} ry={16} />
      </g>
      <g className="frame-1">{Body(80)}</g>
      <g className="frame-2">{Body(60)}</g>
      <g className="frame-3">{Body(45)}</g>
      {/* 화살표: 위·아래 */}
      <MotionArrow x={170} y1={50} y2={150} />
      {/* 잡는 위치 (양손 바 위치) */}
      <GripRing cx={82} cy={30} r={6} />
      <GripRing cx={118} cy={30} r={6} />
      {/* 조심: 어깨 */}
      <CautionMark cx={40} cy={50} />
      <CautionMark cx={160} cy={50} />
    </g>
  );
}

function CurlScene() {
  const Forearm = (angleDeg: number) => {
    const elbowX = 105;
    const elbowY = 105;
    const len = 32;
    const handX = elbowX + len * Math.cos(((angleDeg - 90) * Math.PI) / 180);
    const handY = elbowY + len * Math.sin(((angleDeg - 90) * Math.PI) / 180);
    return (
      <g>
        <line x1={elbowX} y1={elbowY} x2={handX} y2={handY} stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
        <Dumbbell cx={handX} cy={handY} />
      </g>
    );
  };

  return (
    <g>
      {/* 다리/토르소 (고정) */}
      <line x1="92" y1="125" x2="90" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="108" y1="125" x2="108" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="90" cy="183" rx="9" ry="4" fill={SHOE} />
      <ellipse cx="108" cy="183" rx="9" ry="4" fill={SHOE} />
      <rect x="88" y="113" width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      <rect x="91" y="65" width="18" height="50" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      <StickHead cx={100} cy={55} r={9} />
      {/* 위팔 (옆구리에 고정) */}
      <line x1="105" y1="72" x2="105" y2="105" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      {/* 자극: 이두 (위팔 위) */}
      <MuscleGlow cx={105} cy={88} rx={9} ry={15} />
      {/* 프레임 */}
      <g className="frame-1">{Forearm(180)}</g>
      <g className="frame-2">{Forearm(115)}</g>
      <g className="frame-3">{Forearm(45)}</g>
      {/* 화살표 */}
      <DirArrow x1={150} y1={130} x2={150} y2={75} />
      {/* 잡는 위치 — 손에 덤벨 */}
      <g className="frame-2">
        <GripRing cx={120} cy={130} r={6} />
      </g>
      {/* 조심: 팔꿈치 (흔들리지 않게) */}
      <CautionMark cx={70} cy={105} />
    </g>
  );
}

function ExtensionScene() {
  const Forearm = (angleDeg: number) => {
    const elbowX = 100;
    const elbowY = 65;
    const len = 32;
    const handX = elbowX + len * Math.cos(((angleDeg - 90) * Math.PI) / 180);
    const handY = elbowY + len * Math.sin(((angleDeg - 90) * Math.PI) / 180);
    return (
      <g>
        <line x1={elbowX} y1={elbowY} x2={handX} y2={handY} stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
        <Dumbbell cx={handX} cy={handY} />
      </g>
    );
  };

  return (
    <g>
      <line x1="92" y1="125" x2="90" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="108" y1="125" x2="108" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="90" cy="183" rx="9" ry="4" fill={SHOE} />
      <ellipse cx="108" cy="183" rx="9" ry="4" fill={SHOE} />
      <rect x="88" y="113" width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      <rect x="91" y="65" width="18" height="50" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      <StickHead cx={100} cy={55} r={9} />
      <line x1="100" y1="65" x2="100" y2="40" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      {/* 자극: 삼두 (위팔 뒤) */}
      <MuscleGlow cx={100} cy={50} rx={9} ry={12} />
      <g className="frame-1">{Forearm(225)}</g>
      <g className="frame-2">{Forearm(180)}</g>
      <g className="frame-3">{Forearm(90)}</g>
      {/* 화살표: 펴는 방향 */}
      <DirArrow x1={140} y1={50} x2={140} y2={30} />
      {/* 잡는 위치 (frame-2 기준) */}
      <g className="frame-2">
        <GripRing cx={68} cy={65} r={5} />
      </g>
      {/* 조심: 팔꿈치 */}
      <CautionMark cx={130} cy={65} />
    </g>
  );
}

function LateralRaiseScene() {
  const Arm = (angleDeg: number) => {
    const shoulderX = 100;
    const shoulderY = 75;
    const len = 50;
    const handX = shoulderX + len * Math.cos(((angleDeg - 90) * Math.PI) / 180);
    const handY = shoulderY + len * Math.sin(((angleDeg - 90) * Math.PI) / 180);
    return (
      <g>
        <line x1={shoulderX} y1={shoulderY} x2={handX} y2={handY} stroke={SHIRT} strokeWidth="7" strokeLinecap="round" />
        <Dumbbell cx={handX} cy={handY} />
      </g>
    );
  };

  return (
    <g>
      <line x1="92" y1="125" x2="90" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="108" y1="125" x2="108" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="90" cy="183" rx="9" ry="4" fill={SHOE} />
      <ellipse cx="108" cy="183" rx="9" ry="4" fill={SHOE} />
      <rect x="88" y="113" width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      <rect x="91" y="65" width="18" height="50" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      <StickHead cx={100} cy={55} r={9} />
      {/* 자극: 측면 삼각근 (어깨 옆) */}
      <MuscleGlow cx={100} cy={75} rx={14} ry={10} />
      <g className="frame-1">{Arm(180)}</g>
      <g className="frame-2">{Arm(135)}</g>
      <g className="frame-3">{Arm(90)}</g>
      {/* 화살표: 양옆 */}
      <DirArrow x1={50} y1={130} x2={50} y2={75} />
      <DirArrow x1={150} y1={130} x2={150} y2={75} />
      {/* 잡는 위치 — 양손 덤벨 */}
      <g className="frame-1">
        <GripRing cx={100} cy={125} r={5} />
      </g>
      {/* 조심: 목·승모근 (어깨가 으쓱하지 않게) */}
      <CautionMark cx={100} cy={42} />
    </g>
  );
}

function PlankScene() {
  const Body = (
    <g>
      <StickHead cx={60} cy={130} r={9} />
      <rect x="68" y="125" width="80" height="14" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      <line x1="55" y1="140" x2="75" y2="155" stroke={SKIN} strokeWidth="5.5" strokeLinecap="round" />
      <line x1="55" y1="155" x2="80" y2="155" stroke={SKIN} strokeWidth="5.5" strokeLinecap="round" />
      <line x1="148" y1="132" x2="180" y2="155" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
      <ellipse cx="178" cy="158" rx="8" ry="3.5" fill={SHOE} />
    </g>
  );

  return (
    <g>
      {/* 자극: 코어 */}
      <MuscleGlow cx={110} cy={130} rx={26} ry={10} />
      {Body}
      {/* 조심: 엉덩이 처짐 / 솟음 */}
      <CautionMark cx={105} cy={115} />
      <CautionMark cx={105} cy={150} />
      {/* 화살표 — "엉덩이 일직선 유지" 라는 의미 (양방향 X 가까이) */}
    </g>
  );
}

/* ─── 워밍업·마무리 씬 ───────────────────────────────────── */

/** RUN — 러닝/걷기/줄넘기. 다리 교차 + 살짝 통통 튐. */
function RunScene() {
  const Body = (legL: number, legR: number, armL: number, armR: number, bobY: number) => (
    <g transform={`translate(0, ${bobY})`}>
      <StickHead cx={100} cy={50} r={9} />
      <rect x="91" y="60" width="18" height="50" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      <rect x="88" y="108" width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      {/* 다리 — 각도 다르게 */}
      <line x1="95" y1="120" x2={95 - legL} y2="170" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="105" y1="120" x2={105 + legR} y2="170" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx={95 - legL} cy="174" rx="8" ry="3.5" fill={SHOE} />
      <ellipse cx={105 + legR} cy="174" rx="8" ry="3.5" fill={SHOE} />
      {/* 팔 — 다리 반대로 */}
      <line x1="92" y1="68" x2={92 - armL} y2="110" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      <line x1="108" y1="68" x2={108 + armR} y2="110" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
    </g>
  );

  return (
    <g>
      <g className="frame-1">{Body(15, 15, 10, 10, 0)}</g>
      <g className="frame-2">{Body(0, 0, 0, 0, -3)}</g>
      <g className="frame-3">{Body(-15, -15, -10, -10, 0)}</g>
      {/* 모션 화살표 — 다리가 교차됨 */}
      <DirArrow x1={50} y1={170} x2={50} y2={130} />
      {/* 자극: 종아리·심박 — 다리 글로우 */}
      <MuscleGlow cx={100} cy={150} rx={20} ry={20} />
    </g>
  );
}

/** STEP — 한 다리씩 올림 (계단/스텝). */
function StepScene() {
  const Body = (kneeL: number, kneeR: number) => (
    <g>
      <StickHead cx={100} cy={50} r={9} />
      <rect x="91" y="60" width="18" height="50" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      <rect x="88" y="108" width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      <line x1="95" y1="120" x2="93" y2={120 + kneeL} stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="93" y1={120 + kneeL} x2="93" y2="170" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="108" y1="120" x2="107" y2={120 + kneeR} stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="107" y1={120 + kneeR} x2="107" y2="170" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="93" cy="174" rx="8" ry="3.5" fill={SHOE} />
      <ellipse cx="107" cy="174" rx="8" ry="3.5" fill={SHOE} />
      <line x1="92" y1="68" x2="88" y2="110" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      <line x1="108" y1="68" x2="112" y2="110" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
    </g>
  );
  return (
    <g>
      <g className="frame-1">{Body(50, 30)}</g>
      <g className="frame-2">{Body(40, 40)}</g>
      <g className="frame-3">{Body(30, 50)}</g>
      <DirArrow x1={150} y1={150} x2={150} y2={120} />
      <MuscleGlow cx={100} cy={145} rx={18} ry={20} />
    </g>
  );
}

/** CYCLE — 자전거/로잉. 페달이 도는 원형 + 팔다리. */
function CycleScene() {
  return (
    <g>
      {/* 안장 */}
      <rect x="85" y="105" width="30" height="8" rx="2" fill={SHOE} />
      {/* 사람 — 페달 위 */}
      <StickHead cx={95} cy={70} r={9} />
      <line x1="95" y1="80" x2="100" y2="105" stroke={SHIRT} strokeWidth="14" strokeLinecap="round" />
      {/* 팔 — 핸들 잡음 */}
      <line x1="92" y1="86" x2="65" y2="100" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      {/* 핸들 */}
      <rect x="55" y="96" width="14" height="3" rx="1" fill={EQUIP} />
      {/* 페달 — 원 안에 다리 */}
      <circle cx="115" cy="155" r="22" fill="none" stroke={EQUIP} strokeWidth="2" />
      <circle cx="115" cy="155" r="3" fill={EQUIP} />
      {/* 다리 — 프레임마다 회전 */}
      <g className="frame-1">
        <line x1="100" y1="113" x2="135" y2="145" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
        <line x1="135" y1="145" x2="135" y2="160" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
        <line x1="100" y1="113" x2="95" y2="155" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
        <line x1="95" y1="155" x2="105" y2="170" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
      </g>
      <g className="frame-2">
        <line x1="100" y1="113" x2="115" y2="135" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
        <line x1="115" y1="135" x2="115" y2="175" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
        <line x1="100" y1="113" x2="115" y2="170" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
      </g>
      <g className="frame-3">
        <line x1="100" y1="113" x2="95" y2="155" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
        <line x1="95" y1="155" x2="135" y2="160" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
        <line x1="100" y1="113" x2="135" y2="145" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
      </g>
      {/* 자극: 대퇴 */}
      <MuscleGlow cx={115} cy={155} rx={26} ry={26} />
    </g>
  );
}

/** ARM CIRCLE — 어깨 회전. 팔이 큰 원을 그림. */
function ArmCircleScene() {
  const Arms = (angleL: number, angleR: number) => {
    const shX1 = 95;
    const shX2 = 105;
    const shY = 70;
    const len = 35;
    const handX1 = shX1 + len * Math.cos((angleL * Math.PI) / 180);
    const handY1 = shY + len * Math.sin((angleL * Math.PI) / 180);
    const handX2 = shX2 + len * Math.cos((angleR * Math.PI) / 180);
    const handY2 = shY + len * Math.sin((angleR * Math.PI) / 180);
    return (
      <g>
        <line x1={shX1} y1={shY} x2={handX1} y2={handY1} stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
        <line x1={shX2} y1={shY} x2={handX2} y2={handY2} stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      </g>
    );
  };
  return (
    <g>
      <line x1="92" y1="125" x2="90" y2="175" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="108" y1="125" x2="108" y2="175" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="90" cy="178" rx="9" ry="4" fill={SHOE} />
      <ellipse cx="108" cy="178" rx="9" ry="4" fill={SHOE} />
      <rect x="88" y="113" width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      <rect x="91" y="65" width="18" height="50" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      <StickHead cx={100} cy={55} r={9} />
      <g className="frame-1">{Arms(-90, -90)}</g>
      <g className="frame-2">{Arms(0, 180)}</g>
      <g className="frame-3">{Arms(90, 90)}</g>
      {/* 원형 가이드 (점선) */}
      <circle cx={95} cy={70} r={35} fill="none" stroke={ARROW} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.5" />
      <circle cx={105} cy={70} r={35} fill="none" stroke={ARROW} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.5" />
      <MuscleGlow cx={100} cy={70} rx={22} ry={12} />
    </g>
  );
}

/** SPINE FLOW — 캣카우/코브라. 척추 위·아래 굴곡. */
function SpineFlowScene() {
  const Body = (curve: number) => (
    <g>
      {/* 네 발 자세 옆모습 */}
      {/* 손목 */}
      <line x1="55" y1="155" x2="55" y2="130" stroke={SKIN} strokeWidth="6" strokeLinecap="round" />
      {/* 어깨 → 척추 → 골반 (curve 가 0=평평, 양수=위로 굽음, 음수=아래로) */}
      <path
        d={`M 55 ${130} Q 100 ${130 - curve} 145 ${130}`}
        fill="none"
        stroke={SHIRT}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <StickHead cx={45} cy={120} r={8} />
      {/* 무릎 */}
      <line x1="145" y1="130" x2="145" y2="155" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="55" cy="158" rx="6" ry="3" fill={SHOE} />
      <ellipse cx="145" cy="158" rx="8" ry="3" fill={SHOE} />
    </g>
  );
  return (
    <g>
      <g className="frame-1">{Body(20)}</g>
      <g className="frame-2">{Body(0)}</g>
      <g className="frame-3">{Body(-20)}</g>
      {/* 양방향 화살표 — 척추 굴곡 */}
      <MotionArrow x={100} y1={95} y2={145} />
      <MuscleGlow cx={100} cy={130} rx={36} ry={10} />
    </g>
  );
}

/** BRIDGE — 글루트 브릿지. 엉덩이가 위로 들림. */
function BridgeScene() {
  const Body = (hipY: number) => (
    <g>
      {/* 어깨·머리 — 바닥 */}
      <StickHead cx={50} cy={155} r={8} />
      {/* 토르소 — 어깨에서 골반까지 (curve) */}
      <path
        d={`M 58 155 Q 90 ${hipY - 8} 110 ${hipY}`}
        fill="none"
        stroke={SHIRT}
        strokeWidth="14"
        strokeLinecap="round"
      />
      {/* 다리 */}
      <line x1="110" y1={hipY} x2="135" y2="170" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="135" y1="170" x2="155" y2="170" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="155" cy="173" rx="8" ry="3" fill={SHOE} />
    </g>
  );
  return (
    <g>
      <g className="frame-1">{Body(165)}</g>
      <g className="frame-2">{Body(140)}</g>
      <g className="frame-3">{Body(120)}</g>
      <MotionArrow x={160} y1={120} y2={165} />
      {/* 자극: 둔근 */}
      <MuscleGlow cx={110} cy={135} rx={18} ry={14} />
    </g>
  );
}

/** HANG — 데드행. 매달림. */
function HangScene() {
  return (
    <g>
      {/* 바 */}
      <line x1="60" y1="30" x2="140" y2="30" stroke={EQUIP} strokeWidth="4" strokeLinecap="round" />
      <line x1="80" y1="0" x2="80" y2="30" stroke={EQUIP} strokeWidth="3" />
      <line x1="120" y1="0" x2="120" y2="30" stroke={EQUIP} strokeWidth="3" />
      {/* 사람 — 매달림 (정적, 미세 호흡) */}
      <g className="frame-1">
        <StickHead cx={100} cy={75} r={9} />
        <rect x="91" y="83" width="18" height="40" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
        <rect x="88" y="120" width="24" height="10" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
        <line x1="95" y1="130" x2="93" y2="170" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
        <line x1="105" y1="130" x2="107" y2="170" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
        <line x1="92" y1="83" x2="82" y2="30" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
        <line x1="108" y1="83" x2="118" y2="30" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      </g>
      <g className="frame-2" opacity="0.7">
        <StickHead cx={100} cy={73} r={9} />
        <rect x="91" y="81" width="18" height="40" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
        <rect x="88" y="118" width="24" height="10" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
        <line x1="95" y1="128" x2="93" y2="168" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
        <line x1="105" y1="128" x2="107" y2="168" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
        <line x1="92" y1="81" x2="82" y2="30" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
        <line x1="108" y1="81" x2="118" y2="30" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      </g>
      <GripRing cx={82} cy={30} r={6} />
      <GripRing cx={118} cy={30} r={6} />
      {/* 자극: 광배 + 악력 */}
      <MuscleGlow cx={100} cy={95} rx={18} ry={20} />
    </g>
  );
}

/** SQUAT WARM — 보디웨이트 스쿼트/런지 워밍업 (가벼운 squat motion). */
function SquatWarmScene() {
  const Body = (knee: number, hipY: number, headY: number) => (
    <g>
      <StickHead cx={100} cy={headY} r={9} />
      <rect x="91" y={headY + 10} width="18" height={hipY - headY - 10} fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      <rect x="88" y={hipY} width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      <line x1="95" y1={hipY + 12} x2="92" y2={knee} stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="108" y1={hipY + 12} x2="108" y2={knee} stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="92" y1={knee} x2="90" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="108" y1={knee} x2="108" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="90" cy="183" rx="9" ry="4" fill={SHOE} />
      <ellipse cx="108" cy="183" rx="9" ry="4" fill={SHOE} />
      {/* 팔 — 앞으로 (균형용) */}
      <line x1="91" y1={headY + 14} x2="65" y2={headY + 20} stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      <line x1="109" y1={headY + 14} x2="135" y2={headY + 20} stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
    </g>
  );
  return (
    <g>
      <g className="frame-1">{Body(145, 100, 50)}</g>
      <g className="frame-2">{Body(135, 115, 65)}</g>
      <g className="frame-3">{Body(130, 130, 80)}</g>
      <MotionArrow x={165} y1={80} y2={150} />
      <MuscleGlow cx={100} cy={145} rx={22} ry={22} />
    </g>
  );
}

/** STRETCH — 정적 스트레칭. 서서 한 자세 + 호흡 펄스. */
function StretchScene() {
  // 가운데 자세: 한 팔 위로, 옆으로 살짝 기울임 (광배/측면 스트레칭 느낌)
  return (
    <g>
      <line x1="92" y1="125" x2="90" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="108" y1="125" x2="108" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="90" cy="183" rx="9" ry="4" fill={SHOE} />
      <ellipse cx="108" cy="183" rx="9" ry="4" fill={SHOE} />
      <rect x="88" y="113" width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      {/* 토르소 — 살짝 기울임 (프레임마다) */}
      <g className="frame-1">
        <rect x="91" y="65" width="18" height="50" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
        <StickHead cx={100} cy={55} r={9} />
        <line x1="92" y1="68" x2="105" y2="25" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
        <line x1="108" y1="68" x2="80" y2="105" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      </g>
      <g className="frame-2">
        <path d="M 91 65 L 109 65 L 115 115 L 91 115 Z" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
        <StickHead cx={105} cy={55} r={9} />
        <line x1="97" y1="68" x2="115" y2="20" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
        <line x1="113" y1="68" x2="85" y2="100" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      </g>
      <g className="frame-3">
        <path d="M 91 65 L 109 65 L 120 115 L 95 115 Z" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
        <StickHead cx={110} cy={55} r={9} />
        <line x1="102" y1="68" x2="125" y2="18" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
        <line x1="118" y1="68" x2="90" y2="98" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      </g>
      <MuscleGlow cx={105} cy={85} rx={20} ry={20} />
    </g>
  );
}

function Dumbbell({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <rect x={cx - 1.5} y={cy - 2} width="3" height="4" fill={STROKE} />
      <rect x={cx - 9} y={cy - 5} width="6" height="10" rx="1.5" fill={EQUIP} stroke={STROKE} strokeWidth={STROKE_W} />
      <rect x={cx + 3} y={cy - 5} width="6" height="10" rx="1.5" fill={EQUIP} stroke={STROKE} strokeWidth={STROKE_W} />
    </g>
  );
}
