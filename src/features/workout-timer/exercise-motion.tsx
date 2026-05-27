"use client";

/**
 * 운동 동작 정면 일러스트 + 모션 애니메이션.
 *
 * 디자인:
 * - 곡선 실루엣 (path + bezier) 으로 사람 형태
 * - 그라데이션 음영 → 입체감
 * - 카테고리별 기구(바벨/덤벨/케이블/벤치)
 * - 활성 근육군에 emerald 글로우가 모션과 동기로 펄스
 * - 모션은 cubic-bezier(0.45,0,0.55,1) 자연 가속/감속
 * - 모든 transform 은 transform-box: fill-box → SVG 회전 중심 정확
 */

export type MotionCategory =
  | "press"
  | "row"
  | "pulldown"
  | "squat"
  | "hinge"
  | "curl"
  | "extension"
  | "raise"
  | "static";

const CATEGORY_MAP: Record<string, MotionCategory> = {
  // 프레스
  "bench-press": "press",
  "incline-press": "press",
  "decline-press": "press",
  "chest-fly": "press",
  "pec-deck": "press",
  "cable-crossover": "press",
  "push-up": "press",
  dips: "press",
  "close-grip-bench-press": "press",
  "machine-chest-press": "press",
  "smith-bench-press": "press",
  "incline-cable-fly": "press",
  "dumbbell-pullover": "press",
  "diamond-pushup": "press",
  "bench-dip": "press",
  ohp: "press",
  "arnold-press": "press",
  "machine-shoulder-press": "press",
  // 로우
  "barbell-row": "row",
  "t-bar-row": "row",
  "one-arm-dumbbell-row": "row",
  "seated-cable-row": "row",
  "pendlay-row": "row",
  "meadows-row": "row",
  "inverted-row": "row",
  "face-pull": "row",
  "rear-delt-fly": "row",
  "reverse-pec-deck": "row",
  "machine-rear-delt-fly": "row",
  // 풀다운
  "lat-pulldown": "pulldown",
  "pull-up": "pulldown",
  "chin-up": "pulldown",
  "wide-grip-pull-up": "pulldown",
  "straight-arm-pulldown": "pulldown",
  // 스쿼트
  squat: "squat",
  "front-squat": "squat",
  "leg-press": "squat",
  "hack-squat": "squat",
  "goblet-squat": "squat",
  "smith-squat": "squat",
  lunge: "squat",
  "bulgarian-split-squat": "squat",
  "walking-lunge": "squat",
  "step-up": "squat",
  "hip-thrust": "squat",
  "glute-bridge": "squat",
  "leg-extension": "squat",
  "leg-curl": "squat",
  "seated-leg-curl": "squat",
  "standing-calf-raise": "squat",
  "seated-calf-raise": "squat",
  "hip-abduction": "squat",
  "hip-adduction": "squat",
  "cable-kickback": "squat",
  "pistol-squat": "squat",
  // 힌지
  deadlift: "hinge",
  "sumo-deadlift": "hinge",
  rdl: "hinge",
  "stiff-leg-deadlift": "hinge",
  "good-morning": "hinge",
  hyperextension: "hinge",
  // 컬
  "biceps-curl": "curl",
  "hammer-curl": "curl",
  "preacher-curl": "curl",
  "ez-bar-curl": "curl",
  "incline-curl": "curl",
  "concentration-curl": "curl",
  "reverse-curl": "curl",
  "wrist-curl": "curl",
  "drag-curl": "curl",
  "zottman-curl": "curl",
  "cable-rope-hammer-curl": "curl",
  // 익스텐션
  "triceps-pushdown": "extension",
  "skull-crusher": "extension",
  "overhead-triceps-extension": "extension",
  "triceps-kickback": "extension",
  // 레이즈
  "lateral-raise": "raise",
  "front-raise": "raise",
  "cable-lateral-raise": "raise",
  "upright-row": "raise",
  shrug: "raise",
  // 정적
  plank: "static",
  "side-plank": "static",
  "hanging-leg-raise": "static",
  "cable-crunch": "static",
  "sit-up": "static",
  crunch: "static",
  "russian-twist": "static",
  "ab-rollout": "static",
  "mountain-climber": "static",
  "wood-chopper": "static",
  "pallof-press": "static",
};

