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

/** 공통 인체 베이스 — 머리·목·어깨·토르소·골반을 하나의 흐름으로. */
function BodyBase() {
  return (
    <g>
      {/* 머리 — 약간 세로로 긴 타원 (실제 두상 비율) */}
      <ellipse cx="50" cy="14" rx="7" ry="9" fill="url(#headG)" />
      {/* 머리카락 — 상단 어두운 캡 */}
      <path
        d="M43 10 Q43 6 50 6 Q57 6 57 10 Q57 14 50 13 Q43 14 43 10 Z"
        fill="#18181b"
      />
      {/* 머리카락 옆선 — 살짝 귀 위까지 */}
      <path d="M43 11 Q42 14 44 16" fill="none" stroke="#18181b" strokeWidth="0.6" />
      <path d="M57 11 Q58 14 56 16" fill="none" stroke="#18181b" strokeWidth="0.6" />
      {/* 머리 광원 하이라이트 */}
      <ellipse cx="46" cy="12" rx="2" ry="2.2" fill="#9ca3af" opacity="0.35" />
      {/* 턱 음영 — 살짝 어두운 라인 */}
      <path d="M44 18 Q50 22 56 18" stroke="#1a1a1f" strokeWidth="0.5" fill="none" opacity="0.4" />

      {/* 목 — 사다리꼴 부드럽게 */}
      <path d="M46 21 Q46 25 47 28 L53 28 Q54 25 54 21 Z" fill="url(#bodyG)" />
      {/* 쇄골 그림자 라인 */}
      <path d="M40 33 Q50 30 60 33" stroke="#1a1a1f" strokeWidth="0.4" fill="none" opacity="0.5" />

      {/* 트라페즈 + 어깨 캡 — 둥글게 부풀린 라인 (델토이드 살짝 보임) */}
      <path
        d="M28 33 Q34 27 42 28 Q50 27 58 28 Q66 27 72 33 Q70 38 67 42 Q60 38 50 38 Q40 38 33 42 Q30 38 28 33 Z"
        fill="url(#bodyG)"
      />

      {/* 토르소 — V 테이퍼 (어깨 넓고 허리 좁게), 곡선 흘러내림 */}
      <path
        d="M33 40 Q32 50 35 65 Q36 72 38 78 L62 78 Q64 72 65 65 Q68 50 67 40 Q60 38 50 38 Q40 38 33 40 Z"
        fill="url(#bodyG)"
      />

      {/* 가슴 분리 (중심선) */}
      <path d="M50 40 Q50 52 50 60" stroke="#1a1a1f" strokeWidth="0.5" fill="none" opacity="0.7" />
      {/* 흉근 좌·우 곡선 */}
      <path d="M38 48 Q44 54 50 54" stroke="#1a1a1f" strokeWidth="0.5" fill="none" opacity="0.6" />
      <path d="M50 54 Q56 54 62 48" stroke="#1a1a1f" strokeWidth="0.5" fill="none" opacity="0.6" />
      {/* 복근 가로 분할 (세 줄) */}
      <path d="M44 60 L56 60" stroke="#1a1a1f" strokeWidth="0.35" opacity="0.45" />
      <path d="M44 66 L56 66" stroke="#1a1a1f" strokeWidth="0.35" opacity="0.45" />
      <path d="M44 72 L56 72" stroke="#1a1a1f" strokeWidth="0.35" opacity="0.4" />
      {/* 복근 세로 분할 */}
      <path d="M50 56 L50 76" stroke="#1a1a1f" strokeWidth="0.3" opacity="0.4" />
      {/* 옆구리 V 자 라인 (오블리크) */}
      <path d="M37 68 Q42 75 48 78" stroke="#1a1a1f" strokeWidth="0.35" fill="none" opacity="0.4" />
      <path d="M63 68 Q58 75 52 78" stroke="#1a1a1f" strokeWidth="0.35" fill="none" opacity="0.4" />
      {/* 토르소 우측 라이팅 하이라이트 */}
      <path
        d="M63 42 Q65 55 64 75"
        stroke="#7c7c84"
        strokeWidth="0.5"
        opacity="0.4"
        fill="none"
      />

      {/* 골반 — 살짝 둥글게, 양옆이 좁아지지 않음 */}
      <path
        d="M38 78 Q34 84 36 94 Q42 96 50 96 Q58 96 64 94 Q66 84 62 78 Z"
        fill="url(#bodyG)"
      />
      {/* 골반 V 라인 — 옆구리 아래 */}
      <path d="M40 84 Q45 90 50 92" stroke="#1a1a1f" strokeWidth="0.35" fill="none" opacity="0.4" />
      <path d="M60 84 Q55 90 50 92" stroke="#1a1a1f" strokeWidth="0.35" fill="none" opacity="0.4" />
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
      {/* 좌 허벅지 — 둔근→대퇴 곡선, 안쪽이 더 가는 자연 V */}
      <path
        d="M38 95 Q35 105 36 118 Q37 126 41 130 L46 130 Q48 122 47 110 Q47 100 46 95 Z"
        fill="url(#limbG)"
      />
      {/* 우 허벅지 */}
      <path
        d="M54 95 Q53 100 53 110 Q52 122 54 130 L59 130 Q63 126 64 118 Q65 105 62 95 Z"
        fill="url(#limbG)"
      />
      {/* 대퇴 정의선 — 직근 곡선 */}
      <path d="M42 102 Q40 116 43 128" stroke="#1a1a1f" strokeWidth="0.4" opacity="0.55" fill="none" />
      <path d="M58 102 Q60 116 57 128" stroke="#1a1a1f" strokeWidth="0.4" opacity="0.55" fill="none" />
      {/* 대퇴 측면 하이라이트 */}
      <path d="M46 100 Q47 115 46 128" stroke="#7c7c84" strokeWidth="0.4" opacity="0.35" fill="none" />
      <path d="M54 100 Q53 115 54 128" stroke="#7c7c84" strokeWidth="0.4" opacity="0.35" fill="none" />

      {/* 무릎 — 둥글게 그늘 */}
      <ellipse cx="43.5" cy="131" rx="3.2" ry="2.4" fill="#1a1a1f" opacity="0.4" />
      <ellipse cx="56.5" cy="131" rx="3.2" ry="2.4" fill="#1a1a1f" opacity="0.4" />

      {/* 좌 종아리 — 비복근 살짝 부풀림 */}
      <path
        d="M40 132 Q37 140 38 148 Q39 152 42 152 L46 152 Q47 148 47 143 Q47 138 46 132 Z"
        fill="url(#bodyG)"
      />
      {/* 우 종아리 */}
      <path
        d="M54 132 Q53 138 53 143 Q53 148 54 152 L58 152 Q61 152 62 148 Q63 140 60 132 Z"
        fill="url(#bodyG)"
      />
      {/* 종아리 정의선 */}
      <path d="M41 138 Q40 145 42 150" stroke="#1a1a1f" strokeWidth="0.35" opacity="0.45" fill="none" />
      <path d="M59 138 Q60 145 58 150" stroke="#1a1a1f" strokeWidth="0.35" opacity="0.45" fill="none" />

      {/* 발/신발 — 옆에서 살짝 보이는 슈즈 */}
      <path
        d="M37 152 Q34 152 33 154 Q33 156 38 156 L48 156 Q48 153 46 152 Z"
        fill="#1f1f23"
      />
      <path
        d="M52 152 Q52 153 52 156 L62 156 Q67 156 67 154 Q66 152 63 152 Z"
        fill="#1f1f23"
      />
      {/* 신발 sole — 밝은 띠 */}
      <rect x="33" y="155.4" width="15" height="0.8" fill="#a1a1aa" opacity="0.5" />
      <rect x="52" y="155.4" width="15" height="0.8" fill="#a1a1aa" opacity="0.5" />
    </g>
  );
}

