"use client";

/**
 * 운동 종목 → 모션 카테고리 매핑 + 카테고리별 정면 stick-figure SVG 애니메이션.
 * 각 figure 는 viewBox 100×160 으로 통일 — exercise-cautions 의 좌표(% 기준) 와 정확히 일치.
 * 한 카테고리 안에서 가장 특징적인 동작 부위 1군이 CSS 키프레임으로 무한 반복.
 */

/** 모션 카테고리 — 동작 패턴 기준 */
export type MotionCategory =
  | "press" // 가슴 프레스 (누운/머리위) — 팔이 올라갔다 내려옴
  | "row" // 등 당김(벤트오버) — 팔이 몸 쪽으로 당겨짐
  | "pulldown" // 수직 풀 (풀업/랫풀다운) — 팔이 위에서 아래로
  | "squat" // 하체 — 몸 전체가 내려갔다 올라옴
  | "hinge" // 힌지(데드리프트) — 상체가 앞으로 숙여졌다 펴짐
  | "curl" // 이두 컬 — 전완 회전
  | "extension" // 삼두 — 전완 회전 (반대 방향)
  | "raise" // 측면/전면 레이즈 — 팔이 옆으로 벌어짐
  | "static"; // 플랭크 등 — 미세 호흡 펄스

const CATEGORY_MAP: Record<string, MotionCategory> = {
  // 프레스 (가슴/어깨)
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

  // 로우 (등 — 몸쪽 당김)
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

  // 풀다운 (수직)
  "lat-pulldown": "pulldown",
  "pull-up": "pulldown",
  "chin-up": "pulldown",
  "wide-grip-pull-up": "pulldown",
  "straight-arm-pulldown": "pulldown",

  // 하체 스쿼트 패턴
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

  // 익스텐션 (삼두)
  "triceps-pushdown": "extension",
  "skull-crusher": "extension",
  "overhead-triceps-extension": "extension",
  "triceps-kickback": "extension",

  // 레이즈 (측면/전면)
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

const STROKE = "#52525b"; // zinc-600
const FILL = "#27272a"; // zinc-800
const ACCENT = "#3f3f46"; // zinc-700 (움직이는 부위 강조)

/**
 * 카테고리별 정면 stick-figure SVG.
 * viewBox 0 0 100 160 — exercise-cautions 의 (x, y) % 좌표 와 1:1 매칭.
 * 동작 부위에 `.motion-*` 클래스 → SVG 내부 `<style>` 의 키프레임으로 애니메이션.
 */
export function MotionFigure({ category }: { category: MotionCategory }) {
  return (
    <svg
      viewBox="0 0 100 160"
      className="h-full w-full"
      role="img"
      aria-label="운동 동작 일러스트"
      fill={FILL}
      stroke={STROKE}
      strokeWidth="0.8"
    >
      <defs>
        <style>{`
          /* 모든 SVG 요소 transform 은 fill-box 기준 — 회전 중심을 정확히 잡기 위해. */
          .motion-press-arms { animation: pressArms 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
          .motion-row-arms   { animation: rowArms 2s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 0%; }
          .motion-pull-body  { animation: pullBody 2.5s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 0%; }
          .motion-squat      { animation: squatScale 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 0%; }
          .motion-hinge      { animation: hingeRot 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
          .motion-curl-fa    { animation: curlForearm 1.8s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 0%; }
          .motion-ext-fa     { animation: extForearm 1.8s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 0%; }
          .motion-raise-arm-l { animation: raiseLeft 2.2s ease-in-out infinite; transform-box: fill-box; transform-origin: 100% 0%; }
          .motion-raise-arm-r { animation: raiseRight 2.2s ease-in-out infinite; transform-box: fill-box; transform-origin: 0% 0%; }
          .motion-static     { animation: breathe 3s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 50%; }
          .motion-bar        { animation: pressArms 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 50%; }

          @keyframes pressArms   { 0%,100% { transform: translateY(0); }      50% { transform: translateY(8px); } }
          @keyframes rowArms     { 0%,100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-6px) scaleY(0.7); } }
          @keyframes pullBody    { 0%,100% { transform: translateY(8px); }     50% { transform: translateY(-2px); } }
          @keyframes squatScale  { 0%,100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(10px) scaleY(0.86); } }
          @keyframes hingeRot    { 0%,100% { transform: rotate(0deg); }        50% { transform: rotate(28deg); } }
          @keyframes curlForearm { 0%,100% { transform: rotate(0deg); }        50% { transform: rotate(-110deg); } }
          @keyframes extForearm  { 0%,100% { transform: rotate(-110deg); }     50% { transform: rotate(0deg); } }
          @keyframes raiseLeft   { 0%,100% { transform: rotate(0deg); }        50% { transform: rotate(80deg); } }
          @keyframes raiseRight  { 0%,100% { transform: rotate(0deg); }        50% { transform: rotate(-80deg); } }
          @keyframes breathe     { 0%,100% { transform: scale(1); }            50% { transform: scale(1.04); } }
        `}</style>
      </defs>

      {/* 머리 */}
      <circle cx="50" cy="14" r="9" />
      {/* 목 */}
      <rect x="46" y="22" width="8" height="5" />
      {/* 어깨선 */}
      <path d="M30 32 Q50 27 70 32 L66 42 Q50 38 34 42 Z" />
      {/* 상체 (힌지 시 회전) */}
      <g className={category === "hinge" ? "motion-hinge" : undefined}>
        <rect x="34" y="40" width="32" height="36" rx="3" />
      </g>

      {/* 골반 + 하체 — 스쿼트는 전체 스케일, 풀업은 전체 translateY */}
      <g
        className={
          category === "squat"
            ? "motion-squat"
            : category === "pulldown"
              ? "motion-pull-body"
              : undefined
        }
      >
        {/* 골반 */}
        <rect x="36" y="76" width="28" height="14" rx="3" />
        {/* 허벅지 */}
        <rect x="36" y="90" width="12" height="40" rx="3" />
        <rect x="52" y="90" width="12" height="40" rx="3" />
        {/* 종아리 */}
        <rect x="36" y="130" width="12" height="22" rx="3" fill={ACCENT} />
        <rect x="52" y="130" width="12" height="22" rx="3" fill={ACCENT} />
      </g>

      {/* 팔 — 카테고리별 다양한 애니메이션 */}
      <ArmsForCategory category={category} />

      {/* 프레스 카테고리: 머리 위 바벨도 함께 움직임 */}
      {category === "press" ? (
        <g className="motion-bar">
          <rect x="22" y="8" width="56" height="3" fill="#a1a1aa" />
          <rect x="20" y="5" width="6" height="9" rx="1" fill="#a1a1aa" />
          <rect x="74" y="5" width="6" height="9" rx="1" fill="#a1a1aa" />
        </g>
      ) : null}

      {/* 정적: 호흡 펄스 — 전체 figure 살짝 scale */}
      {category === "static" ? (
        <rect
          x="20"
          y="20"
          width="60"
          height="120"
          fill="none"
          stroke="none"
          className="motion-static"
        />
      ) : null}
    </svg>
  );
}

/** 카테고리별 팔 동작. 위치/회전 중심 등 SVG 좌표에 맞춰 세팅. */
function ArmsForCategory({ category }: { category: MotionCategory }) {
  // 기본 (정지) 팔
  if (
    category === "squat" ||
    category === "hinge" ||
    category === "static" ||
    category === "pulldown"
  ) {
    return (
      <>
        <rect x="22" y="34" width="8" height="40" rx="4" />
        <rect x="70" y="34" width="8" height="40" rx="4" />
        <rect x="22" y="72" width="8" height="22" rx="4" fill={ACCENT} />
        <rect x="70" y="72" width="8" height="22" rx="4" fill={ACCENT} />
      </>
    );
  }

  // 프레스 — 양팔 위로 뻗어 올라갔다 내려감
  if (category === "press") {
    return (
      <g className="motion-press-arms">
        {/* 위팔 (어깨에서 위로 뻗음) */}
        <rect x="32" y="18" width="6" height="22" rx="3" />
        <rect x="62" y="18" width="6" height="22" rx="3" />
        {/* 전완 (조금 더 위) */}
        <rect x="32" y="8" width="6" height="14" rx="3" fill={ACCENT} />
        <rect x="62" y="8" width="6" height="14" rx="3" fill={ACCENT} />
      </g>
    );
  }

  // 로우 — 팔이 양옆에 있고 몸 쪽으로 당김 (scale 로 표현)
  if (category === "row") {
    return (
      <>
        {/* 위팔 (옆구리 옆에 붙음) */}
        <rect x="22" y="38" width="8" height="32" rx="4" />
        <rect x="70" y="38" width="8" height="32" rx="4" />
        {/* 전완 — 몸 쪽으로 당김 (scale Y) */}
        <g className="motion-row-arms">
          <rect x="26" y="68" width="6" height="22" rx="3" fill={ACCENT} />
        </g>
        <g className="motion-row-arms">
          <rect x="68" y="68" width="6" height="22" rx="3" fill={ACCENT} />
        </g>
      </>
    );
  }

  // 컬 — 전완이 위로 회전
  if (category === "curl") {
    return (
      <>
        {/* 위팔 (옆구리에 고정) */}
        <rect x="22" y="38" width="8" height="32" rx="4" />
        <rect x="70" y="38" width="8" height="32" rx="4" />
        {/* 전완 — 팔꿈치 기준 회전 */}
        <g className="motion-curl-fa">
          <rect x="23" y="68" width="6" height="22" rx="3" fill={ACCENT} />
        </g>
        <g className="motion-curl-fa">
          <rect x="71" y="68" width="6" height="22" rx="3" fill={ACCENT} />
        </g>
      </>
    );
  }

  // 익스텐션 — 전완이 반대 방향
  if (category === "extension") {
    return (
      <>
        <rect x="22" y="38" width="8" height="32" rx="4" />
        <rect x="70" y="38" width="8" height="32" rx="4" />
        <g className="motion-ext-fa">
          <rect x="23" y="68" width="6" height="22" rx="3" fill={ACCENT} />
        </g>
        <g className="motion-ext-fa">
          <rect x="71" y="68" width="6" height="22" rx="3" fill={ACCENT} />
        </g>
      </>
    );
  }

  // 레이즈 — 팔이 옆으로 회전해서 들림
  if (category === "raise") {
    return (
      <>
        {/* 왼팔: 어깨 우측 끝 (x=30) 기준 회전 → 왼쪽으로 들림 */}
        <g className="motion-raise-arm-l">
          <rect x="22" y="34" width="8" height="40" rx="4" />
          <rect x="22" y="72" width="8" height="22" rx="4" fill={ACCENT} />
        </g>
        {/* 오른팔: 어깨 좌측 끝 (x=70) 기준 회전 → 오른쪽으로 들림 */}
        <g className="motion-raise-arm-r">
          <rect x="70" y="34" width="8" height="40" rx="4" />
          <rect x="70" y="72" width="8" height="22" rx="4" fill={ACCENT} />
        </g>
      </>
    );
  }

  return null;
}