export function motionCategoryFor(exerciseId: string): MotionCategory {
  return CATEGORY_MAP[exerciseId] ?? "static";
}

/**
 * 카테고리별 정면 운동 일러스트 + 애니메이션.
 */
export function MotionFigure({ category }: { category: MotionCategory }) {
  return (
    <svg
      viewBox="0 0 100 160"
      className="h-full w-full"
      role="img"
      aria-label="운동 동작 일러스트"
    >
      <defs>
        {/* 몸체 그라데이션 — 상→하 어두워짐 (어깨가 살짝 밝게) */}
        <linearGradient id="bodyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#52525b" />
          <stop offset="100%" stopColor="#2a2a30" />
        </linearGradient>
        {/* 사지 (팔/다리) 그라데이션 — 양 끝이 살짝 어두워짐 */}
        <linearGradient id="limbG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3a3a40" />
          <stop offset="50%" stopColor="#52525b" />
          <stop offset="100%" stopColor="#3a3a40" />
        </linearGradient>
        {/* 머리 — 살짝 입체감 */}
        <radialGradient id="headG" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#6b7280" />
          <stop offset="100%" stopColor="#3a3a40" />
        </radialGradient>
        {/* 활성 근육 글로우 — 모션과 동기 */}
        <radialGradient id="muscleG" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#10b981" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
        {/* 바벨 플레이트 그라데이션 */}
        <radialGradient id="plateG" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
        {/* 덤벨 그라데이션 */}
        <linearGradient id="dumbbellG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a1a1aa" />
          <stop offset="100%" stopColor="#52525b" />
        </linearGradient>
        <style>{`
          .ease { animation-timing-function: cubic-bezier(0.45,0,0.55,1); }
          .ease-soft { animation-timing-function: cubic-bezier(0.65,0,0.35,1); }

          .m-press      { animation: pressArms 2.6s infinite cubic-bezier(0.45,0,0.55,1); transform-box: fill-box; transform-origin: 50% 100%; }
          .m-press-bar  { animation: pressBar 2.6s infinite cubic-bezier(0.45,0,0.55,1); transform-box: fill-box; transform-origin: 50% 50%; }
          .m-row-fa     { animation: rowFa 2.2s infinite cubic-bezier(0.45,0,0.55,1); transform-box: fill-box; transform-origin: 50% 0%; }
          .m-row-torso  { animation: rowTorso 2.2s infinite cubic-bezier(0.45,0,0.55,1); transform-box: fill-box; transform-origin: 50% 100%; }
          .m-pull-body  { animation: pullBody 2.8s infinite cubic-bezier(0.45,0,0.55,1); transform-box: fill-box; transform-origin: 50% 0%; }
          .m-squat      { animation: squat 2.8s infinite cubic-bezier(0.45,0,0.55,1); transform-box: fill-box; transform-origin: 50% 0%; }
          .m-hinge      { animation: hinge 2.8s infinite cubic-bezier(0.45,0,0.55,1); transform-box: fill-box; transform-origin: 50% 100%; }
          .m-curl-l     { animation: curlL 1.9s infinite cubic-bezier(0.45,0,0.55,1); transform-box: fill-box; transform-origin: 50% 0%; }
          .m-curl-r     { animation: curlR 1.9s infinite cubic-bezier(0.45,0,0.55,1); transform-box: fill-box; transform-origin: 50% 0%; }
          .m-ext-l      { animation: extL 1.9s infinite cubic-bezier(0.45,0,0.55,1); transform-box: fill-box; transform-origin: 50% 0%; }
          .m-ext-r      { animation: extR 1.9s infinite cubic-bezier(0.45,0,0.55,1); transform-box: fill-box; transform-origin: 50% 0%; }
          .m-raise-l    { animation: raiseL 2.4s infinite cubic-bezier(0.45,0,0.55,1); transform-box: fill-box; transform-origin: 100% 0%; }
          .m-raise-r    { animation: raiseR 2.4s infinite cubic-bezier(0.45,0,0.55,1); transform-box: fill-box; transform-origin: 0% 0%; }
          .m-breathe    { animation: breathe 3.6s infinite cubic-bezier(0.45,0,0.55,1); transform-box: fill-box; transform-origin: 50% 50%; }
          .m-glow       { animation: glow 2.6s infinite cubic-bezier(0.45,0,0.55,1); transform-origin: center; }
          .m-glow-fast  { animation: glow 1.9s infinite cubic-bezier(0.45,0,0.55,1); transform-origin: center; }
          .m-glow-slow  { animation: glow 2.8s infinite cubic-bezier(0.45,0,0.55,1); transform-origin: center; }

          @keyframes pressArms { 0%,100% { transform: translateY(-2px); } 50% { transform: translateY(10px); } }
          @keyframes pressBar  { 0%,100% { transform: translateY(-2px); } 50% { transform: translateY(10px); } }
          @keyframes rowFa     { 0%,100% { transform: translateY(2px) scaleY(1); } 50% { transform: translateY(-8px) scaleY(0.55); } }
          @keyframes rowTorso  { 0%,100% { transform: rotate(8deg); } 50% { transform: rotate(2deg); } }
          @keyframes pullBody  { 0%,100% { transform: translateY(8px); } 50% { transform: translateY(-2px); } }
          @keyframes squat     { 0%,100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(8px) scaleY(0.84); } }
          @keyframes hinge     { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(30deg); } }
          @keyframes curlL     { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-115deg); } }
          @keyframes curlR     { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(115deg); } }
          @keyframes extL      { 0%,100% { transform: rotate(-115deg); } 50% { transform: rotate(0deg); } }
          @keyframes extR      { 0%,100% { transform: rotate(115deg); } 50% { transform: rotate(0deg); } }
          @keyframes raiseL    { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(85deg); } }
          @keyframes raiseR    { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-85deg); } }
          @keyframes breathe   { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
          @keyframes glow      { 0%,100% { opacity: 0.25; } 50% { opacity: 0.95; } }
        `}</style>
      </defs>

      <BodyBase />
      <CategoryOverlay category={category} />
    </svg>
  );
}