/** 손/주먹 — 사지 끝에 붙이는 작은 원형 디테일 */
function Hand({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {/* 손등/주먹 */}
      <ellipse cx={cx} cy={cy} rx="2.6" ry="3" fill="url(#limbG)" />
      {/* 손 그늘 */}
      <ellipse cx={cx + 0.6} cy={cy + 1} rx="1.2" ry="1.4" fill="#1a1a1f" opacity="0.35" />
    </g>
  );
}

/* ─── 카테고리 오버레이 ────────────────────────────────────── */

function PressOverlay() {
  return (
    <g>
      <Legs />
      {/* 가슴 글로우 */}
      <g filter="url(#softGlow)">
        <ellipse cx="50" cy="48" rx="13" ry="9" fill="url(#muscleG)" className="m-glow" />
      </g>
      {/* 모션 트레일 (위팔 잔상) */}
      <g filter="url(#trail)" className="m-press-trail">
        <path d="M32 26 Q27 34 32 42 L38 42 Q40 32 38 26 Z" fill="#10b981" opacity="0.35" />
        <path d="M62 26 Q60 32 62 42 L68 42 Q73 34 68 26 Z" fill="#10b981" opacity="0.35" />
      </g>
      {/* 양팔 — 위팔(이두 곡선) + 전완(테이퍼) + 주먹 */}
      <g className="m-press">
        {/* 좌 위팔 — 어깨에서 살짝 바깥쪽으로 부풀고 다시 좁아짐 (이두 양감) */}
        <path d="M30 25 Q26 32 30 42 L38 42 Q39 32 37 25 Q34 24 30 25 Z" fill="url(#limbG)" />
        {/* 우 위팔 */}
        <path d="M63 25 Q61 32 62 42 L70 42 Q74 32 70 25 Q66 24 63 25 Z" fill="url(#limbG)" />
        {/* 이두 정의선 */}
        <path d="M32 32 Q30 36 33 40" stroke="#1a1a1f" strokeWidth="0.35" fill="none" opacity="0.5" />
        <path d="M68 32 Q70 36 67 40" stroke="#1a1a1f" strokeWidth="0.35" fill="none" opacity="0.5" />
        {/* 좌 전완 — 손목으로 갈수록 좁아짐 */}
        <path d="M31 12 Q30 18 32 25 L37 25 Q38 18 37 12 Q34 11 31 12 Z" fill="url(#bodyG)" />
        {/* 우 전완 */}
        <path d="M63 12 Q62 18 63 25 L68 25 Q70 18 69 12 Q66 11 63 12 Z" fill="url(#bodyG)" />
        {/* 주먹 — 바를 잡음 */}
        <Hand cx={34} cy={11} />
        <Hand cx={66} cy={11} />
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
      {/* 광배 글로우 */}
      <g filter="url(#softGlow)">
        <ellipse cx="35" cy="55" rx="6" ry="10" fill="url(#muscleG)" className="m-glow" />
        <ellipse cx="65" cy="55" rx="6" ry="10" fill="url(#muscleG)" className="m-glow" />
      </g>
      {/* 좌 위팔 — 이두 곡선 */}
      <path d="M22 38 Q19 50 21 60 Q22 66 24 70 L30 70 Q33 60 32 50 Q31 42 28 38 Z" fill="url(#limbG)" />
      {/* 우 위팔 */}
      <path d="M70 38 Q72 42 71 50 Q70 60 70 70 L76 70 Q79 66 80 60 Q82 50 78 38 Z" fill="url(#limbG)" />
      {/* 좌 전완 + 손 + 덤벨 — 당김 모션 */}
      <g className="m-row-fa">
        <path d="M23 70 Q21 85 23 92 L30 92 Q31 85 30 70 Z" fill="url(#bodyG)" />
        <Hand cx={26.5} cy={92.5} />
        <Dumbbell cx={26.5} cy={92.5} small />
      </g>
      <g className="m-row-fa">
        <path d="M70 70 Q70 85 70 92 L77 92 Q79 85 77 70 Z" fill="url(#bodyG)" />
        <Hand cx={73.5} cy={92.5} />
        <Dumbbell cx={73.5} cy={92.5} small />
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
        {/* 좌 위팔 — 위로 뻗음, 살짝 V 자 */}
        <path d="M30 22 Q26 32 31 42 L38 42 Q42 32 38 22 Q34 21 30 22 Z" fill="url(#limbG)" />
        <path d="M62 22 Q58 32 62 42 L69 42 Q74 32 70 22 Q66 21 62 22 Z" fill="url(#limbG)" />
        {/* 좌 전완 위로 */}
        <path d="M30 10 Q29 16 31 22 L38 22 Q39 16 38 10 Q34 9 30 10 Z" fill="url(#bodyG)" />
        <path d="M62 10 Q61 16 62 22 L69 22 Q71 16 70 10 Q66 9 62 10 Z" fill="url(#bodyG)" />
        {/* 주먹 — 바 잡음 */}
        <Hand cx={34} cy={9} />
        <Hand cx={66} cy={9} />
      </g>
      {/* 풀다운 바 */}
      <rect x="16" y="5" width="68" height="2.2" rx="1" fill="url(#barG)" />
      <rect x="18" y="5.2" width="64" height="0.4" fill="#fafafa" opacity="0.6" />
      <line x1="50" y1="0" x2="50" y2="5" stroke="#71717a" strokeWidth="0.8" />
    </g>
  );
}

