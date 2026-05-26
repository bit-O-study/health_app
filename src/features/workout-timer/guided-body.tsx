"use client";

/**
 * 가이드 운동 오버레이용 정면 마네킹.
 * `active` 부위가 emerald 펄스로 빛나며, 그 외 부위는 어둡게 dim.
 * 본운동마다 자극 부위를 시각화한다.
 */

export type BodyHighlight =
  | "chest"
  | "back"
  | "shoulder"
  | "arm"
  | "leg"
  | "core";

const DIM_FILL = "#3f3f46"; // zinc-700
const DIM_STROKE = "#52525b"; // zinc-600
const OUTLINE_FILL = "#1f1f23"; // 더 어두운 회색
const ACTIVE_FILL = "#10b981"; // emerald-500
const ACTIVE_STROKE = "#34d399"; // emerald-400

export function GuidedBody({ active }: { active: BodyHighlight | null }) {
  const f = (p: BodyHighlight) => (p === active ? ACTIVE_FILL : DIM_FILL);
  const s = (p: BodyHighlight) =>
    p === active ? ACTIVE_STROKE : DIM_STROKE;
  const cls = (p: BodyHighlight) => (p === active ? "guided-pulse" : "");

  return (
    <svg
      viewBox="0 0 200 320"
      className="h-56 w-32 sm:h-64 sm:w-36"
      role="img"
      aria-label={active ? `${active} 자극` : "마네킹"}
    >
      <defs>
        {/* SVG 내부 CSS 로 펄스 애니메이션 — 색·glow 가 부드럽게 진동 */}
        <style>{`
          @keyframes guidedPulse {
            0%, 100% {
              filter: drop-shadow(0 0 4px ${ACTIVE_FILL}) drop-shadow(0 0 0 ${ACTIVE_FILL});
              opacity: 1;
            }
            50% {
              filter: drop-shadow(0 0 16px ${ACTIVE_FILL}) drop-shadow(0 0 8px ${ACTIVE_FILL});
              opacity: 0.92;
            }
          }
          .guided-pulse {
            animation: guidedPulse 1.4s ease-in-out infinite;
            transform-origin: center;
          }
        `}</style>
      </defs>

      {/* 윤곽 (몸 베이스) — 어두운 채움 */}
      <g stroke={DIM_STROKE} strokeWidth={1} fill={OUTLINE_FILL}>
        <circle cx="100" cy="32" r="20" />
        <rect x="94" y="50" width="12" height="14" />
        <rect x="76" y="60" width="48" height="80" rx="8" />
        <rect x="38" y="68" width="18" height="100" rx="9" />
        <rect x="144" y="68" width="18" height="100" rx="9" />
        <rect x="80" y="140" width="40" height="40" rx="6" />
        <rect x="80" y="178" width="18" height="120" rx="6" />
        <rect x="102" y="178" width="18" height="120" rx="6" />
      </g>

      {/* 어깨 */}
      <ellipse
        cx="58"
        cy="74"
        rx="18"
        ry="11"
        fill={f("shoulder")}
        stroke={s("shoulder")}
        className={cls("shoulder")}
      />
      <ellipse
        cx="142"
        cy="74"
        rx="18"
        ry="11"
        fill={f("shoulder")}
        stroke={s("shoulder")}
        className={cls("shoulder")}
      />

      {/* 가슴 */}
      <rect
        x="78"
        y="68"
        width="44"
        height="34"
        rx="6"
        fill={f("chest")}
        stroke={s("chest")}
        className={cls("chest")}
      />

      {/* 팔 (좌·우) */}
      <rect
        x="40"
        y="92"
        width="14"
        height="72"
        rx="7"
        fill={f("arm")}
        stroke={s("arm")}
        className={cls("arm")}
      />
      <rect
        x="146"
        y="92"
        width="14"
        height="72"
        rx="7"
        fill={f("arm")}
        stroke={s("arm")}
        className={cls("arm")}
      />

      {/* 코어 */}
      <rect
        x="82"
        y="106"
        width="36"
        height="40"
        rx="6"
        fill={f("core")}
        stroke={s("core")}
        className={cls("core")}
      />

      {/* 하체 (좌·우) */}
      <rect
        x="82"
        y="180"
        width="16"
        height="110"
        rx="6"
        fill={f("leg")}
        stroke={s("leg")}
        className={cls("leg")}
      />
      <rect
        x="102"
        y="180"
        width="16"
        height="110"
        rx="6"
        fill={f("leg")}
        stroke={s("leg")}
        className={cls("leg")}
      />

      {/* 등 — 정면에 표시 못해 하단 배지로 */}
      <rect
        x="78"
        y="296"
        width="44"
        height="14"
        rx="4"
        fill={f("back")}
        stroke={s("back")}
        className={cls("back")}
      />
      <text x="100" y="307" fontSize={10} textAnchor="middle" fill="#fafafa">
        등(뒤)
      </text>
    </svg>
  );
}

/**
 * 워밍업·마무리 종목 ID → 자극 부위 매핑. 본운동은 `primaryBodyPart` 사용.
 * 없으면 null → 마네킹 자체를 띄우지 않음 (아이콘만).
 */
export const CONDITIONING_TO_BODY: Record<string, BodyHighlight> = {
  // 워밍업/유산소
  running: "leg",
  "stair-master": "leg",
  cycling: "leg",
  rowing: "back",
  elliptical: "leg",
  "jump-rope": "leg",
  walking: "leg",
  "jumping-jack": "leg",
  // 모빌리티
  "shoulder-circle": "shoulder",
  "cat-cow": "back",
  "dead-hang": "back",
  "band-pull-apart": "shoulder",
  "wall-slide": "shoulder",
  "dynamic-lunge": "leg",
  "bw-squat": "leg",
  "hip-circle": "leg",
  "dead-bug": "core",
  "glute-bridge-warm": "leg",
  "wrist-circle": "arm",
  "push-up-warm": "chest",
  // 정적 스트레칭
  "chest-door-stretch": "chest",
  "shoulder-cross-stretch": "shoulder",
  "child-pose": "back",
  "cobra-stretch": "core",
  "lat-stretch": "back",
  "sleeper-stretch": "shoulder",
  "triceps-overhead-stretch": "arm",
  "biceps-door-stretch": "arm",
  "wrist-stretch": "arm",
  "hamstring-stretch": "leg",
  "pigeon-pose": "leg",
  "calf-stretch": "leg",
  "neck-stretch": "shoulder",
};