/** 공통 인체 베이스 — 머리, 어깨, 토르소, 골반, 다리. 모든 카테고리에서 공유. */
function BodyBase() {
  return (
    <g>
      {/* 머리 */}
      <circle cx="50" cy="14" r="8" fill="url(#headG)" />
      {/* 목 (사다리꼴 path) */}
      <path d="M46 21 L54 21 L52 27 L48 27 Z" fill="url(#bodyG)" />
      {/* 트라페즈/승모 + 어깨 — V 자 + 둥근 어깨 */}
      <path
        d="M28 32 Q50 25 72 32 L67 41 Q50 36 33 41 Z"
        fill="url(#bodyG)"
      />
      {/* 토르소 — V 테이퍼 (어깨 넓고 허리 좁게) */}
      <path
        d="M33 40 Q34 50 36 75 L64 75 Q66 50 67 40 Z"
        fill="url(#bodyG)"
      />
      {/* 골반 — 살짝 넓음 */}
      <path
        d="M36 75 Q34 80 36 92 L64 92 Q66 80 64 75 Z"
        fill="url(#bodyG)"
      />
    </g>
  );
}

/** 카테고리별 추가 요소 — 사지(애니메이션) + 기구 + 활성 근육 글로우. */
function CategoryOverlay({ category }: { category: MotionCategory }) {
  if (category === "press") return <PressOverlay />;
  if (category === "row") return <RowOverlay />;
  if (category === "pulldown") return <PulldownOverlay />;
  if (category === "squat") return <SquatOverlay />;
  if (category === "hinge") return <HingeOverlay />;
  if (category === "curl") return <CurlOverlay />;
  if (category === "extension") return <ExtensionOverlay />;
  if (category === "raise") return <RaiseOverlay />;
  return <StaticOverlay />;
}