function SquatOverlay() {
  return (
    <g className="m-squat">
      {/* 바벨 — 어깨에 얹힘 */}
      <rect x="20" y="29" width="60" height="2.2" rx="1" fill="url(#barG)" />
      <rect x="22" y="29.2" width="56" height="0.4" fill="#fafafa" opacity="0.6" />
      <ellipse cx="22" cy="30" rx="4.8" ry="7" fill="url(#plateG)" />
      <ellipse cx="20" cy="27" rx="1.3" ry="2.2" fill="#fda4af" opacity="0.7" />
      <ellipse cx="78" cy="30" rx="4.8" ry="7" fill="url(#plateG)" />
      <ellipse cx="76" cy="27" rx="1.3" ry="2.2" fill="#fda4af" opacity="0.7" />
      {/* 좌 위팔 + 전완 + 주먹 — 바 잡음 */}
      <path d="M22 34 Q18 48 21 60 Q22 64 24 64 L30 64 Q32 60 32 50 Q33 38 28 34 Z" fill="url(#limbG)" />
      <path d="M70 34 Q72 38 73 50 Q72 60 70 64 L76 64 Q78 64 79 60 Q82 48 78 34 Z" fill="url(#limbG)" />
      <path d="M23 64 Q21 75 23 78 L30 78 Q31 75 30 64 Z" fill="url(#bodyG)" />
      <path d="M70 64 Q70 75 70 78 L77 78 Q79 75 77 64 Z" fill="url(#bodyG)" />
      <Hand cx={26.5} cy={32} />
      <Hand cx={73.5} cy={32} />
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
      {/* 햄스트링 글로우 */}
      <g filter="url(#softGlow)">
        <ellipse cx="41" cy="120" rx="5" ry="12" fill="url(#muscleG)" className="m-glow" />
        <ellipse cx="59" cy="120" rx="5" ry="12" fill="url(#muscleG)" className="m-glow" />
      </g>
      {/* 상체 + 팔이 함께 숙임 */}
      <g className="m-hinge">
        {/* 토르소 (회전 버전) */}
        <path
          d="M33 40 Q34 50 36 75 L64 75 Q66 50 67 40 Z"
          fill="url(#bodyG)"
        />
        {/* 척추 + 라티시무스 라인 */}
        <path d="M50 40 L50 75" stroke="#1a1a1f" strokeWidth="0.5" opacity="0.5" />
        <path d="M37 50 Q40 60 38 72" stroke="#1a1a1f" strokeWidth="0.4" fill="none" opacity="0.45" />
        <path d="M63 50 Q60 60 62 72" stroke="#1a1a1f" strokeWidth="0.4" fill="none" opacity="0.45" />
        {/* 좌 위팔 (덤벨 잡는 자세) */}
        <path d="M28 40 Q24 56 26 76 Q27 78 30 78 L36 78 Q38 76 38 60 Q39 48 35 40 Z" fill="url(#limbG)" />
        <path d="M62 40 Q61 48 62 60 Q62 76 64 78 L70 78 Q73 78 74 76 Q76 56 72 40 Z" fill="url(#limbG)" />
        {/* 전완 */}
        <path d="M27 78 Q26 90 28 96 L36 96 Q38 90 36 78 Z" fill="url(#bodyG)" />
        <path d="M64 78 Q62 90 64 96 L72 96 Q74 90 73 78 Z" fill="url(#bodyG)" />
        {/* 주먹 */}
        <Hand cx={32} cy={96.5} />
        <Hand cx={68} cy={96.5} />
        {/* 바벨 */}
        <rect x="20" y="95" width="60" height="2.5" rx="1" fill="url(#barG)" />
        <rect x="22" y="95.2" width="56" height="0.4" fill="#fafafa" opacity="0.6" />
        <ellipse cx="22" cy="96.2" rx="4.8" ry="7" fill="url(#plateG)" />
        <ellipse cx="20" cy="93.5" rx="1.3" ry="2.2" fill="#fda4af" opacity="0.7" />
        <ellipse cx="78" cy="96.2" rx="4.8" ry="7" fill="url(#plateG)" />
        <ellipse cx="76" cy="93.5" rx="1.3" ry="2.2" fill="#fda4af" opacity="0.7" />
      </g>
    </g>
  );
}

