"use client";

/**
 * 운동 동작 정면 일러스트 + 모션 애니메이션 (고품질 버전).
 *
 * 디자인:
 * - 좌→우 light 그라데이션으로 측면 라이팅 표현
 * - 근육 정의선(음각 stroke) 으로 해부학적 디테일
 * - 금속 그라데이션 + 하이라이트 광택 → 기구 메탈 느낌
 * - 바닥 ellipse 그림자 → 부유감 제거 + 입체감
 * - 활성 근육 emerald 글로우 (SVG filter blur 로 부드럽게)
 * - 다단계 키프레임 + cubic-bezier 자연 가속/감속 + 살짝 overshoot
 * - 모션 트레일(블러 잔상) 로 빠른 움직임 강조 (press/curl 등)
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
  "lat-pulldown": "pulldown",
  "pull-up": "pulldown",
  "chin-up": "pulldown",
  "wide-grip-pull-up": "pulldown",
  "straight-arm-pulldown": "pulldown",
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
  deadlift: "hinge",
  "sumo-deadlift": "hinge",
  rdl: "hinge",
  "stiff-leg-deadlift": "hinge",
  "good-morning": "hinge",
  hyperextension: "hinge",
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
  "triceps-pushdown": "extension",
  "skull-crusher": "extension",
  "overhead-triceps-extension": "extension",
  "triceps-kickback": "extension",
  "lateral-raise": "raise",
  "front-raise": "raise",
  "cable-lateral-raise": "raise",
  "upright-row": "raise",
  shrug: "raise",
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

export function MotionFigure({ category }: { category: MotionCategory }) {
  return (
    <svg
      viewBox="0 0 100 160"
      className="h-full w-full"
      role="img"
      aria-label="운동 동작 일러스트"
    >
      <defs>
        {/* 측면 라이팅 — 좌 어둡고 우 살짝 밝게 */}
        <linearGradient id="bodyG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1f1f23" />
          <stop offset="40%" stopColor="#3f3f46" />
          <stop offset="65%" stopColor="#52525b" />
          <stop offset="100%" stopColor="#2a2a30" />
        </linearGradient>
        {/* 사지 — 중앙 밝고 양 끝 어둡게 (둥근 입체감) */}
        <linearGradient id="limbG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2a2a30" />
          <stop offset="50%" stopColor="#5b5b62" />
          <stop offset="100%" stopColor="#2a2a30" />
        </linearGradient>
        {/* 머리 — 좌상단 광원 */}
        <radialGradient id="headG" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#7a7a83" />
          <stop offset="60%" stopColor="#4a4a52" />
          <stop offset="100%" stopColor="#2a2a30" />
        </radialGradient>
        {/* 활성 근육 글로우 */}
        <radialGradient id="muscleG" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#10b981" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
        {/* 바벨 플레이트 — 빨간 메탈 */}
        <radialGradient id="plateG" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="40%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
        {/* 바 메탈 — 위는 밝고 아래는 어둡게 */}
        <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f4f5" />
          <stop offset="30%" stopColor="#d4d4d8" />
          <stop offset="60%" stopColor="#71717a" />
          <stop offset="100%" stopColor="#3f3f46" />
        </linearGradient>
        {/* 덤벨 메탈 */}
        <linearGradient id="dumbbellG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e4e4e7" />
          <stop offset="50%" stopColor="#71717a" />
          <stop offset="100%" stopColor="#27272a" />
        </linearGradient>
        {/* 배경 — 살짝 비네팅 */}
        <radialGradient id="bgG" cx="50%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#0a0a0d" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.4" />
        </radialGradient>

        {/* 부드러운 글로우 필터 */}
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        {/* 모션 트레일 — 잔상용 강한 블러 */}
        <filter id="trail" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        {/* 드롭 그림자 */}
        <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
          <feOffset dx="0.5" dy="1.5" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.45" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <style>{`
          .m-press      { animation: pressArms 2.6s infinite; transform-box: fill-box; transform-origin: 50% 100%; }
          .m-press-bar  { animation: pressArms 2.6s infinite; transform-box: fill-box; transform-origin: 50% 50%; }
          .m-press-trail { animation: pressTrail 2.6s infinite; transform-box: fill-box; transform-origin: 50% 50%; }
          .m-row-fa     { animation: rowFa 2.2s infinite; transform-box: fill-box; transform-origin: 50% 0%; }
          .m-row-torso  { animation: rowTorso 2.2s infinite; transform-box: fill-box; transform-origin: 50% 100%; }
          .m-pull-body  { animation: pullBody 2.8s infinite; transform-box: fill-box; transform-origin: 50% 0%; }
          .m-squat      { animation: squat 2.8s infinite; transform-box: fill-box; transform-origin: 50% 0%; }
          .m-hinge      { animation: hinge 2.8s infinite; transform-box: fill-box; transform-origin: 50% 100%; }
          .m-curl-l     { animation: curlL 1.9s infinite; transform-box: fill-box; transform-origin: 50% 0%; }
          .m-curl-r     { animation: curlR 1.9s infinite; transform-box: fill-box; transform-origin: 50% 0%; }
          .m-ext-l      { animation: extL 1.9s infinite; transform-box: fill-box; transform-origin: 50% 0%; }
          .m-ext-r      { animation: extR 1.9s infinite; transform-box: fill-box; transform-origin: 50% 0%; }
          .m-raise-l    { animation: raiseL 2.4s infinite; transform-box: fill-box; transform-origin: 100% 0%; }
          .m-raise-r    { animation: raiseR 2.4s infinite; transform-box: fill-box; transform-origin: 0% 0%; }
          .m-breathe    { animation: breathe 3.6s infinite; transform-box: fill-box; transform-origin: 50% 50%; }
          .m-glow       { animation: glow 2.6s infinite; transform-origin: center; }
          .m-glow-fast  { animation: glow 1.9s infinite; transform-origin: center; }
          .m-glow-slow  { animation: glow 2.8s infinite; transform-origin: center; }
          .m-shadow     { animation: shadow 2.6s infinite; transform-box: fill-box; transform-origin: 50% 50%; }

          /* 다단계 키프레임 + 자연 가속/overshoot */
          @keyframes pressArms {
            0%   { transform: translateY(-2px); animation-timing-function: cubic-bezier(0.4,0,0.2,1); }
            45%  { transform: translateY(10px); animation-timing-function: cubic-bezier(0.4,0,0.2,1); }
            55%  { transform: translateY(10px); animation-timing-function: cubic-bezier(0.4,0,0.2,1); }
            85%  { transform: translateY(-3px); animation-timing-function: cubic-bezier(0.34,1.3,0.64,1); }
            100% { transform: translateY(-2px); }
          }
          @keyframes pressTrail {
            0%, 100% { opacity: 0; transform: translateY(-2px); }
            20%, 80% { opacity: 0.5; }
            50%      { opacity: 0; transform: translateY(10px); }
          }
          @keyframes rowFa {
            0%, 100% { transform: translateY(2px) scaleY(1); }
            45%, 55% { transform: translateY(-8px) scaleY(0.5); }
          }
          @keyframes rowTorso {
            0%, 100% { transform: rotate(8deg); }
            50%      { transform: rotate(2deg); }
          }
          @keyframes pullBody {
            0%, 100% { transform: translateY(8px); }
            50%      { transform: translateY(-2px); }
          }
          @keyframes squat {
            0%   { transform: translateY(0) scaleY(1); animation-timing-function: cubic-bezier(0.4,0,0.2,1); }
            45%  { transform: translateY(8px) scaleY(0.84); animation-timing-function: cubic-bezier(0.4,0,0.2,1); }
            55%  { transform: translateY(8px) scaleY(0.84); }
            85%  { transform: translateY(-1.5px) scaleY(1.03); animation-timing-function: cubic-bezier(0.34,1.3,0.64,1); }
            100% { transform: translateY(0) scaleY(1); }
          }
          @keyframes hinge {
            0%, 100% { transform: rotate(0deg); }
            50%      { transform: rotate(32deg); }
          }
          @keyframes curlL {
            0%, 100% { transform: rotate(0deg); }
            50%      { transform: rotate(-118deg); }
          }
          @keyframes curlR {
            0%, 100% { transform: rotate(0deg); }
            50%      { transform: rotate(118deg); }
          }
          @keyframes extL {
            0%, 100% { transform: rotate(-118deg); }
            50%      { transform: rotate(0deg); }
          }
          @keyframes extR {
            0%, 100% { transform: rotate(118deg); }
            50%      { transform: rotate(0deg); }
          }
          @keyframes raiseL {
            0%, 100% { transform: rotate(0deg); }
            50%      { transform: rotate(88deg); }
          }
          @keyframes raiseR {
            0%, 100% { transform: rotate(0deg); }
            50%      { transform: rotate(-88deg); }
          }
          @keyframes breathe {
            0%, 100% { transform: scale(1); }
            50%      { transform: scale(1.035); }
          }
          @keyframes glow {
            0%, 100% { opacity: 0.2; }
            50%      { opacity: 1; }
          }
          @keyframes shadow {
            0%, 100% { transform: scaleX(1); opacity: 0.55; }
            50%      { transform: scaleX(0.85); opacity: 0.35; }
          }
        `}</style>
      </defs>

      {/* 배경 비네팅 */}
      <rect x="0" y="0" width="100" height="160" fill="url(#bgG)" />

      {/* 바닥 그림자 */}
      <ellipse
        cx="50"
        cy="155"
        rx="22"
        ry="3"
        fill="black"
        opacity="0.55"
        className={category === "squat" ? "m-shadow" : undefined}
      />

      {/* 메인 일러스트 */}
      <g filter="url(#dropShadow)">
        <BodyBase />
        <CategoryOverlay category={category} />
      </g>
    </svg>
  );
}

/** 공통 인체 베이스 + 근육 정의선 */
function BodyBase() {
  return (
    <g>
      {/* 머리 */}
      <circle cx="50" cy="14" r="8.5" fill="url(#headG)" />
      {/* 머리 하이라이트 — 좌상단 광원 */}
      <ellipse cx="46" cy="11" rx="2.5" ry="2" fill="#9ca3af" opacity="0.4" />
      {/* 목 */}
      <path d="M46 21 L54 21 L52 27 L48 27 Z" fill="url(#bodyG)" />
      {/* 트라페즈 + 어깨선 */}
      <path
        d="M28 32 Q50 24 72 32 L67 41 Q50 36 33 41 Z"
        fill="url(#bodyG)"
      />
      {/* 토르소 — V 테이퍼 */}
      <path
        d="M33 40 Q34 50 36 75 L64 75 Q66 50 67 40 Z"
        fill="url(#bodyG)"
      />
      {/* 근육 정의선 — 가슴 분리 */}
      <path
        d="M50 40 Q50 50 50 60"
        stroke="#1a1a1f"
        strokeWidth="0.5"
        fill="none"
        opacity="0.7"
      />
      {/* 흉근 라인 */}
      <path
        d="M37 50 Q50 54 63 50"
        stroke="#1a1a1f"
        strokeWidth="0.5"
        fill="none"
        opacity="0.55"
      />
      {/* 복근 분할 */}
      <path d="M44 62 L56 62" stroke="#1a1a1f" strokeWidth="0.4" opacity="0.45" />
      <path d="M44 68 L56 68" stroke="#1a1a1f" strokeWidth="0.4" opacity="0.45" />
      {/* 토르소 우측 하이라이트 (라이팅) */}
      <path
        d="M63 42 Q65 55 64 73"
        stroke="#6b7280"
        strokeWidth="0.5"
        opacity="0.4"
        fill="none"
      />
      {/* 골반 */}
      <path
        d="M36 75 Q34 80 36 92 L64 92 Q66 80 64 75 Z"
        fill="url(#bodyG)"
      />
    </g>
  );
}

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

/* ─── 사지 베이스 ─────────────────────────────────────────── */

function Legs() {
  return (
    <g>
      {/* 허벅지 — V 곡선 */}
      <path
        d="M37 92 Q34 110 40 132 L46 132 Q47 110 46 92 Z"
        fill="url(#limbG)"
      />
      <path
        d="M54 92 Q53 110 54 132 L60 132 Q66 110 63 92 Z"
        fill="url(#limbG)"
      />
      {/* 대퇴 정의선 */}
      <path
        d="M42 100 Q40 116 43 130"
        stroke="#1a1a1f"
        strokeWidth="0.4"
        opacity="0.5"
        fill="none"
      />
      <path
        d="M58 100 Q60 116 57 130"
        stroke="#1a1a1f"
        strokeWidth="0.4"
        opacity="0.5"
        fill="none"
      />
      {/* 무릎 음영 */}
      <ellipse cx="43" cy="131" rx="3" ry="2" fill="#1a1a1f" opacity="0.4" />
      <ellipse cx="57" cy="131" rx="3" ry="2" fill="#1a1a1f" opacity="0.4" />
      {/* 종아리 */}
      <path d="M40 132 Q38 145 41 154 L46 154 Q47 145 46 132 Z" fill="url(#bodyG)" />
      <path d="M54 132 Q53 145 54 154 L59 154 Q62 145 60 132 Z" fill="url(#bodyG)" />
    </g>
  );
}

/* ─── 카테고리 오버레이 ────────────────────────────────────── */

function PressOverlay() {
  return (
    <g>
      <Legs />
      {/* 가슴 글로우 (블러 처리) */}
      <g filter="url(#softGlow)">
        <ellipse cx="50" cy="48" rx="13" ry="9" fill="url(#muscleG)" className="m-glow" />
      </g>
      {/* 모션 트레일 (위팔 잔상) */}
      <g filter="url(#trail)" className="m-press-trail">
        <path d="M32 24 Q30 32 32 42 L38 42 Q40 32 38 24 Z" fill="#10b981" opacity="0.4" />
        <path d="M62 24 Q60 32 62 42 L68 42 Q70 32 68 24 Z" fill="#10b981" opacity="0.4" />
      </g>
      {/* 양팔 */}
      <g className="m-press">
        {/* 위팔 (이두 곡선 양감) */}
        <path d="M32 24 Q28 32 32 42 L38 42 Q40 32 38 24 Z" fill="url(#limbG)" />
        <path d="M62 24 Q60 32 62 42 L68 42 Q72 32 68 24 Z" fill="url(#limbG)" />
        {/* 이두 정의선 */}
        <path d="M34 32 Q33 36 35 40" stroke="#1a1a1f" strokeWidth="0.3" fill="none" opacity="0.4" />
        <path d="M66 32 Q67 36 65 40" stroke="#1a1a1f" strokeWidth="0.3" fill="none" opacity="0.4" />
        {/* 전완 */}
        <path d="M32 12 Q31 18 32 24 L38 24 Q39 18 38 12 Z" fill="url(#bodyG)" />
        <path d="M62 12 Q61 18 62 24 L68 24 Q69 18 68 12 Z" fill="url(#bodyG)" />
      </g>
      {/* 바벨 */}
      <g className="m-press-bar">
        {/* 바 메탈 */}
        <rect x="20" y="9" width="60" height="2.2" rx="1" fill="url(#barG)" />
        {/* 바 하이라이트 */}
        <rect x="22" y="9.2" width="56" height="0.4" fill="#fafafa" opacity="0.7" />
        {/* 플레이트 좌 */}
        <ellipse cx="22" cy="10" rx="4.5" ry="6.5" fill="url(#plateG)" />
        {/* 플레이트 좌 하이라이트 */}
        <ellipse cx="20" cy="7.5" rx="1.3" ry="2" fill="#fda4af" opacity="0.7" />
        {/* 플레이트 우 */}
        <ellipse cx="78" cy="10" rx="4.5" ry="6.5" fill="url(#plateG)" />
        <ellipse cx="76" cy="7.5" rx="1.3" ry="2" fill="#fda4af" opacity="0.7" />
        {/* 그립 표시 */}
        <rect x="34" y="9.4" width="0.8" height="1.4" fill="#3f3f46" />
        <rect x="65" y="9.4" width="0.8" height="1.4" fill="#3f3f46" />
      </g>
    </g>
  );
}

function RowOverlay() {
  return (
    <g>
      <Legs />
      {/* 광배 글로우 (좌·우 측면) */}
      <g filter="url(#softGlow)">
        <ellipse cx="35" cy="55" rx="6" ry="10" fill="url(#muscleG)" className="m-glow" />
        <ellipse cx="65" cy="55" rx="6" ry="10" fill="url(#muscleG)" className="m-glow" />
      </g>
      {/* 위팔 */}
      <path d="M22 38 Q19 55 22 70 L30 70 Q33 55 30 38 Z" fill="url(#limbG)" />
      <path d="M70 38 Q67 55 70 70 L78 70 Q81 55 78 38 Z" fill="url(#limbG)" />
      {/* 전완 + 덤벨 (당김 모션) */}
      <g className="m-row-fa">
        <path d="M22 70 Q21 85 22 92 L30 92 Q31 85 30 70 Z" fill="url(#bodyG)" />
        <Dumbbell cx={26} cy={92} small />
      </g>
      <g className="m-row-fa">
        <path d="M70 70 Q69 85 70 92 L78 92 Q79 85 78 70 Z" fill="url(#bodyG)" />
        <Dumbbell cx={74} cy={92} small />
      </g>
    </g>
  );
}

function PulldownOverlay() {
  return (
    <g>
      <g className="m-pull-body">
        <Legs />
        {/* 광배 글로우 */}
        <g filter="url(#softGlow)">
          <ellipse cx="36" cy="55" rx="6" ry="10" fill="url(#muscleG)" className="m-glow" />
          <ellipse cx="64" cy="55" rx="6" ry="10" fill="url(#muscleG)" className="m-glow" />
        </g>
        {/* 위팔 — 위로 뻗음 */}
        <path d="M30 24 Q26 32 32 42 L38 42 Q42 32 38 24 Z" fill="url(#limbG)" />
        <path d="M62 24 Q58 32 68 42 L72 42 Q74 32 70 24 Z" fill="url(#limbG)" />
        {/* 전완 위로 */}
        <path d="M30 10 Q29 18 32 24 L38 24 Q39 18 38 10 Z" fill="url(#bodyG)" />
        <path d="M62 10 Q61 18 68 24 L72 24 Q71 18 70 10 Z" fill="url(#bodyG)" />
      </g>
      {/* 풀다운 바 (고정) */}
      <rect x="16" y="6" width="68" height="2.2" rx="1" fill="url(#barG)" />
      <rect x="18" y="6.2" width="64" height="0.4" fill="#fafafa" opacity="0.6" />
      {/* 케이블 */}
      <line x1="50" y1="0" x2="50" y2="6" stroke="#71717a" strokeWidth="0.8" />
    </g>
  );
}

function SquatOverlay() {
  return (
    <g className="m-squat">
      {/* 바벨 — 어깨에 얹힘 */}
      <rect x="20" y="29" width="60" height="2.2" rx="1" fill="url(#barG)" />
      <rect x="22" y="29.2" width="56" height="0.4" fill="#fafafa" opacity="0.6" />
      <ellipse cx="22" cy="30" rx="4.5" ry="6.5" fill="url(#plateG)" />
      <ellipse cx="20" cy="27.5" rx="1.3" ry="2" fill="#fda4af" opacity="0.7" />
      <ellipse cx="78" cy="30" rx="4.5" ry="6.5" fill="url(#plateG)" />
      <ellipse cx="76" cy="27.5" rx="1.3" ry="2" fill="#fda4af" opacity="0.7" />
      {/* 양팔 — 바 잡음 */}
      <path d="M22 34 Q19 50 22 64 L30 64 Q33 50 30 34 Z" fill="url(#limbG)" />
      <path d="M70 34 Q67 50 70 64 L78 64 Q81 50 78 34 Z" fill="url(#limbG)" />
      <path d="M22 64 Q21 75 22 78 L30 78 Q31 75 30 64 Z" fill="url(#bodyG)" />
      <path d="M70 64 Q69 75 70 78 L78 78 Q79 75 78 64 Z" fill="url(#bodyG)" />
      {/* 대퇴 글로우 */}
      <g filter="url(#softGlow)">
        <ellipse cx="41" cy="108" rx="6" ry="14" fill="url(#muscleG)" className="m-glow" />
        <ellipse cx="59" cy="108" rx="6" ry="14" fill="url(#muscleG)" className="m-glow" />
      </g>
      <Legs />
    </g>
  );
}

function HingeOverlay() {
  return (
    <g>
      <Legs />
      {/* 햄스트링 글로우 (다리 뒤편) */}
      <g filter="url(#softGlow)">
        <ellipse cx="41" cy="120" rx="5" ry="12" fill="url(#muscleG)" className="m-glow" />
        <ellipse cx="59" cy="120" rx="5" ry="12" fill="url(#muscleG)" className="m-glow" />
      </g>
      {/* 상체 + 팔이 함께 숙임 */}
      <g className="m-hinge">
        <path
          d="M33 40 Q34 50 36 75 L64 75 Q66 50 67 40 Z"
          fill="url(#bodyG)"
        />
        {/* 척추 정의선 */}
        <path d="M50 40 L50 75" stroke="#1a1a1f" strokeWidth="0.5" opacity="0.5" />
        {/* 위팔 + 전완 */}
        <path d="M28 40 Q24 60 28 78 L36 78 Q40 60 36 40 Z" fill="url(#limbG)" />
        <path d="M64 40 Q60 60 64 78 L72 78 Q76 60 72 40 Z" fill="url(#limbG)" />
        <path d="M28 78 Q26 90 28 96 L36 96 Q38 90 36 78 Z" fill="url(#bodyG)" />
        <path d="M64 78 Q62 90 64 96 L72 96 Q74 90 72 78 Z" fill="url(#bodyG)" />
        {/* 바벨 */}
        <rect x="20" y="95" width="60" height="2.5" rx="1" fill="url(#barG)" />
        <rect x="22" y="95.2" width="56" height="0.4" fill="#fafafa" opacity="0.6" />
        <ellipse cx="22" cy="96" rx="4.5" ry="6.5" fill="url(#plateG)" />
        <ellipse cx="20" cy="93.5" rx="1.3" ry="2" fill="#fda4af" opacity="0.7" />
        <ellipse cx="78" cy="96" rx="4.5" ry="6.5" fill="url(#plateG)" />
        <ellipse cx="76" cy="93.5" rx="1.3" ry="2" fill="#fda4af" opacity="0.7" />
      </g>
    </g>
  );
}

function CurlOverlay() {
  return (
    <g>
      <Legs />
      {/* 위팔 (고정) */}
      <path d="M22 38 Q19 55 22 70 L30 70 Q33 55 30 38 Z" fill="url(#limbG)" />
      <path d="M70 38 Q67 55 70 70 L78 70 Q81 55 78 38 Z" fill="url(#limbG)" />
      {/* 이두 정의선 */}
      <path d="M25 48 Q24 58 27 67" stroke="#1a1a1f" strokeWidth="0.4" fill="none" opacity="0.55" />
      <path d="M75 48 Q76 58 73 67" stroke="#1a1a1f" strokeWidth="0.4" fill="none" opacity="0.55" />
      {/* 이두 글로우 */}
      <g filter="url(#softGlow)">
        <ellipse cx="26" cy="55" rx="4.5" ry="9" fill="url(#muscleG)" className="m-glow-fast" />
        <ellipse cx="74" cy="55" rx="4.5" ry="9" fill="url(#muscleG)" className="m-glow-fast" />
      </g>
      {/* 전완 + 덤벨 (회전) */}
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

function ExtensionOverlay() {
  return (
    <g>
      <Legs />
      {/* 위팔 (고정, 살짝 올림) */}
      <path d="M22 38 Q19 55 22 70 L30 70 Q33 55 30 38 Z" fill="url(#limbG)" />
      <path d="M70 38 Q67 55 70 70 L78 70 Q81 55 78 38 Z" fill="url(#limbG)" />
      {/* 삼두 글로우 (위팔 아래쪽) */}
      <g filter="url(#softGlow)">
        <ellipse cx="30" cy="58" rx="4" ry="8" fill="url(#muscleG)" className="m-glow-fast" />
        <ellipse cx="70" cy="58" rx="4" ry="8" fill="url(#muscleG)" className="m-glow-fast" />
      </g>
      {/* 삼두 정의선 */}
      <path d="M29 50 Q31 60 29 68" stroke="#1a1a1f" strokeWidth="0.4" fill="none" opacity="0.55" />
      <path d="M71 50 Q69 60 71 68" stroke="#1a1a1f" strokeWidth="0.4" fill="none" opacity="0.55" />
      {/* 전완 (회전 — 펴짐) */}
      <g className="m-ext-l">
        <path d="M22 70 Q21 85 22 92 L30 92 Q31 85 30 70 Z" fill="url(#bodyG)" />
      </g>
      <g className="m-ext-r">
        <path d="M70 70 Q69 85 70 92 L78 92 Q79 85 78 70 Z" fill="url(#bodyG)" />
      </g>
      {/* 케이블 — 천장에서 */}
      <line x1="50" y1="0" x2="50" y2="22" stroke="#71717a" strokeWidth="0.7" />
      <circle cx="50" cy="22" r="1.6" fill="#71717a" />
    </g>
  );
}

function RaiseOverlay() {
  return (
    <g>
      <Legs />
      {/* 측면 삼각근 글로우 */}
      <g filter="url(#softGlow)">
        <ellipse cx="30" cy="36" rx="7" ry="6" fill="url(#muscleG)" className="m-glow" />
        <ellipse cx="70" cy="36" rx="7" ry="6" fill="url(#muscleG)" className="m-glow" />
      </g>
      {/* 왼팔 — 어깨 우측 끝 기준 회전 */}
      <g className="m-raise-l">
        <path d="M22 34 Q19 50 22 70 L30 70 Q33 50 30 34 Z" fill="url(#limbG)" />
        <path d="M22 70 Q21 85 22 92 L30 92 Q31 85 30 70 Z" fill="url(#bodyG)" />
        <Dumbbell cx={26} cy={92} small />
      </g>
      {/* 오른팔 */}
      <g className="m-raise-r">
        <path d="M70 34 Q67 50 70 70 L78 70 Q81 50 78 34 Z" fill="url(#limbG)" />
        <path d="M70 70 Q69 85 70 92 L78 92 Q79 85 78 70 Z" fill="url(#bodyG)" />
        <Dumbbell cx={74} cy={92} small />
      </g>
    </g>
  );
}

function StaticOverlay() {
  return (
    <g className="m-breathe">
      <Legs />
      {/* 팔 — 자연 자세 */}
      <path d="M22 34 Q19 55 22 75 L30 75 Q33 55 30 34 Z" fill="url(#limbG)" />
      <path d="M70 34 Q67 55 70 75 L78 75 Q81 55 78 34 Z" fill="url(#limbG)" />
      <path d="M22 75 Q21 88 22 94 L30 94 Q31 88 30 75 Z" fill="url(#bodyG)" />
      <path d="M70 75 Q69 88 70 94 L78 94 Q79 88 78 75 Z" fill="url(#bodyG)" />
      {/* 코어 글로우 */}
      <g filter="url(#softGlow)">
        <ellipse cx="50" cy="62" rx="11" ry="10" fill="url(#muscleG)" className="m-glow-slow" />
      </g>
    </g>
  );
}

/* ─── 기구 ─────────────────────────────────────────────────────── */

function Dumbbell({ cx, cy, small }: { cx: number; cy: number; small?: boolean }) {
  const w = small ? 9 : 12;
  const h = small ? 5 : 7;
  return (
    <g>
      {/* 그립 */}
      <rect x={cx - 1.4} y={cy - 1.1} width="2.8" height="2.2" fill="#52525b" />
      {/* 좌 플레이트 */}
      <rect
        x={cx - w / 2}
        y={cy - h / 2}
        width={w / 2 - 1.4}
        height={h}
        rx="1.2"
        fill="url(#dumbbellG)"
      />
      {/* 좌 플레이트 하이라이트 */}
      <rect
        x={cx - w / 2 + 0.3}
        y={cy - h / 2 + 0.6}
        width="0.6"
        height={h - 1.2}
        fill="#fafafa"
        opacity="0.6"
      />
      {/* 우 플레이트 */}
      <rect
        x={cx + 1.4}
        y={cy - h / 2}
        width={w / 2 - 1.4}
        height={h}
        rx="1.2"
        fill="url(#dumbbellG)"
      />
      <rect
        x={cx + w / 2 - 0.9}
        y={cy - h / 2 + 0.6}
        width="0.6"
        height={h - 1.2}
        fill="#fafafa"
        opacity="0.6"
      />
    </g>
  );
}