/* ─── 카테고리별 오버레이 ─────────────────────────────────────────── */

function Legs() {
  return (
    <g>
      {/* 허벅지 */}
      <path d="M37 92 Q35 110 40 132 L46 132 Q47 110 46 92 Z" fill="url(#limbG)" />
      <path d="M54 92 Q53 110 54 132 L60 132 Q65 110 63 92 Z" fill="url(#limbG)" />
      {/* 종아리 */}
      <path d="M40 132 Q38 145 40 154 L46 154 Q47 145 46 132 Z" fill="url(#bodyG)" />
      <path d="M54 132 Q53 145 54 154 L60 154 Q62 145 60 132 Z" fill="url(#bodyG)" />
    </g>
  );
}

/** PRESS — 양팔이 위로 뻗어 바벨이 위·아래로. 가슴에 글로우. */
function PressOverlay() {
  return (
    <g>
      <Legs />
      {/* 가슴 근육 글로우 — 운동 페이스와 동기 */}
      <circle cx="50" cy="48" r="13" fill="url(#muscleG)" className="m-glow" />
      {/* 양팔 — 위팔 + 전완 함께 위로 뻗음, 움직임 동기화 */}
      <g className="m-press">
        {/* 위팔 (좌) */}
        <path d="M32 24 Q30 32 32 42 L38 42 Q40 32 38 24 Z" fill="url(#limbG)" />
        {/* 위팔 (우) */}
        <path d="M62 24 Q60 32 62 42 L68 42 Q70 32 68 24 Z" fill="url(#limbG)" />
        {/* 전완 (좌) */}
        <path d="M32 12 Q31 18 32 24 L38 24 Q39 18 38 12 Z" fill="url(#bodyG)" />
        {/* 전완 (우) */}
        <path d="M62 12 Q61 18 62 24 L68 24 Q69 18 68 12 Z" fill="url(#bodyG)" />
      </g>
      {/* 바벨 */}
      <g className="m-press-bar">
        {/* 바 */}
        <rect x="20" y="9" width="60" height="2" rx="1" fill="#a1a1aa" />
        {/* 플레이트 좌 */}
        <ellipse cx="22" cy="10" rx="4" ry="6" fill="url(#plateG)" />
        {/* 플레이트 우 */}
        <ellipse cx="78" cy="10" rx="4" ry="6" fill="url(#plateG)" />
        {/* 그립 표식 */}
        <rect x="34" y="9.4" width="1" height="1.2" fill="#52525b" />
        <rect x="65" y="9.4" width="1" height="1.2" fill="#52525b" />
      </g>
    </g>
  );
}

/** ROW — 토르소 살짝 숙임 + 전완이 몸쪽으로 당겨짐. 등 글로우. */
function RowOverlay() {
  return (
    <g>
      <Legs />
      {/* 등 글로우 (몸 뒤쪽이라 측면 가장자리에 두 개) */}
      <circle cx="35" cy="55" r="6" fill="url(#muscleG)" className="m-glow" />
      <circle cx="65" cy="55" r="6" fill="url(#muscleG)" className="m-glow" />
      {/* 위팔 — 옆구리 옆에 고정 */}
      <path d="M22 38 Q21 55 22 70 L30 70 Q31 55 30 38 Z" fill="url(#limbG)" />
      <path d="M70 38 Q69 55 70 70 L78 70 Q79 55 78 38 Z" fill="url(#limbG)" />
      {/* 전완 — 위에서 아래로 늘어진 상태에서 몸쪽으로 당김 */}
      <g className="m-row-fa">
        <path d="M22 70 Q21 85 22 92 L30 92 Q31 85 30 70 Z" fill="url(#bodyG)" />
      </g>
      <g className="m-row-fa">
        <path d="M70 70 Q69 85 70 92 L78 92 Q79 85 78 70 Z" fill="url(#bodyG)" />
      </g>
      {/* 덤벨 — 손에 들려있음 (전완 끝) */}
      <g className="m-row-fa">
        <Dumbbell cx={26} cy={92} small />
      </g>
      <g className="m-row-fa">
        <Dumbbell cx={74} cy={92} small />
      </g>
    </g>
  );
}