function CurlOverlay() {
  return (
    <g>
      <Legs />
      {/* 위팔 — 둥근 이두 부풀음 */}
      <path d="M22 38 Q18 50 21 60 Q22 66 24 70 L30 70 Q32 60 32 50 Q31 42 28 38 Z" fill="url(#limbG)" />
      <path d="M70 38 Q72 42 71 50 Q70 60 70 70 L76 70 Q79 66 80 60 Q82 50 78 38 Z" fill="url(#limbG)" />
      {/* 이두 정의선 */}
      <path d="M24 48 Q22 58 25 67" stroke="#1a1a1f" strokeWidth="0.4" fill="none" opacity="0.6" />
      <path d="M76 48 Q78 58 75 67" stroke="#1a1a1f" strokeWidth="0.4" fill="none" opacity="0.6" />
      {/* 이두 글로우 */}
      <g filter="url(#softGlow)">
        <ellipse cx="26" cy="55" rx="5" ry="9" fill="url(#muscleG)" className="m-glow-fast" />
        <ellipse cx="74" cy="55" rx="5" ry="9" fill="url(#muscleG)" className="m-glow-fast" />
      </g>
      {/* 전완 + 손 + 덤벨 (팔꿈치 기준 회전) */}
      <g className="m-curl-l">
        <path d="M23 70 Q22 84 23 92 L30 92 Q31 84 30 70 Z" fill="url(#bodyG)" />
        <Hand cx={26.5} cy={92.5} />
        <Dumbbell cx={26.5} cy={92.5} small />
      </g>
      <g className="m-curl-r">
        <path d="M70 70 Q70 84 70 92 L77 92 Q78 84 77 70 Z" fill="url(#bodyG)" />
        <Hand cx={73.5} cy={92.5} />
        <Dumbbell cx={73.5} cy={92.5} small />
      </g>
    </g>
  );
}

