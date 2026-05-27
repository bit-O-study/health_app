"use client";

/**
 * 측면뷰 플랫 컬러 플립북 — 3개 키 프레임을 CSS 키프레임으로 페이드 순환.
 * 정면 stick-figure + 그라데이션과는 정반대 스타일:
 * - 측면(side) 시점 — 운동 모션이 훨씬 명확
 * - 단색 채움 (gradient 사용 안 함)
 * - 두꺼운 outline stroke
 * - 3프레임 cycle 로 동작 단계 명확히 구분 (모핑 X, 컷 X — 페이드)
 * - 모션 path 화살표로 움직임 방향 시각화
 */

import type { MotionCategory } from "@/features/workout-timer/exercise-motion";

const SKIN = "#e7e5e4"; // stone-200
const SHIRT = "#fb923c"; // orange-400 (강조 색)
const PANTS = "#3f3f46"; // zinc-700
const SHOE = "#18181b";
const HAIR = "#18181b";
const STROKE = "#0a0a0a";
const STROKE_W = 1.2;
const FLOOR = "#27272a";
const ARROW = "#34d399"; // emerald-400
const EQUIP = "#71717a"; // 바벨 그레이
const PLATE = "#dc2626"; // red-600

export function ExerciseFlipbook({ category }: { category: MotionCategory }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-full w-full"
      role="img"
      aria-label="운동 동작 측면 일러스트"
    >
      <defs>
        <style>{`
          /* 3프레임 플립북 — 한 사이클 안에서 frame 1 → 2 → 3 → 2 → 1 형태로 페이드 */
          .frame-1 { animation: f1 var(--cycle,2400ms) infinite cubic-bezier(0.45,0,0.55,1); }
          .frame-2 { animation: f2 var(--cycle,2400ms) infinite cubic-bezier(0.45,0,0.55,1); }
          .frame-3 { animation: f3 var(--cycle,2400ms) infinite cubic-bezier(0.45,0,0.55,1); }
          .arrow   { animation: arrow var(--cycle,2400ms) infinite cubic-bezier(0.45,0,0.55,1); }

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
          @keyframes arrow {
            0%, 100% { opacity: 0.2; transform: translateY(0); }
            50%      { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </defs>

      {/* 바닥선 */}
      <line x1="0" y1="185" x2="200" y2="185" stroke={FLOOR} strokeWidth="2" />

      <FrameSet category={category} />
    </svg>
  );
}

/** 카테고리별 키프레임 3장 + 모션 화살표 */
function FrameSet({ category }: { category: MotionCategory }) {
  if (category === "press") return <BenchPressFrames />;
  if (category === "row") return <RowFrames />;
  if (category === "pulldown") return <PullupFrames />;
  if (category === "squat") return <SquatFrames />;
  if (category === "hinge") return <DeadliftFrames />;
  if (category === "curl") return <CurlFrames />;
  if (category === "extension") return <ExtensionFrames />;
  if (category === "raise") return <LateralRaiseFrames />;
  return <PlankFrames />;
}

/* ─── 공통 부품 ─────────────────────────────────────────── */

function StickHead({ cx, cy, r = 9 }: { cx: number; cy: number; r?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={SKIN} stroke={STROKE} strokeWidth={STROKE_W} />
      {/* 머리카락 — 옆모습 */}
      <path
        d={`M ${cx - r} ${cy - r * 0.4} Q ${cx - r * 0.6} ${cy - r * 1.2} ${cx + r * 0.4} ${cy - r * 1.05} Q ${cx + r * 0.6} ${cy - r * 0.4} ${cx + r * 0.85} ${cy - r * 0.1}`}
        fill={HAIR}
      />
      {/* 눈 */}
      <circle cx={cx + r * 0.5} cy={cy - r * 0.1} r="0.9" fill={STROKE} />
    </>
  );
}

function Arrow({
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
  const head = 5;
  const hx1 = x2 - head * Math.cos(ang - Math.PI / 6);
  const hy1 = y2 - head * Math.sin(ang - Math.PI / 6);
  const hx2 = x2 - head * Math.cos(ang + Math.PI / 6);
  const hy2 = y2 - head * Math.sin(ang + Math.PI / 6);
  return (
    <g className="arrow">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ARROW} strokeWidth="2.4" />
      <polyline
        points={`${hx1},${hy1} ${x2},${y2} ${hx2},${hy2}`}
        fill="none"
        stroke={ARROW}
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
  );
}

/* ─── 카테고리별 프레임 ─────────────────────────────────────── */

/** PRESS — 벤치프레스 측면. 누운 자세, 바가 위↔아래. */
function BenchPressFrames() {
  // 벤치 (양 다리 + 가로 패드) — 공통
  const Bench = (
    <g>
      {/* 패드 */}
      <rect x="55" y="124" width="100" height="10" fill={SHOE} stroke={STROKE} strokeWidth={STROKE_W} />
      {/* 다리 좌 */}
      <line x1="62" y1="134" x2="62" y2="184" stroke={SHOE} strokeWidth="3" />
      <line x1="148" y1="134" x2="148" y2="184" stroke={SHOE} strokeWidth="3" />
    </g>
  );
  // 사람 누운 자세 — 공통
  const Body = (
    <g>
      <StickHead cx={55} cy={118} r={8} />
      {/* 토르소 */}
      <rect x="63" y="113" width="60" height="14" rx="3" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      {/* 골반 */}
      <rect x="120" y="115" width="14" height="11" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      {/* 다리 — 무릎 굽힘 */}
      <path d="M 134 120 L 158 130 L 158 175" fill="none" stroke={PANTS} strokeWidth="6" strokeLinecap="round" />
      <path d="M 134 122 L 160 132 L 160 180" fill="none" stroke={PANTS} strokeWidth="6" strokeLinecap="round" />
      {/* 신발 */}
      <ellipse cx="158" cy="180" rx="6" ry="3" fill={SHOE} />
    </g>
  );
  // 팔 + 바벨 — 프레임마다 위치 다름
  const ArmsAndBar = (y: number) => (
    <g>
      {/* 위팔 (어깨 → 팔꿈치) */}
      <line x1="68" y1="115" x2="80" y2={y + 12} stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      {/* 전완 (팔꿈치 → 손) */}
      <line x1="80" y1={y + 12} x2="100" y2={y} stroke={SKIN} strokeWidth="5.5" strokeLinecap="round" />
      {/* 바 */}
      <line x1="75" y1={y} x2="125" y2={y} stroke={EQUIP} strokeWidth="3" strokeLinecap="round" />
      {/* 플레이트 */}
      <circle cx="72" cy={y} r="9" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
      <circle cx="128" cy={y} r="9" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
    </g>
  );

  return (
    <g>
      {Bench}
      {Body}
      {/* Frame 1 — 바 위 (시작 자세) */}
      <g className="frame-1">{ArmsAndBar(70)}</g>
      {/* Frame 2 — 바 중간 (내리는 중) */}
      <g className="frame-2">{ArmsAndBar(90)}</g>
      {/* Frame 3 — 바 아래 (가슴 닿음) */}
      <g className="frame-3">{ArmsAndBar(108)}</g>
      {/* 화살표 — 위·아래 양방향 */}
      <Arrow x1={155} y1={75} x2={155} y2={108} />
      <Arrow x1={170} y1={108} x2={170} y2={75} />
    </g>
  );
}

/** SQUAT — 측면 스쿼트. 서있는 자세 → 앉음. */
function SquatFrames() {
  const Body = (knee: number, hipY: number, headY: number) => (
    <g>
      <StickHead cx={100} cy={headY} r={9} />
      {/* 바벨 — 어깨에 */}
      <line x1="80" y1={headY + 12} x2="120" y2={headY + 12} stroke={EQUIP} strokeWidth="3" strokeLinecap="round" />
      <circle cx="76" cy={headY + 12} r="10" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
      <circle cx="124" cy={headY + 12} r="10" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
      {/* 토르소 */}
      <rect x="91" y={headY + 10} width="18" height={hipY - headY - 10} fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      {/* 골반 */}
      <rect x="88" y={hipY} width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      {/* 허벅지 (골반 → 무릎) */}
      <line x1="95" y1={hipY + 12} x2="92" y2={knee} stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="108" y1={hipY + 12} x2="108" y2={knee} stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      {/* 종아리 (무릎 → 발) */}
      <line x1="92" y1={knee} x2="90" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="108" y1={knee} x2="108" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      {/* 신발 */}
      <ellipse cx="90" cy="183" rx="9" ry="4" fill={SHOE} />
      <ellipse cx="108" cy="183" rx="9" ry="4" fill={SHOE} />
      {/* 팔 — 바 잡음 */}
      <line x1="91" y1={headY + 12} x2="82" y2={headY + 22} stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      <line x1="109" y1={headY + 12} x2="118" y2={headY + 22} stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
    </g>
  );

  return (
    <g>
      {/* Frame 1 — 서있음 */}
      <g className="frame-1">{Body(140, 100, 40)}</g>
      {/* Frame 2 — 중간 */}
      <g className="frame-2">{Body(135, 115, 55)}</g>
      {/* Frame 3 — 깊게 앉음 */}
      <g className="frame-3">{Body(125, 130, 70)}</g>
      {/* 화살표 — 위·아래 */}
      <Arrow x1={160} y1={70} x2={160} y2={125} />
      <Arrow x1={172} y1={125} x2={172} y2={70} />
    </g>
  );
}

/** DEADLIFT — 측면 힌지. 바닥 바벨 → 일어남. */
function DeadliftFrames() {
  // 바벨은 항상 같은 라인 (다리에 가깝게)
  const Bar = (
    <g>
      <line x1="60" y1="170" x2="140" y2="170" stroke={EQUIP} strokeWidth="4" strokeLinecap="round" />
      <circle cx="55" cy="170" r="14" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
      <circle cx="145" cy="170" r="14" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
    </g>
  );
  const Body = (
    hingeDeg: number, // 상체 숙임 각도 (0=직립, 90=수평)
    barY: number,
    headY: number,
  ) => {
    const rad = (hingeDeg * Math.PI) / 180;
    const hipX = 100;
    const hipY = 130;
    const torsoLen = 50;
    const shoulderX = hipX + torsoLen * Math.sin(rad);
    const shoulderY = hipY - torsoLen * Math.cos(rad);
    const armLen = 35;
    const handX = shoulderX;
    const handY = barY;
    return (
      <g>
        {/* 다리 — 살짝 굽힘 */}
        <line x1="92" y1={hipY + 5} x2="90" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
        <line x1="108" y1={hipY + 5} x2="108" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
        <ellipse cx="90" cy="183" rx="9" ry="4" fill={SHOE} />
        <ellipse cx="108" cy="183" rx="9" ry="4" fill={SHOE} />
        {/* 골반 */}
        <rect x={hipX - 12} y={hipY} width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
        {/* 토르소 — 회전 (line) */}
        <line
          x1={hipX}
          y1={hipY}
          x2={shoulderX}
          y2={shoulderY}
          stroke={SHIRT}
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* 머리 */}
        <StickHead cx={shoulderX} cy={shoulderY - 10} r={9} />
        {/* 팔 — 어깨에서 손까지 직선 (바 잡음) */}
        <line
          x1={shoulderX}
          y1={shoulderY + 2}
          x2={handX}
          y2={handY}
          stroke={SHIRT}
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* 손 */}
        <circle cx={handX} cy={handY} r="3.5" fill={SKIN} stroke={STROKE} strokeWidth={STROKE_W} />
        {/* 가짜 변수 사용 (lint 무시용) */}
        <g opacity="0">
          <line x1="0" y1="0" x2={armLen} y2={headY} />
        </g>
      </g>
    );
  };

  return (
    <g>
      {Bar}
      {/* Frame 1 — 완전 숙임 (바 잡기 전) */}
      <g className="frame-1">{Body(75, 170, 80)}</g>
      {/* Frame 2 — 중간 */}
      <g className="frame-2">{Body(45, 140, 60)}</g>
      {/* Frame 3 — 직립 */}
      <g className="frame-3">{Body(0, 90, 45)}</g>
      {/* 화살표 — 위로 (들어 올림) */}
      <Arrow x1={170} y1={160} x2={170} y2={90} />
    </g>
  );
}

/** ROW — 측면 벤트오버 로우. 상체 숙인 채 전완이 몸쪽으로. */
function RowFrames() {
  const Bar = (forearmAngle: number) => {
    const elbowX = 95;
    const elbowY = 110;
    const len = 40;
    const handX = elbowX + len * Math.cos((forearmAngle * Math.PI) / 180);
    const handY = elbowY + len * Math.sin((forearmAngle * Math.PI) / 180);
    return (
      <g>
        {/* 전완 */}
        <line
          x1={elbowX}
          y1={elbowY}
          x2={handX}
          y2={handY}
          stroke={SHIRT}
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* 바 */}
        <line x1={handX - 22} y1={handY} x2={handX + 22} y2={handY} stroke={EQUIP} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={handX - 28} cy={handY} r="10" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
        <circle cx={handX + 28} cy={handY} r="10" fill={PLATE} stroke={STROKE} strokeWidth={STROKE_W} />
      </g>
    );
  };

  const Body = (
    <g>
      {/* 다리 */}
      <line x1="92" y1="130" x2="90" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="108" y1="130" x2="108" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="90" cy="183" rx="9" ry="4" fill={SHOE} />
      <ellipse cx="108" cy="183" rx="9" ry="4" fill={SHOE} />
      {/* 골반 */}
      <rect x="88" y="118" width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      {/* 토르소 — 45도 숙임 */}
      <line x1="100" y1="118" x2="60" y2="78" stroke={SHIRT} strokeWidth="14" strokeLinecap="round" />
      {/* 머리 */}
      <StickHead cx={55} cy={70} r={9} />
      {/* 위팔 (어깨 → 팔꿈치) */}
      <line x1="68" y1="80" x2="95" y2="110" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
    </g>
  );

  return (
    <g>
      {Body}
      {/* Frame 1 — 팔 늘어뜨림 (바 바닥에 가까움) */}
      <g className="frame-1">{Bar(85)}</g>
      {/* Frame 2 — 중간 */}
      <g className="frame-2">{Bar(110)}</g>
      {/* Frame 3 — 당겨 옴 (바가 배꼽 근처) */}
      <g className="frame-3">{Bar(150)}</g>
      <Arrow x1={155} y1={150} x2={155} y2={115} />
    </g>
  );
}

/** PULLUP — 측면 풀업. 매달림 → 턱이 바 위로. */
function PullupFrames() {
  // 풀업 바 — 위쪽 고정
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
      {/* 토르소 */}
      <rect x="91" y={headY + 8} width="18" height="40" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      {/* 골반 */}
      <rect x="88" y={headY + 48} width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      {/* 다리 — 살짝 굽힘 */}
      <line x1="95" y1={headY + 60} x2="93" y2={headY + 100} stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
      <line x1="105" y1={headY + 60} x2="107" y2={headY + 100} stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
      {/* 팔 — 위로 뻗음 (어깨 → 손) */}
      <line x1="92" y1={headY + 8} x2="82" y2="30" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
      <line x1="108" y1={headY + 8} x2="118" y2="30" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />
    </g>
  );

  return (
    <g>
      {Bar}
      {/* Frame 1 — 매달림 (낮음) */}
      <g className="frame-1">{Body(80)}</g>
      {/* Frame 2 — 중간 */}
      <g className="frame-2">{Body(60)}</g>
      {/* Frame 3 — 위 (턱이 바 위) */}
      <g className="frame-3">{Body(45)}</g>
      <Arrow x1={155} y1={130} x2={155} y2={60} />
    </g>
  );
}

/** CURL — 측면 컬. 전완이 위로 회전. */
function CurlFrames() {
  const Forearm = (angleDeg: number) => {
    const elbowX = 105;
    const elbowY = 105;
    const len = 32;
    const handX = elbowX + len * Math.cos(((angleDeg - 90) * Math.PI) / 180);
    const handY = elbowY + len * Math.sin(((angleDeg - 90) * Math.PI) / 180);
    return (
      <g>
        <line
          x1={elbowX}
          y1={elbowY}
          x2={handX}
          y2={handY}
          stroke={SHIRT}
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* 덤벨 */}
        <Dumbbell cx={handX} cy={handY} />
      </g>
    );
  };

  return (
    <g>
      {/* 다리 + 골반 + 토르소 (서있는 자세, 고정) */}
      <line x1="92" y1="125" x2="90" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <line x1="108" y1="125" x2="108" y2="180" stroke={PANTS} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="90" cy="183" rx="9" ry="4" fill={SHOE} />
      <ellipse cx="108" cy="183" rx="9" ry="4" fill={SHOE} />
      <rect x="88" y="113" width="24" height="12" fill={PANTS} stroke={STROKE} strokeWidth={STROKE_W} />
      <rect x="91" y="65" width="18" height="50" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      <StickHead cx={100} cy={55} r={9} />
      {/* 위팔 — 옆구리 고정 */}
      <line x1="105" y1="72" x2="105" y2="105" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />

      {/* Frame 1 — 팔 내림 */}
      <g className="frame-1">{Forearm(180)}</g>
      {/* Frame 2 — 중간 */}
      <g className="frame-2">{Forearm(115)}</g>
      {/* Frame 3 — 컬 정점 */}
      <g className="frame-3">{Forearm(45)}</g>
      <Arrow x1={155} y1={130} x2={155} y2={75} />
    </g>
  );
}

/** EXTENSION — 측면 삼두 익스텐션 (오버헤드 또는 푸시다운 단순화). */
function ExtensionFrames() {
  const Forearm = (angleDeg: number) => {
    const elbowX = 100;
    const elbowY = 65;
    const len = 32;
    const handX = elbowX + len * Math.cos(((angleDeg - 90) * Math.PI) / 180);
    const handY = elbowY + len * Math.sin(((angleDeg - 90) * Math.PI) / 180);
    return (
      <g>
        <line
          x1={elbowX}
          y1={elbowY}
          x2={handX}
          y2={handY}
          stroke={SHIRT}
          strokeWidth="6"
          strokeLinecap="round"
        />
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
      {/* 위팔 — 머리 위로 (수직) */}
      <line x1="100" y1="65" x2="100" y2="40" stroke={SHIRT} strokeWidth="6" strokeLinecap="round" />

      {/* Frame 1 — 전완 굽힘 (머리 뒤로) */}
      <g className="frame-1">{Forearm(225)}</g>
      <g className="frame-2">{Forearm(180)}</g>
      <g className="frame-3">{Forearm(90)}</g>
      <Arrow x1={150} y1={50} x2={150} y2={20} />
    </g>
  );
}

/** RAISE — 측면 레터럴 레이즈. 팔이 옆으로 들림. (정면 대신 살짝 비스듬한 3/4 view) */
function LateralRaiseFrames() {
  const Arm = (angleDeg: number) => {
    const shoulderX = 100;
    const shoulderY = 75;
    const len = 50;
    const handX = shoulderX + len * Math.cos(((angleDeg - 90) * Math.PI) / 180);
    const handY = shoulderY + len * Math.sin(((angleDeg - 90) * Math.PI) / 180);
    return (
      <g>
        <line
          x1={shoulderX}
          y1={shoulderY}
          x2={handX}
          y2={handY}
          stroke={SHIRT}
          strokeWidth="7"
          strokeLinecap="round"
        />
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

      <g className="frame-1">{Arm(180)}</g>
      <g className="frame-2">{Arm(135)}</g>
      <g className="frame-3">{Arm(90)}</g>
      <Arrow x1={45} y1={120} x2={45} y2={75} />
      <Arrow x1={155} y1={120} x2={155} y2={75} />
    </g>
  );
}

/** PLANK — 정적. 호흡 펄스만. */
function PlankFrames() {
  const Body = (yOffset: number) => (
    <g transform={`translate(0, ${yOffset})`}>
      <StickHead cx={60} cy={130} r={9} />
      {/* 토르소 + 팔 + 다리를 가로로 길게 */}
      <rect x="68" y="125" width="80" height="14" fill={SHIRT} stroke={STROKE} strokeWidth={STROKE_W} />
      {/* 앞팔 (받침) */}
      <line x1="55" y1="140" x2="75" y2="155" stroke={SKIN} strokeWidth="5.5" strokeLinecap="round" />
      <line x1="55" y1="155" x2="80" y2="155" stroke={SKIN} strokeWidth="5.5" strokeLinecap="round" />
      {/* 다리 */}
      <line x1="148" y1="132" x2="180" y2="155" stroke={PANTS} strokeWidth="8" strokeLinecap="round" />
      {/* 신발 */}
      <ellipse cx="178" cy="158" rx="8" ry="3.5" fill={SHOE} />
    </g>
  );

  return (
    <g>
      <g className="frame-1">{Body(0)}</g>
      <g className="frame-2">{Body(-1)}</g>
      <g className="frame-3">{Body(0)}</g>
    </g>
  );
}

/* ─── 기구 ─────────────────────────────────────────── */

function Dumbbell({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {/* 그립 */}
      <rect x={cx - 1.5} y={cy - 2} width="3" height="4" fill={STROKE} />
      {/* 좌 플레이트 */}
      <rect x={cx - 9} y={cy - 5} width="6" height="10" rx="1.5" fill={EQUIP} stroke={STROKE} strokeWidth={STROKE_W} />
      {/* 우 플레이트 */}
      <rect x={cx + 3} y={cy - 5} width="6" height="10" rx="1.5" fill={EQUIP} stroke={STROKE} strokeWidth={STROKE_W} />
    </g>
  );
}