/** PULLDOWN — 양팔 위로 뻗어 바를 잡고, 몸이 위·아래로. 광배 글로우. */
function PulldownOverlay() {
  return (
    <g>
      <g className="m-pull-body">
        <Legs />
        {/* 광배 글로우 */}
        <circle cx="36" cy="55" r="6" fill="url(#muscleG)" className="m-glow" />
        <circle cx="64" cy="55" r="6" fill="url(#muscleG)" className="m-glow" />
        {/* 위팔 위로 뻗음 */}
        <path d="M30 24 Q28 32 32 42 L38 42 Q40 32 38 24 Z" fill="url(#limbG)" />
        <path d="M62 24 Q60 32 68 42 L72 42 Q72 32 70 24 Z" fill="url(#limbG)" />
        {/* 전완 위로 */}
        <path d="M30 12 Q29 18 32 24 L38 24 Q39 18 38 12 Z" fill="url(#bodyG)" />
        <path d="M62 12 Q61 18 68 24 L72 24 Q71 18 70 12 Z" fill="url(#bodyG)" />
      </g>
      {/* 풀다운 바 — 머리 위 고정 */}
      <rect x="18" y="5" width="64" height="2" rx="1" fill="#a1a1aa" />
      {/* 케이블 — 천장에서 내려옴 */}
      <line x1="50" y1="0" x2="50" y2="5" stroke="#71717a" strokeWidth="1" />
    </g>
  );
}

/** SQUAT — 어깨에 바벨, 몸이 앉았다 일어남. 대퇴/둔근 글로우. */
function SquatOverlay() {
  return (
    <g className="m-squat">
      {/* 바벨 — 어깨 위에 얹힘 */}
      <rect x="22" y="29" width="56" height="2" rx="1" fill="#a1a1aa" />
      <ellipse cx="24" cy="30" rx="4" ry="6" fill="url(#plateG)" />
      <ellipse cx="76" cy="30" rx="4" ry="6" fill="url(#plateG)" />
      {/* 양팔 — 바를 잡음 */}
      <path d="M22 34 Q20 50 22 64 L30 64 Q32 50 30 34 Z" fill="url(#limbG)" />
      <path d="M70 34 Q68 50 70 64 L78 64 Q80 50 78 34 Z" fill="url(#limbG)" />
      <path d="M22 64 Q20 75 22 78 L30 78 Q32 75 30 64 Z" fill="url(#bodyG)" />
      <path d="M70 64 Q68 75 70 78 L78 78 Q80 75 78 64 Z" fill="url(#bodyG)" />
      {/* 대퇴 글로우 */}
      <ellipse
        cx="41"
        cy="110"
        rx="6"
        ry="10"
        fill="url(#muscleG)"
        className="m-glow"
      />
      <ellipse
        cx="59"
        cy="110"
        rx="6"
        ry="10"
        fill="url(#muscleG)"
        className="m-glow"
      />
      <Legs />
    </g>
  );
}