function ExtensionOverlay() {
  return (
    <g>
      <Legs />
      {/* 위팔 — 이두 곡선 */}
      <path d="M22 38 Q18 50 21 60 Q22 66 24 70 L30 70 Q32 60 32 50 Q31 42 28 38 Z" fill="url(#limbG)" />
      <path d="M70 38 Q72 42 71 50 Q70 60 70 70 L76 70 Q79 66 80 60 Q82 50 78 38 Z" fill="url(#limbG)" />
      {/* 삼두 글로우 (뒤편) */}
      <g filter="url(#softGlow)">
        <ellipse cx="30" cy="58" rx="4" ry="8" fill="url(#muscleG)" className="m-glow-fast" />
        <ellipse cx="70" cy="58" rx="4" ry="8" fill="url(#muscleG)" className="m-glow-fast" />
      </g>
      {/* 삼두 정의선 */}
      <path d="M29 50 Q31 60 29 68" stroke="#1a1a1f" strokeWidth="0.4" fill="none" opacity="0.55" />
      <path d="M71 50 Q69 60 71 68" stroke="#1a1a1f" strokeWidth="0.4" fill="none" opacity="0.55" />
      {/* 전완 + 손 (회전) */}
      <g className="m-ext-l">
        <path d="M23 70 Q22 84 23 92 L30 92 Q31 84 30 70 Z" fill="url(#bodyG)" />
        <Hand cx={26.5} cy={92.5} />
      </g>
      <g className="m-ext-r">
        <path d="M70 70 Q70 84 70 92 L77 92 Q78 84 77 70 Z" fill="url(#bodyG)" />
        <Hand cx={73.5} cy={92.5} />
      </g>
      {/* 케이블 — 천장에서 + 풀리 */}
      <line x1="50" y1="0" x2="50" y2="22" stroke="#71717a" strokeWidth="0.7" />
      <circle cx="50" cy="22" r="1.8" fill="#71717a" />
      <circle cx="50" cy="22" r="0.8" fill="#1f1f23" />
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
      {/* 왼팔 — 어깨에서 회전 */}
      <g className="m-raise-l">
        <path d="M22 34 Q18 48 21 60 Q22 66 24 70 L30 70 Q32 60 32 50 Q33 38 28 34 Z" fill="url(#limbG)" />
        <path d="M23 70 Q22 84 23 92 L30 92 Q31 84 30 70 Z" fill="url(#bodyG)" />
        <Hand cx={26.5} cy={92.5} />
        <Dumbbell cx={26.5} cy={92.5} small />
      </g>
      {/* 오른팔 */}
      <g className="m-raise-r">
        <path d="M70 34 Q72 38 73 50 Q72 60 70 70 L76 70 Q79 66 80 60 Q82 48 78 34 Z" fill="url(#limbG)" />
        <path d="M70 70 Q70 84 70 92 L77 92 Q78 84 77 70 Z" fill="url(#bodyG)" />
        <Hand cx={73.5} cy={92.5} />
        <Dumbbell cx={73.5} cy={92.5} small />
      </g>
    </g>
  );
}

function StaticOverlay() {
  return (
    <g className="m-breathe">
      <Legs />
      {/* 팔 — 자연 자세 + 손 */}
      <path d="M22 34 Q18 50 21 60 Q22 70 24 75 L30 75 Q32 65 32 50 Q33 38 28 34 Z" fill="url(#limbG)" />
      <path d="M70 34 Q72 38 73 50 Q72 65 70 75 L76 75 Q79 70 80 60 Q82 50 78 34 Z" fill="url(#limbG)" />
      <path d="M23 75 Q22 88 23 94 L30 94 Q31 88 30 75 Z" fill="url(#bodyG)" />
      <path d="M70 75 Q70 88 70 94 L77 94 Q78 88 77 75 Z" fill="url(#bodyG)" />
      <Hand cx={26.5} cy={94.5} />
      <Hand cx={73.5} cy={94.5} />
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