/** HINGE — 상체가 앞으로 숙임. 허리/햄스트링 글로우. */
function HingeOverlay() {
  return (
    <g>
      {/* 다리는 고정 */}
      <Legs />
      {/* 햄스트링 글로우 */}
      <ellipse
        cx="41"
        cy="118"
        rx="5"
        ry="9"
        fill="url(#muscleG)"
        className="m-glow"
      />
      <ellipse
        cx="59"
        cy="118"
        rx="5"
        ry="9"
        fill="url(#muscleG)"
        className="m-glow"
      />
      {/* 상체 + 팔이 함께 숙임 — m-hinge 그룹 */}
      <g className="m-hinge">
        {/* 토르소를 다시 한 번 그려서 회전 (BodyBase 의 토르소는 정적, 여기는 회전 버전) */}
        <path
          d="M33 40 Q34 50 36 75 L64 75 Q66 50 67 40 Z"
          fill="url(#bodyG)"
        />
        {/* 위팔 + 전완 (양쪽) — 토르소와 함께 회전 */}
        <path d="M28 40 Q26 60 28 78 L36 78 Q38 60 36 40 Z" fill="url(#limbG)" />
        <path d="M64 40 Q62 60 64 78 L72 78 Q74 60 72 40 Z" fill="url(#limbG)" />
        <path d="M28 78 Q26 90 28 96 L36 96 Q38 90 36 78 Z" fill="url(#bodyG)" />
        <path d="M64 78 Q62 90 64 96 L72 96 Q74 90 72 78 Z" fill="url(#bodyG)" />
        {/* 바벨 — 손 위치 */}
        <rect x="20" y="95" width="60" height="2.5" rx="1" fill="#a1a1aa" />
        <ellipse cx="22" cy="96" rx="4" ry="6" fill="url(#plateG)" />
        <ellipse cx="78" cy="96" rx="4" ry="6" fill="url(#plateG)" />
      </g>
    </g>
  );
}

/** CURL — 위팔 옆구리 고정, 전완이 팔꿈치 기준 회전. 이두 글로우. */
function CurlOverlay() {
  return (
    <g>
      <Legs />
      {/* 위팔 — 옆구리에 고정 */}
      <path d="M22 38 Q21 55 22 70 L30 70 Q31 55 30 38 Z" fill="url(#limbG)" />
      <path d="M70 38 Q69 55 70 70 L78 70 Q79 55 78 38 Z" fill="url(#limbG)" />
      {/* 이두 글로우 — 위팔 위에 겹침 */}
      <ellipse cx="26" cy="55" rx="4" ry="8" fill="url(#muscleG)" className="m-glow-fast" />
      <ellipse cx="74" cy="55" rx="4" ry="8" fill="url(#muscleG)" className="m-glow-fast" />
      {/* 전완 — 팔꿈치(y=70) 기준 회전 */}
      <g className="m-curl-l">
        <path d="M22 70 Q21 85 22 92 L30 92 Q31 85 30 70 Z" fill="url(#bodyG)" />
        <Dumbbell cx={26} cy={92} small />
      </g>
      <g className="m-curl-r">
        <path d="M70 70 Q69 85 70 92 L78 92 Q79 85 78 70 Z" fill="url(#bodyG)" />
        <Dumbbell cx={74} cy={92} small />
      </g>
    </g>
  );
}

/** EXTENSION — 위팔 고정, 전완이 반대 회전 (펴짐). 삼두 글로우. */
function ExtensionOverlay() {
  return (
    <g>
      <Legs />
      {/* 위팔 */}
      <path d="M22 38 Q21 55 22 70 L30 70 Q31 55 30 38 Z" fill="url(#limbG)" />
      <path d="M70 38 Q69 55 70 70 L78 70 Q79 55 78 38 Z" fill="url(#limbG)" />
      {/* 삼두 글로우 — 위팔 뒤쪽 (옆구리 안쪽으로 살짝) */}
      <ellipse cx="32" cy="55" rx="4" ry="8" fill="url(#muscleG)" className="m-glow-fast" />
      <ellipse cx="68" cy="55" rx="4" ry="8" fill="url(#muscleG)" className="m-glow-fast" />
      {/* 전완 — 팔꿈치 기준 회전 (반대 방향) */}
      <g className="m-ext-l">
        <path d="M22 70 Q21 85 22 92 L30 92 Q31 85 30 70 Z" fill="url(#bodyG)" />
      </g>
      <g className="m-ext-r">
        <path d="M70 70 Q69 85 70 92 L78 92 Q79 85 78 70 Z" fill="url(#bodyG)" />
      </g>
      {/* 케이블 — 머리 위에서 내려옴 (가이드) */}
      <line x1="50" y1="0" x2="50" y2="22" stroke="#71717a" strokeWidth="0.6" />
    </g>
  );
}

/** RAISE — 양팔이 어깨 기준으로 좌우로 회전. 측면 삼각근 글로우. */
function RaiseOverlay() {
  return (
    <g>
      <Legs />
      {/* 어깨 측면 글로우 */}
      <ellipse cx="30" cy="36" rx="6" ry="5" fill="url(#muscleG)" className="m-glow" />
      <ellipse cx="70" cy="36" rx="6" ry="5" fill="url(#muscleG)" className="m-glow" />
      {/* 왼팔 — 어깨 우측(x=30) 기준 회전 */}
      <g className="m-raise-l">
        <path d="M22 34 Q21 50 22 70 L30 70 Q31 50 30 34 Z" fill="url(#limbG)" />
        <path d="M22 70 Q21 85 22 92 L30 92 Q31 85 30 70 Z" fill="url(#bodyG)" />
        <Dumbbell cx={26} cy={92} small />
      </g>
      {/* 오른팔 */}
      <g className="m-raise-r">
        <path d="M70 34 Q69 50 70 70 L78 70 Q79 50 78 34 Z" fill="url(#limbG)" />
        <path d="M70 70 Q69 85 70 92 L78 92 Q79 85 78 70 Z" fill="url(#bodyG)" />
        <Dumbbell cx={74} cy={92} small />
      </g>
    </g>
  );
}

/** STATIC — 정적 자세. 몸 전체 미세 호흡 + 코어 글로우. */
function StaticOverlay() {
  return (
    <g className="m-breathe">
      <Legs />
      {/* 양팔 — 자연스럽게 옆에 */}
      <path d="M22 34 Q21 55 22 75 L30 75 Q31 55 30 34 Z" fill="url(#limbG)" />
      <path d="M70 34 Q69 55 70 75 L78 75 Q79 55 78 34 Z" fill="url(#limbG)" />
      <path d="M22 75 Q21 88 22 94 L30 94 Q31 88 30 75 Z" fill="url(#bodyG)" />
      <path d="M70 75 Q69 88 70 94 L78 94 Q79 88 78 75 Z" fill="url(#bodyG)" />
      {/* 코어 글로우 */}
      <ellipse cx="50" cy="62" rx="10" ry="8" fill="url(#muscleG)" className="m-glow-slow" />
    </g>
  );
}

/* ─── 기구 ─────────────────────────────────────────────────────── */

function Dumbbell({ cx, cy, small }: { cx: number; cy: number; small?: boolean }) {
  const w = small ? 8 : 12;
  const h = small ? 4 : 6;
  return (
    <g>
      {/* 그립 */}
      <rect
        x={cx - 1.2}
        y={cy - 1}
        width="2.4"
        height="2"
        fill="#71717a"
      />
      {/* 좌 플레이트 */}
      <rect
        x={cx - w / 2}
        y={cy - h / 2}
        width={w / 2 - 1.2}
        height={h}
        rx="1"
        fill="url(#dumbbellG)"
      />
      {/* 우 플레이트 */}
      <rect
        x={cx + 1.2}
        y={cy - h / 2}
        width={w / 2 - 1.2}
        height={h}
        rx="1"
        fill="url(#dumbbellG)"
      />
    </g>
  );
}
