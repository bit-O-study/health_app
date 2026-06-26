import type { ReactNode, SVGProps } from "react";

/**
 * 운동별 SVG 아이콘.
 *
 * lucide 의 일반 Dumbbell 대신 운동 동작·기구 모양이 드러나는 미니멀 라인 아트로
 * 한 운동에 하나씩 만든다. 32x32 viewBox / strokeWidth 1.6 / currentColor 통일.
 * 사이즈는 prop 으로 자유 조절, 색은 부모의`text-…` 로 제어.
 */

export type ExerciseIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  size?: number;
};

function Svg({
  size = 24,
  children,
  ...rest
}: ExerciseIconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ─── 헬퍼: 자주 쓰는 모티브 ─────────────────────────────────────────── */

/** 양 끝에 원판 달린 바벨 (수평) */
function HBar({
  y,
  x1 = 8,
  x2 = 24,
  plate = 2.4,
}: {
  y: number;
  x1?: number;
  x2?: number;
  plate?: number;
}) {
  return (
    <>
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <line x1={x1 - 0.5} y1={y - plate} x2={x1 - 0.5} y2={y + plate} />
      <line x1={x2 + 0.5} y1={y - plate} x2={x2 + 0.5} y2={y + plate} />
    </>
  );
}

/* ─── 가슴 ───────────────────────────────────────────────────────────── */

export function BenchPressIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* bench */}
      <rect x="5" y="19" width="22" height="3" rx="0.5" />
      <line x1="9" y1="22" x2="9" y2="27" />
      <line x1="23" y1="22" x2="23" y2="27" />
      {/* body lying */}
      <circle cx="7" cy="17" r="1.8" />
      <line x1="9" y1="17" x2="22" y2="17" />
      {/* arms up */}
      <line x1="14" y1="17" x2="14" y2="10" />
      <line x1="18" y1="17" x2="18" y2="10" />
      {/* bar + plates */}
      <line x1="10" y1="9.5" x2="22" y2="9.5" />
      <rect x="8.5" y="7" width="2" height="5" rx="0.5" />
      <rect x="21.5" y="7" width="2" height="5" rx="0.5" />
    </Svg>
  );
}

export function InclinePressIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* incline bench */}
      <path d="M5 24 L25 12" />
      <line x1="5" y1="24" x2="5" y2="27" />
      <line x1="25" y1="12" x2="27" y2="14" />
      {/* body */}
      <circle cx="22" cy="11" r="1.6" />
      <line x1="20" y1="13" x2="8" y2="22" />
      {/* arms + bar */}
      <line x1="14" y1="17" x2="14" y2="9" />
      <line x1="18" y1="14" x2="18" y2="6" />
      <line x1="12" y1="7" x2="20" y2="7" />
      <rect x="10.5" y="5" width="2" height="4" rx="0.4" />
      <rect x="19.5" y="5" width="2" height="4" rx="0.4" />
    </Svg>
  );
}

export function DeclinePressIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* decline bench */}
      <path d="M5 12 L25 24" />
      <line x1="5" y1="12" x2="5" y2="14" />
      <line x1="25" y1="24" x2="25" y2="27" />
      {/* body */}
      <circle cx="7" cy="13" r="1.6" />
      <line x1="9" y1="15" x2="22" y2="22" />
      {/* arms up + bar */}
      <line x1="14" y1="18" x2="14" y2="10" />
      <line x1="18" y1="20" x2="18" y2="12" />
      <line x1="11" y1="9" x2="21" y2="9" />
      <rect x="9.5" y="7" width="2" height="4" rx="0.4" />
      <rect x="20.5" y="7" width="2" height="4" rx="0.4" />
    </Svg>
  );
}

export function ChestFlyIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* bench */}
      <rect x="6" y="19" width="20" height="3" rx="0.5" />
      <line x1="9" y1="22" x2="9" y2="27" />
      <line x1="23" y1="22" x2="23" y2="27" />
      {/* body */}
      <circle cx="8" cy="17" r="1.6" />
      <line x1="10" y1="17" x2="22" y2="17" />
      {/* arms out + dumbbells */}
      <line x1="14" y1="17" x2="6" y2="11" />
      <line x1="18" y1="17" x2="26" y2="11" />
      <rect x="3.5" y="9" width="4" height="3" rx="0.5" />
      <rect x="24.5" y="9" width="4" height="3" rx="0.5" />
    </Svg>
  );
}

export function PecDeckIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* seat */}
      <rect x="13" y="22" width="6" height="3" rx="0.5" />
      <line x1="14" y1="25" x2="14" y2="28" />
      <line x1="18" y1="25" x2="18" y2="28" />
      {/* back support */}
      <line x1="16" y1="22" x2="16" y2="12" />
      {/* head */}
      <circle cx="16" cy="10" r="1.8" />
      {/* arms forward (pad arms) */}
      <line x1="16" y1="13" x2="9" y2="13" />
      <line x1="16" y1="13" x2="23" y2="13" />
      {/* pad arms hinge */}
      <line x1="9" y1="10" x2="9" y2="16" />
      <line x1="23" y1="10" x2="23" y2="16" />
    </Svg>
  );
}

export function CableCrossoverIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* two top pulleys */}
      <circle cx="5" cy="6" r="1.5" />
      <circle cx="27" cy="6" r="1.5" />
      {/* cables crossing */}
      <line x1="5" y1="7" x2="20" y2="18" />
      <line x1="27" y1="7" x2="12" y2="18" />
      {/* person standing */}
      <circle cx="16" cy="11" r="1.8" />
      <line x1="16" y1="13" x2="16" y2="22" />
      <line x1="16" y1="22" x2="13" y2="28" />
      <line x1="16" y1="22" x2="19" y2="28" />
    </Svg>
  );
}

export function PushUpIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* floor */}
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* body diagonal */}
      <line x1="6" y1="19" x2="26" y2="14" />
      <circle cx="27" cy="13" r="1.8" />
      {/* arms supporting */}
      <line x1="10" y1="19" x2="10" y2="27" />
      {/* legs */}
      <line x1="6" y1="19" x2="3" y2="27" />
    </Svg>
  );
}

export function DipsIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* parallel bars */}
      <line x1="5" y1="10" x2="11" y2="10" />
      <line x1="21" y1="10" x2="27" y2="10" />
      <line x1="8" y1="10" x2="8" y2="27" />
      <line x1="24" y1="10" x2="24" y2="27" />
      {/* person hanging between */}
      <circle cx="16" cy="8" r="1.8" />
      <line x1="16" y1="10" x2="16" y2="20" />
      {/* legs bent */}
      <path d="M16 20 L13 24 L15 27" />
      <path d="M16 20 L19 24 L17 27" />
      {/* arms supporting on bars */}
      <line x1="16" y1="11" x2="11" y2="10" />
      <line x1="16" y1="11" x2="21" y2="10" />
    </Svg>
  );
}

export function CloseGripBenchIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* bench */}
      <rect x="5" y="19" width="22" height="3" rx="0.5" />
      <line x1="9" y1="22" x2="9" y2="27" />
      <line x1="23" y1="22" x2="23" y2="27" />
      {/* body lying */}
      <circle cx="7" cy="17" r="1.8" />
      <line x1="9" y1="17" x2="22" y2="17" />
      {/* arms close together */}
      <line x1="15" y1="17" x2="15" y2="10" />
      <line x1="17" y1="17" x2="17" y2="10" />
      {/* short bar */}
      <line x1="13" y1="9.5" x2="19" y2="9.5" />
      <rect x="11.5" y="7" width="2" height="5" rx="0.5" />
      <rect x="18.5" y="7" width="2" height="5" rx="0.5" />
    </Svg>
  );
}

/* ─── 등 ────────────────────────────────────────────────────────────── */

export function DeadliftIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* floor */}
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* bar on floor with plates */}
      <line x1="6" y1="24" x2="26" y2="24" />
      <circle cx="6" cy="24" r="3" />
      <circle cx="26" cy="24" r="3" />
      {/* person bent forward */}
      <circle cx="16" cy="8" r="1.8" />
      <line x1="16" y1="10" x2="16" y2="18" />
      <line x1="16" y1="18" x2="13" y2="24" />
      <line x1="16" y1="18" x2="19" y2="24" />
      {/* arms */}
      <line x1="16" y1="12" x2="11" y2="22" />
      <line x1="16" y1="12" x2="21" y2="22" />
    </Svg>
  );
}

export function BarbellRowIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* hinged body */}
      <circle cx="6" cy="10" r="1.8" />
      <line x1="7" y1="11" x2="20" y2="16" />
      {/* legs bent */}
      <line x1="20" y1="16" x2="19" y2="22" />
      <line x1="20" y1="16" x2="24" y2="22" />
      <line x1="19" y1="22" x2="19" y2="27" />
      <line x1="24" y1="22" x2="24" y2="27" />
      {/* arms pulling bar */}
      <line x1="12" y1="13" x2="12" y2="20" />
      <line x1="16" y1="14.5" x2="16" y2="20" />
      <HBar y={20} x1={10} x2={18} plate={2} />
    </Svg>
  );
}

export function TBarRowIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* anchored bar */}
      <circle cx="27" cy="27" r="1.2" />
      <line x1="27" y1="27" x2="9" y2="18" />
      {/* plates near user */}
      <line x1="9" y1="14" x2="9" y2="22" />
      <line x1="11" y1="15" x2="11" y2="21" />
      {/* handles */}
      <line x1="6" y1="18" x2="12" y2="18" />
      {/* bent person */}
      <circle cx="14" cy="8" r="1.8" />
      <line x1="15" y1="10" x2="18" y2="18" />
      {/* legs */}
      <line x1="18" y1="18" x2="16" y2="27" />
      <line x1="18" y1="18" x2="22" y2="27" />
    </Svg>
  );
}

export function SeatedCableRowIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* seat */}
      <rect x="14" y="20" width="10" height="2" rx="0.5" />
      {/* foot plate */}
      <line x1="3" y1="22" x2="9" y2="22" />
      {/* person seated */}
      <circle cx="20" cy="11" r="1.8" />
      <line x1="20" y1="13" x2="20" y2="20" />
      <line x1="20" y1="20" x2="8" y2="22" />
      {/* arms pulling */}
      <line x1="20" y1="14" x2="14" y2="16" />
      {/* handle + cable */}
      <line x1="14" y1="16" x2="4" y2="12" />
      <circle cx="3" cy="11" r="1.2" />
    </Svg>
  );
}

export function OneArmDumbbellRowIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* bench */}
      <rect x="14" y="17" width="14" height="2.5" rx="0.5" />
      <line x1="16" y1="19.5" x2="16" y2="27" />
      <line x1="26" y1="19.5" x2="26" y2="27" />
      {/* person leaning, one knee on bench */}
      <circle cx="11" cy="11" r="1.8" />
      <line x1="12" y1="12" x2="20" y2="16" />
      {/* support arm */}
      <line x1="20" y1="16" x2="22" y2="17" />
      {/* free arm with dumbbell */}
      <line x1="14" y1="13" x2="9" y2="20" />
      <rect x="6" y="19" width="4" height="3" rx="0.5" />
      {/* legs */}
      <line x1="20" y1="16" x2="22" y2="27" />
      <line x1="20" y1="16" x2="13" y2="27" />
    </Svg>
  );
}

export function LatPulldownIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* top pulley */}
      <circle cx="16" cy="4" r="1.5" />
      {/* cables */}
      <line x1="16" y1="5" x2="10" y2="9" />
      <line x1="16" y1="5" x2="22" y2="9" />
      {/* bar */}
      <line x1="8" y1="9" x2="24" y2="9" />
      {/* seat */}
      <rect x="13" y="22" width="6" height="2.5" rx="0.5" />
      <line x1="14" y1="24.5" x2="14" y2="27" />
      <line x1="18" y1="24.5" x2="18" y2="27" />
      {/* knee pad */}
      <line x1="11" y1="18" x2="21" y2="18" />
      {/* person */}
      <circle cx="16" cy="13" r="1.8" />
      <line x1="16" y1="15" x2="16" y2="22" />
      {/* arms reaching up to bar */}
      <line x1="16" y1="15" x2="10" y2="9.5" />
      <line x1="16" y1="15" x2="22" y2="9.5" />
    </Svg>
  );
}

export function PullUpIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* bar */}
      <line x1="4" y1="5" x2="28" y2="5" />
      <line x1="5" y1="3" x2="5" y2="7" />
      <line x1="27" y1="3" x2="27" y2="7" />
      {/* hands gripping bar */}
      <line x1="11" y1="5" x2="11" y2="8" />
      <line x1="21" y1="5" x2="21" y2="8" />
      {/* arms */}
      <line x1="11" y1="8" x2="14" y2="13" />
      <line x1="21" y1="8" x2="18" y2="13" />
      {/* head + body */}
      <circle cx="16" cy="11" r="1.8" />
      <line x1="16" y1="13" x2="16" y2="22" />
      {/* legs bent */}
      <path d="M16 22 L12 27" />
      <path d="M16 22 L20 27" />
    </Svg>
  );
}

export function ChinUpIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* bar */}
      <line x1="4" y1="5" x2="28" y2="5" />
      <line x1="5" y1="3" x2="5" y2="7" />
      <line x1="27" y1="3" x2="27" y2="7" />
      {/* underhand grip — narrower */}
      <line x1="13" y1="5" x2="13" y2="8" />
      <line x1="19" y1="5" x2="19" y2="8" />
      <line x1="13" y1="8" x2="15" y2="12" />
      <line x1="19" y1="8" x2="17" y2="12" />
      {/* head + body */}
      <circle cx="16" cy="10" r="1.8" />
      <line x1="16" y1="12" x2="16" y2="22" />
      <path d="M16 22 L12 27" />
      <path d="M16 22 L20 27" />
    </Svg>
  );
}

export function StraightArmPulldownIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="4" r="1.4" />
      <line x1="16" y1="5" x2="16" y2="14" />
      {/* straight bar */}
      <line x1="11" y1="14" x2="21" y2="14" />
      {/* person, slight bend */}
      <circle cx="9" cy="11" r="1.8" />
      <line x1="10" y1="13" x2="14" y2="20" />
      {/* arms straight to bar */}
      <line x1="11" y1="14" x2="13" y2="14" />
      <line x1="13" y1="14" x2="15" y2="14" />
      {/* legs */}
      <line x1="14" y1="20" x2="12" y2="27" />
      <line x1="14" y1="20" x2="18" y2="27" />
    </Svg>
  );
}

export function ShrugIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* person */}
      <circle cx="16" cy="6" r="1.8" />
      {/* shrugged shoulders (up arrows on each side) */}
      <line x1="11" y1="10" x2="21" y2="10" />
      <path d="M9 12 L11 10 L13 12" />
      <path d="M19 12 L21 10 L23 12" />
      {/* body */}
      <line x1="16" y1="8" x2="16" y2="20" />
      {/* arms hanging with dumbbells */}
      <line x1="11" y1="10" x2="11" y2="20" />
      <line x1="21" y1="10" x2="21" y2="20" />
      <rect x="9" y="20" width="4" height="3" rx="0.5" />
      <rect x="19" y="20" width="4" height="3" rx="0.5" />
      {/* legs */}
      <line x1="16" y1="20" x2="13" y2="27" />
      <line x1="16" y1="20" x2="19" y2="27" />
    </Svg>
  );
}

export function HyperextensionIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* angled bench */}
      <path d="M6 24 L18 12" />
      <line x1="6" y1="24" x2="6" y2="27" />
      <line x1="18" y1="12" x2="22" y2="14" />
      {/* foot anchor */}
      <line x1="22" y1="13" x2="26" y2="17" />
      <line x1="24" y1="11" x2="28" y2="15" />
      {/* body extended */}
      <circle cx="6" cy="10" r="1.8" />
      <line x1="7" y1="12" x2="20" y2="18" />
    </Svg>
  );
}

/* ─── 어깨 ──────────────────────────────────────────────────────────── */

export function OhpIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* head */}
      <circle cx="16" cy="11" r="1.8" />
      {/* body */}
      <line x1="16" y1="13" x2="16" y2="22" />
      {/* legs */}
      <line x1="16" y1="22" x2="13" y2="27" />
      <line x1="16" y1="22" x2="19" y2="27" />
      {/* arms overhead */}
      <line x1="13" y1="13" x2="13" y2="7" />
      <line x1="19" y1="13" x2="19" y2="7" />
      {/* bar with plates */}
      <line x1="9" y1="6.5" x2="23" y2="6.5" />
      <rect x="7.5" y="4" width="2" height="5" rx="0.4" />
      <rect x="22.5" y="4" width="2" height="5" rx="0.4" />
    </Svg>
  );
}

export function ArnoldPressIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="11" r="1.8" />
      <line x1="16" y1="13" x2="16" y2="22" />
      <line x1="16" y1="22" x2="13" y2="27" />
      <line x1="16" y1="22" x2="19" y2="27" />
      {/* arms rotating — curved */}
      <path d="M14 13 Q9 11 9 7" />
      <path d="M18 13 Q23 11 23 7" />
      {/* dumbbells */}
      <rect x="7" y="5" width="4" height="3" rx="0.5" />
      <rect x="21" y="5" width="4" height="3" rx="0.5" />
    </Svg>
  );
}

export function LateralRaiseIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="9" r="1.8" />
      <line x1="16" y1="11" x2="16" y2="22" />
      <line x1="16" y1="22" x2="13" y2="27" />
      <line x1="16" y1="22" x2="19" y2="27" />
      {/* arms straight out (T-pose) */}
      <line x1="16" y1="13" x2="5" y2="13" />
      <line x1="16" y1="13" x2="27" y2="13" />
      {/* dumbbells */}
      <rect x="2.5" y="11" width="4" height="4" rx="0.5" />
      <rect x="25.5" y="11" width="4" height="4" rx="0.5" />
    </Svg>
  );
}

export function FrontRaiseIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* side view */}
      <circle cx="13" cy="9" r="1.8" />
      <line x1="13" y1="11" x2="13" y2="22" />
      <line x1="13" y1="22" x2="10" y2="27" />
      <line x1="13" y1="22" x2="16" y2="27" />
      {/* arm raised forward */}
      <line x1="13" y1="13" x2="26" y2="13" />
      <rect x="25" y="11" width="4" height="4" rx="0.5" />
    </Svg>
  );
}

export function RearDeltFlyIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* bent over body */}
      <circle cx="16" cy="6" r="1.8" />
      <line x1="16" y1="8" x2="16" y2="16" />
      {/* arms wide (back view, bent) */}
      <line x1="16" y1="13" x2="6" y2="20" />
      <line x1="16" y1="13" x2="26" y2="20" />
      <rect x="3" y="19" width="4" height="3" rx="0.5" />
      <rect x="25" y="19" width="4" height="3" rx="0.5" />
      {/* legs */}
      <line x1="16" y1="16" x2="13" y2="27" />
      <line x1="16" y1="16" x2="19" y2="27" />
    </Svg>
  );
}

export function UprightRowIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="6" r="1.8" />
      <line x1="16" y1="8" x2="16" y2="20" />
      <line x1="16" y1="20" x2="13" y2="27" />
      <line x1="16" y1="20" x2="19" y2="27" />
      {/* arms pulled up with elbows out */}
      <path d="M16 11 L11 9 L11 13" />
      <path d="M16 11 L21 9 L21 13" />
      {/* bar */}
      <line x1="11" y1="13" x2="21" y2="13" />
      <rect x="9.5" y="11" width="2" height="4" rx="0.4" />
      <rect x="20.5" y="11" width="2" height="4" rx="0.4" />
    </Svg>
  );
}

export function FacePullIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* high pulley */}
      <circle cx="3" cy="6" r="1.4" />
      <line x1="3" y1="7" x2="15" y2="12" />
      {/* split rope */}
      <line x1="15" y1="12" x2="20" y2="9" />
      <line x1="15" y1="12" x2="20" y2="13" />
      {/* person */}
      <circle cx="23" cy="11" r="1.8" />
      <line x1="23" y1="13" x2="23" y2="22" />
      <line x1="23" y1="22" x2="20" y2="27" />
      <line x1="23" y1="22" x2="26" y2="27" />
      {/* arms pulling to face */}
      <line x1="20" y1="9" x2="22" y2="11" />
      <line x1="20" y1="13" x2="22" y2="11" />
    </Svg>
  );
}

/* ─── 팔 (이두) ──────────────────────────────────────────────────────── */

export function BicepsCurlIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="7" r="1.8" />
      <line x1="16" y1="9" x2="16" y2="20" />
      <line x1="16" y1="20" x2="13" y2="27" />
      <line x1="16" y1="20" x2="19" y2="27" />
      {/* curled arm with dumbbell up */}
      <line x1="16" y1="11" x2="12" y2="16" />
      <line x1="12" y1="16" x2="14" y2="11" />
      <rect x="12" y="8" width="4" height="3" rx="0.5" />
      {/* opposite arm hanging */}
      <line x1="16" y1="11" x2="20" y2="20" />
    </Svg>
  );
}

export function HammerCurlIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="7" r="1.8" />
      <line x1="16" y1="9" x2="16" y2="20" />
      <line x1="16" y1="20" x2="13" y2="27" />
      <line x1="16" y1="20" x2="19" y2="27" />
      {/* both arms curled, dumbbells held vertically (hammer grip) */}
      <line x1="16" y1="11" x2="11" y2="16" />
      <line x1="11" y1="16" x2="11" y2="11" />
      <rect x="9.5" y="8" width="3" height="4" rx="0.5" />
      <line x1="16" y1="11" x2="21" y2="16" />
      <line x1="21" y1="16" x2="21" y2="11" />
      <rect x="19.5" y="8" width="3" height="4" rx="0.5" />
    </Svg>
  );
}

export function PreacherCurlIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* preacher bench pad — angled */}
      <path d="M6 22 L20 14" />
      <line x1="6" y1="22" x2="6" y2="27" />
      <line x1="20" y1="14" x2="20" y2="22" />
      <line x1="20" y1="22" x2="26" y2="27" />
      {/* person seated behind */}
      <circle cx="22" cy="10" r="1.8" />
      <line x1="22" y1="12" x2="22" y2="22" />
      {/* arms over pad */}
      <line x1="22" y1="14" x2="14" y2="18" />
      <line x1="14" y1="18" x2="10" y2="12" />
      {/* bar curled up */}
      <line x1="7" y1="11" x2="13" y2="11" />
      <rect x="5.5" y="9" width="2" height="4" rx="0.4" />
      <rect x="12.5" y="9" width="2" height="4" rx="0.4" />
    </Svg>
  );
}

export function EzBarCurlIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="6" r="1.8" />
      <line x1="16" y1="8" x2="16" y2="20" />
      <line x1="16" y1="20" x2="13" y2="27" />
      <line x1="16" y1="20" x2="19" y2="27" />
      {/* arms curled */}
      <line x1="16" y1="11" x2="13" y2="15" />
      <line x1="16" y1="11" x2="19" y2="15" />
      <line x1="13" y1="15" x2="14" y2="12" />
      <line x1="19" y1="15" x2="18" y2="12" />
      {/* zig-zag EZ bar */}
      <path d="M9 12 L13 11 L15 13 L17 11 L19 13 L23 12" />
      <rect x="7.5" y="10" width="2" height="4" rx="0.4" />
      <rect x="22.5" y="10" width="2" height="4" rx="0.4" />
    </Svg>
  );
}

export function InclineCurlIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* incline bench */}
      <path d="M6 26 L22 12" />
      <line x1="6" y1="26" x2="6" y2="28" />
      <line x1="22" y1="12" x2="24" y2="14" />
      {/* body leaning back */}
      <circle cx="20" cy="11" r="1.6" />
      <line x1="19" y1="13" x2="11" y2="22" />
      {/* arm hanging behind, holding dumbbell */}
      <line x1="14" y1="18" x2="14" y2="25" />
      <rect x="12" y="25" width="4" height="3" rx="0.5" />
    </Svg>
  );
}

export function ConcentrationCurlIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* seated on bench */}
      <rect x="6" y="22" width="20" height="3" rx="0.5" />
      <line x1="8" y1="25" x2="8" y2="28" />
      <line x1="24" y1="25" x2="24" y2="28" />
      {/* person seated, leaning forward */}
      <circle cx="12" cy="11" r="1.8" />
      <line x1="13" y1="13" x2="16" y2="22" />
      {/* elbow on knee, arm curling dumbbell */}
      <line x1="14" y1="17" x2="11" y2="22" />
      <line x1="11" y1="22" x2="13" y2="18" />
      <rect x="11" y="14" width="4" height="3" rx="0.5" />
      {/* opposite leg */}
      <line x1="16" y1="22" x2="20" y2="27" />
    </Svg>
  );
}

export function ReverseCurlIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="6" r="1.8" />
      <line x1="16" y1="8" x2="16" y2="20" />
      <line x1="16" y1="20" x2="13" y2="27" />
      <line x1="16" y1="20" x2="19" y2="27" />
      {/* arms curled, overhand grip indicated by bar above hands */}
      <line x1="16" y1="11" x2="13" y2="15" />
      <line x1="16" y1="11" x2="19" y2="15" />
      <line x1="13" y1="15" x2="13" y2="12" />
      <line x1="19" y1="15" x2="19" y2="12" />
      <line x1="9" y1="12" x2="23" y2="12" />
      <rect x="7.5" y="10" width="2" height="4" rx="0.4" />
      <rect x="22.5" y="10" width="2" height="4" rx="0.4" />
    </Svg>
  );
}

export function WristCurlIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* forearm on bench (horizontal) */}
      <rect x="3" y="18" width="18" height="3" rx="0.5" />
      <line x1="5" y1="21" x2="5" y2="27" />
      <line x1="19" y1="21" x2="19" y2="27" />
      {/* forearm */}
      <line x1="5" y1="17" x2="19" y2="17" />
      {/* hand flexed up holding dumbbell */}
      <line x1="19" y1="17" x2="23" y2="13" />
      <rect x="22" y="9" width="3" height="5" rx="0.5" />
    </Svg>
  );
}

/* ─── 팔 (삼두) ──────────────────────────────────────────────────────── */

export function TricepsPushdownIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* high pulley */}
      <circle cx="22" cy="5" r="1.4" />
      <line x1="22" y1="6" x2="22" y2="13" />
      {/* bar */}
      <line x1="18" y1="13" x2="26" y2="13" />
      {/* person standing */}
      <circle cx="12" cy="9" r="1.8" />
      <line x1="12" y1="11" x2="12" y2="22" />
      <line x1="12" y1="22" x2="9" y2="27" />
      <line x1="12" y1="22" x2="15" y2="27" />
      {/* arms pushing down */}
      <line x1="12" y1="13" x2="20" y2="13" />
      <line x1="20" y1="13" x2="22" y2="20" />
    </Svg>
  );
}

export function SkullCrusherIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* bench */}
      <rect x="5" y="19" width="22" height="3" rx="0.5" />
      <line x1="9" y1="22" x2="9" y2="27" />
      <line x1="23" y1="22" x2="23" y2="27" />
      {/* body lying */}
      <circle cx="7" cy="17" r="1.8" />
      <line x1="9" y1="17" x2="22" y2="17" />
      {/* upper arm vertical, forearm bent toward forehead */}
      <line x1="14" y1="17" x2="14" y2="11" />
      <line x1="14" y1="11" x2="9" y2="14" />
      {/* bar with plates */}
      <line x1="7" y1="14" x2="11" y2="14" />
      <rect x="5.5" y="12" width="2" height="4" rx="0.4" />
      <rect x="10.5" y="12" width="2" height="4" rx="0.4" />
    </Svg>
  );
}

export function OverheadTricepsExtensionIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="9" r="1.8" />
      <line x1="16" y1="11" x2="16" y2="20" />
      <line x1="16" y1="20" x2="13" y2="27" />
      <line x1="16" y1="20" x2="19" y2="27" />
      {/* arms overhead, elbows fixed */}
      <line x1="16" y1="13" x2="14" y2="6" />
      <line x1="16" y1="13" x2="18" y2="6" />
      {/* single dumbbell at top, held by both hands */}
      <rect x="13" y="3" width="6" height="3" rx="0.6" />
    </Svg>
  );
}

export function BenchDipIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* bench behind */}
      <rect x="3" y="14" width="9" height="2.5" rx="0.5" />
      <line x1="4" y1="16.5" x2="4" y2="22" />
      <line x1="11" y1="16.5" x2="11" y2="22" />
      {/* person */}
      <circle cx="16" cy="10" r="1.8" />
      <line x1="16" y1="12" x2="16" y2="18" />
      {/* hands on bench behind */}
      <line x1="16" y1="13" x2="9" y2="14" />
      {/* legs out */}
      <line x1="16" y1="18" x2="22" y2="22" />
      <line x1="22" y1="22" x2="28" y2="22" />
    </Svg>
  );
}

/* ─── 하체 ──────────────────────────────────────────────────────────── */

export function SquatIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="7" r="1.8" />
      {/* bar on shoulders */}
      <line x1="9" y1="10" x2="23" y2="10" />
      <rect x="7.5" y="8" width="2" height="4" rx="0.4" />
      <rect x="22.5" y="8" width="2" height="4" rx="0.4" />
      {/* body */}
      <line x1="16" y1="9" x2="16" y2="16" />
      {/* squatting legs */}
      <path d="M16 16 L11 20 L11 26" />
      <path d="M16 16 L21 20 L21 26" />
    </Svg>
  );
}

export function FrontSquatIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="7" r="1.8" />
      {/* bar in front rack */}
      <line x1="9" y1="11" x2="23" y2="11" />
      <rect x="7.5" y="9" width="2" height="4" rx="0.4" />
      <rect x="22.5" y="9" width="2" height="4" rx="0.4" />
      {/* elbows up */}
      <path d="M13 11 L11 9" />
      <path d="M19 11 L21 9" />
      <line x1="16" y1="9" x2="16" y2="16" />
      <path d="M16 16 L11 20 L11 26" />
      <path d="M16 16 L21 20 L21 26" />
    </Svg>
  );
}

export function GobletSquatIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="7" r="1.8" />
      <line x1="16" y1="9" x2="16" y2="16" />
      <path d="M16 16 L11 20 L11 26" />
      <path d="M16 16 L21 20 L21 26" />
      {/* hands holding dumbbell at chest */}
      <line x1="13" y1="11" x2="19" y2="11" />
      <path d="M14 11 L13 14 L19 14 L18 11" />
    </Svg>
  );
}

export function HackSquatIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* angled machine */}
      <path d="M3 27 L29 9" />
      <line x1="3" y1="27" x2="3" y2="25" />
      <line x1="29" y1="9" x2="29" y2="14" />
      {/* shoulder pads */}
      <line x1="22" y1="11" x2="26" y2="14" />
      {/* person body along incline */}
      <circle cx="22" cy="13" r="1.6" />
      <line x1="21" y1="14" x2="13" y2="20" />
      {/* legs bent on platform */}
      <line x1="13" y1="20" x2="11" y2="26" />
      <line x1="13" y1="20" x2="15" y2="26" />
    </Svg>
  );
}

export function SmithSquatIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* vertical rails */}
      <line x1="6" y1="3" x2="6" y2="28" />
      <line x1="26" y1="3" x2="26" y2="28" />
      {/* sliding bar */}
      <line x1="6" y1="10" x2="26" y2="10" />
      <rect x="4.5" y="8" width="3" height="4" rx="0.5" />
      <rect x="24.5" y="8" width="3" height="4" rx="0.5" />
      {/* person squatting under bar */}
      <circle cx="16" cy="13" r="1.8" />
      <line x1="16" y1="15" x2="16" y2="20" />
      <path d="M16 20 L12 24 L12 28" />
      <path d="M16 20 L20 24 L20 28" />
    </Svg>
  );
}

export function LegPressIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* angled platform with plates */}
      <path d="M3 24 L18 8" />
      <line x1="3" y1="24" x2="3" y2="27" />
      <line x1="18" y1="8" x2="22" y2="12" />
      {/* plates on top */}
      <rect x="20" y="7" width="3" height="6" rx="0.5" />
      <rect x="24" y="9" width="2" height="4" rx="0.5" />
      {/* person seated */}
      <circle cx="6" cy="20" r="1.8" />
      <line x1="6" y1="22" x2="6" y2="27" />
      {/* legs pushing toward platform */}
      <path d="M8 22 L13 18" />
      <path d="M8 22 L13 22" />
    </Svg>
  );
}

export function LegExtensionIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* seat */}
      <rect x="6" y="18" width="12" height="3" rx="0.5" />
      <line x1="8" y1="21" x2="8" y2="27" />
      <line x1="16" y1="21" x2="16" y2="27" />
      {/* back rest */}
      <line x1="6" y1="18" x2="6" y2="9" />
      {/* person */}
      <circle cx="6" cy="7" r="1.6" />
      {/* legs extended forward */}
      <line x1="18" y1="18" x2="28" y2="14" />
      {/* foot pad */}
      <rect x="26" y="12" width="3" height="4" rx="0.5" />
    </Svg>
  );
}

export function LegCurlIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* bench */}
      <rect x="3" y="14" width="22" height="3" rx="0.5" />
      <line x1="5" y1="17" x2="5" y2="22" />
      <line x1="23" y1="17" x2="23" y2="22" />
      {/* face-down body */}
      <circle cx="5" cy="12" r="1.8" />
      <line x1="7" y1="13" x2="22" y2="13" />
      {/* legs curling up (knees bend) */}
      <line x1="22" y1="13" x2="26" y2="7" />
      {/* ankle pad */}
      <rect x="25" y="6" width="4" height="3" rx="0.5" />
    </Svg>
  );
}

export function SeatedLegCurlIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* seat */}
      <rect x="6" y="14" width="11" height="3" rx="0.5" />
      <line x1="6" y1="17" x2="6" y2="9" />
      <circle cx="6" cy="7" r="1.6" />
      <line x1="8" y1="17" x2="8" y2="27" />
      <line x1="15" y1="17" x2="15" y2="27" />
      {/* legs curled under */}
      <line x1="17" y1="14" x2="27" y2="14" />
      <line x1="27" y1="14" x2="25" y2="22" />
      <rect x="22" y="22" width="6" height="3" rx="0.5" />
    </Svg>
  );
}

export function HipThrustIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* bench */}
      <rect x="3" y="10" width="10" height="3" rx="0.5" />
      <line x1="4" y1="13" x2="4" y2="22" />
      <line x1="12" y1="13" x2="12" y2="22" />
      {/* body lifted to bench */}
      <circle cx="6" cy="8" r="1.6" />
      <line x1="8" y1="9" x2="18" y2="14" />
      {/* hips up, legs bent down */}
      <line x1="18" y1="14" x2="24" y2="22" />
      <line x1="24" y1="22" x2="24" y2="27" />
      {/* bar on hips */}
      <line x1="14" y1="11" x2="22" y2="14" />
      <rect x="12" y="9" width="3" height="4" rx="0.4" />
      <rect x="21" y="13" width="3" height="4" rx="0.4" />
    </Svg>
  );
}

export function GluteBridgeIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* floor */}
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* shoulders + head on floor */}
      <circle cx="5" cy="20" r="1.6" />
      <line x1="7" y1="21" x2="18" y2="17" />
      {/* hips raised */}
      <line x1="18" y1="17" x2="22" y2="23" />
      {/* knees + feet on floor */}
      <line x1="22" y1="23" x2="22" y2="27" />
    </Svg>
  );
}

export function HipAbductionIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* seat */}
      <rect x="11" y="14" width="10" height="3" rx="0.5" />
      <line x1="11" y1="17" x2="11" y2="14" />
      <line x1="11" y1="14" x2="11" y2="9" />
      <circle cx="11" cy="7" r="1.6" />
      {/* legs out (pads on outside of knees) */}
      <line x1="13" y1="17" x2="6" y2="22" />
      <line x1="19" y1="17" x2="26" y2="22" />
      <rect x="3" y="20" width="4" height="4" rx="0.5" />
      <rect x="25" y="20" width="4" height="4" rx="0.5" />
      {/* outward arrows */}
      <path d="M7 18 L5 18 L5 16" />
      <path d="M25 18 L27 18 L27 16" />
    </Svg>
  );
}

export function HipAdductionIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* seat */}
      <rect x="11" y="14" width="10" height="3" rx="0.5" />
      <line x1="11" y1="14" x2="11" y2="9" />
      <circle cx="11" cy="7" r="1.6" />
      {/* legs spread, pads inside */}
      <line x1="13" y1="17" x2="6" y2="22" />
      <line x1="19" y1="17" x2="26" y2="22" />
      <rect x="7" y="20" width="4" height="4" rx="0.5" />
      <rect x="21" y="20" width="4" height="4" rx="0.5" />
      {/* inward arrows */}
      <path d="M11 18 L13 18 L13 16" />
      <path d="M21 18 L19 18 L19 16" />
    </Svg>
  );
}

export function CableKickbackIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* low pulley */}
      <circle cx="3" cy="26" r="1.4" />
      {/* cable to ankle */}
      <line x1="4" y1="26" x2="22" y2="22" />
      {/* person on all fours */}
      <circle cx="22" cy="11" r="1.8" />
      <line x1="22" y1="13" x2="22" y2="20" />
      <line x1="22" y1="20" x2="14" y2="20" />
      {/* support arm */}
      <line x1="14" y1="20" x2="14" y2="27" />
      {/* support leg knee */}
      <line x1="22" y1="20" x2="18" y2="25" />
      <line x1="18" y1="25" x2="18" y2="27" />
      {/* kicked-back leg */}
      <line x1="22" y1="20" x2="28" y2="14" />
    </Svg>
  );
}

export function LungeIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="7" r="1.8" />
      <line x1="16" y1="9" x2="16" y2="18" />
      {/* front leg bent 90 */}
      <line x1="16" y1="18" x2="22" y2="22" />
      <line x1="22" y1="22" x2="22" y2="27" />
      {/* back leg, knee down */}
      <line x1="16" y1="18" x2="11" y2="22" />
      <line x1="11" y1="22" x2="7" y2="27" />
      {/* dumbbells at sides */}
      <rect x="11" y="13" width="3" height="4" rx="0.4" />
      <rect x="18" y="13" width="3" height="4" rx="0.4" />
    </Svg>
  );
}

export function BulgarianSplitSquatIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* bench (back foot elevated) */}
      <rect x="2" y="18" width="9" height="2.5" rx="0.5" />
      <line x1="3" y1="20.5" x2="3" y2="26" />
      <line x1="10" y1="20.5" x2="10" y2="26" />
      <circle cx="20" cy="7" r="1.8" />
      <line x1="20" y1="9" x2="20" y2="18" />
      {/* front leg */}
      <line x1="20" y1="18" x2="26" y2="22" />
      <line x1="26" y1="22" x2="26" y2="27" />
      {/* back leg on bench */}
      <line x1="20" y1="18" x2="12" y2="22" />
      <line x1="12" y1="22" x2="6" y2="20" />
    </Svg>
  );
}

export function WalkingLungeIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="14" cy="7" r="1.8" />
      <line x1="14" y1="9" x2="14" y2="18" />
      {/* front leg striding */}
      <line x1="14" y1="18" x2="22" y2="22" />
      <line x1="22" y1="22" x2="22" y2="27" />
      {/* back leg */}
      <line x1="14" y1="18" x2="6" y2="22" />
      <line x1="6" y1="22" x2="6" y2="27" />
      {/* motion arrow */}
      <path d="M25 16 L29 16 L27 14 M29 16 L27 18" />
    </Svg>
  );
}

export function StepUpIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* box step */}
      <rect x="14" y="18" width="14" height="9" />
      <circle cx="11" cy="6" r="1.8" />
      <line x1="11" y1="8" x2="11" y2="17" />
      {/* leg up onto box */}
      <line x1="11" y1="17" x2="18" y2="18" />
      <line x1="18" y1="18" x2="18" y2="23" />
      {/* leg down */}
      <line x1="11" y1="17" x2="11" y2="27" />
      {/* dumbbells */}
      <rect x="6" y="13" width="3" height="3" rx="0.4" />
      <rect x="13" y="13" width="3" height="3" rx="0.4" />
    </Svg>
  );
}

export function RdlIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* slight bend, legs nearly straight */}
      <circle cx="8" cy="9" r="1.8" />
      <line x1="9" y1="11" x2="22" y2="14" />
      {/* legs straight */}
      <line x1="22" y1="14" x2="21" y2="27" />
      <line x1="22" y1="14" x2="24" y2="27" />
      {/* arms down to bar mid-shin */}
      <line x1="15" y1="13" x2="14" y2="20" />
      <line x1="19" y1="14" x2="18" y2="20" />
      <HBar y={20} x1={10} x2={22} plate={2.4} />
    </Svg>
  );
}

export function SumoDeadliftIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* wide stance */}
      <circle cx="16" cy="6" r="1.8" />
      <line x1="16" y1="8" x2="16" y2="14" />
      <line x1="16" y1="14" x2="8" y2="24" />
      <line x1="16" y1="14" x2="24" y2="24" />
      {/* arms inside knees */}
      <line x1="16" y1="13" x2="13" y2="20" />
      <line x1="16" y1="13" x2="19" y2="20" />
      <line x1="13" y1="20" x2="19" y2="20" />
      {/* plates outside legs */}
      <circle cx="7" cy="22" r="2.4" />
      <circle cx="25" cy="22" r="2.4" />
    </Svg>
  );
}

export function GoodMorningIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* bar on shoulders */}
      <circle cx="8" cy="9" r="1.8" />
      <line x1="6" y1="11" x2="13" y2="14" />
      <rect x="5" y="9" width="2" height="4" rx="0.4" />
      <rect x="12" y="13" width="2" height="4" rx="0.4" />
      {/* hinged body */}
      <line x1="10" y1="12" x2="22" y2="14" />
      {/* legs */}
      <line x1="22" y1="14" x2="21" y2="27" />
      <line x1="22" y1="14" x2="25" y2="27" />
    </Svg>
  );
}

export function StandingCalfRaiseIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* platform */}
      <line x1="3" y1="27" x2="29" y2="27" />
      <line x1="10" y1="27" x2="22" y2="27" />
      <rect x="10" y="22" width="12" height="5" />
      {/* person on tiptoes */}
      <circle cx="16" cy="7" r="1.8" />
      <line x1="16" y1="9" x2="16" y2="20" />
      <line x1="16" y1="20" x2="14" y2="22" />
      <line x1="16" y1="20" x2="18" y2="22" />
      {/* heel raise arrow */}
      <path d="M22 18 L26 18 L24 16 M26 18 L24 20" />
    </Svg>
  );
}

export function SeatedCalfRaiseIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* seat */}
      <rect x="4" y="14" width="11" height="3" rx="0.5" />
      <line x1="5" y1="17" x2="5" y2="27" />
      <line x1="13" y1="17" x2="13" y2="27" />
      {/* person seated */}
      <circle cx="6" cy="9" r="1.6" />
      <line x1="6" y1="11" x2="6" y2="14" />
      {/* knee pad with weight */}
      <rect x="14" y="9" width="6" height="4" rx="0.5" />
      {/* lower legs going down to foot platform */}
      <line x1="17" y1="13" x2="20" y2="22" />
      {/* foot platform */}
      <rect x="18" y="22" width="9" height="4" />
    </Svg>
  );
}

/* ─── 코어 ──────────────────────────────────────────────────────────── */

export function PlankIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* head + body horizontal */}
      <circle cx="27" cy="11" r="1.8" />
      <line x1="26" y1="12" x2="6" y2="20" />
      {/* forearm support */}
      <line x1="6" y1="20" x2="3" y2="27" />
      <line x1="3" y1="20" x2="9" y2="20" />
      {/* feet */}
      <line x1="26" y1="12" x2="29" y2="27" />
    </Svg>
  );
}

export function SidePlankIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      <circle cx="27" cy="8" r="1.8" />
      {/* angled body */}
      <line x1="26" y1="10" x2="6" y2="26" />
      {/* support arm */}
      <line x1="6" y1="26" x2="3" y2="20" />
      <line x1="3" y1="20" x2="3" y2="27" />
      {/* free arm raised up */}
      <line x1="16" y1="18" x2="16" y2="9" />
    </Svg>
  );
}

export function SitUpIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* sitting up — torso angled */}
      <circle cx="6" cy="10" r="1.8" />
      <line x1="7" y1="12" x2="17" y2="22" />
      {/* knees bent */}
      <line x1="17" y1="22" x2="22" y2="16" />
      <line x1="22" y1="16" x2="26" y2="22" />
      <line x1="26" y1="22" x2="26" y2="27" />
      {/* arms across chest */}
      <line x1="10" y1="14" x2="14" y2="18" />
    </Svg>
  );
}

export function CrunchIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* small crunch — head lifted a bit */}
      <circle cx="9" cy="18" r="1.6" />
      <line x1="10" y1="19" x2="17" y2="23" />
      <line x1="17" y1="23" x2="22" y2="18" />
      <line x1="22" y1="18" x2="26" y2="23" />
      <line x1="26" y1="23" x2="26" y2="27" />
    </Svg>
  );
}

export function RussianTwistIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* seated, leaning back */}
      <circle cx="6" cy="9" r="1.8" />
      <line x1="7" y1="11" x2="15" y2="20" />
      {/* legs lifted */}
      <line x1="15" y1="20" x2="23" y2="15" />
      {/* arms twisting to side with weight */}
      <line x1="10" y1="14" x2="18" y2="11" />
      <rect x="17" y="9" width="4" height="3" rx="0.5" />
      {/* rotation arrow */}
      <path d="M22 6 Q26 8 24 12" />
    </Svg>
  );
}

export function AbRolloutIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* kneeling */}
      <circle cx="22" cy="10" r="1.8" />
      <line x1="22" y1="12" x2="22" y2="22" />
      <line x1="22" y1="22" x2="22" y2="27" />
      {/* arms forward to wheel */}
      <line x1="22" y1="13" x2="8" y2="22" />
      {/* wheel */}
      <circle cx="6" cy="23" r="3" />
      <line x1="3" y1="23" x2="9" y2="23" />
    </Svg>
  );
}

export function MountainClimberIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* plank w/ knee forward */}
      <circle cx="6" cy="11" r="1.8" />
      <line x1="7" y1="13" x2="22" y2="18" />
      {/* arms */}
      <line x1="7" y1="13" x2="6" y2="20" />
      <line x1="13" y1="15" x2="13" y2="22" />
      {/* one leg back, one knee forward */}
      <line x1="22" y1="18" x2="28" y2="22" />
      <line x1="22" y1="18" x2="16" y2="22" />
      <line x1="16" y1="22" x2="20" y2="27" />
    </Svg>
  );
}

export function HangingLegRaiseIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* bar */}
      <line x1="4" y1="4" x2="28" y2="4" />
      <line x1="5" y1="2" x2="5" y2="6" />
      <line x1="27" y1="2" x2="27" y2="6" />
      {/* hands */}
      <line x1="13" y1="4" x2="13" y2="7" />
      <line x1="19" y1="4" x2="19" y2="7" />
      {/* body hanging */}
      <line x1="13" y1="7" x2="16" y2="10" />
      <line x1="19" y1="7" x2="16" y2="10" />
      <circle cx="16" cy="11" r="1.6" />
      <line x1="16" y1="13" x2="16" y2="19" />
      {/* legs raised to L */}
      <line x1="16" y1="19" x2="26" y2="19" />
    </Svg>
  );
}

export function CableCrunchIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="4" r="1.4" />
      <line x1="16" y1="5" x2="16" y2="12" />
      {/* rope split */}
      <line x1="16" y1="12" x2="13" y2="15" />
      <line x1="16" y1="12" x2="19" y2="15" />
      {/* kneeling person */}
      <circle cx="16" cy="18" r="1.8" />
      {/* hands at head */}
      <line x1="13" y1="15" x2="14" y2="18" />
      <line x1="19" y1="15" x2="18" y2="18" />
      {/* crunched body */}
      <line x1="16" y1="20" x2="22" y2="24" />
      <line x1="22" y1="24" x2="22" y2="27" />
      <line x1="16" y1="20" x2="10" y2="24" />
      <line x1="10" y1="24" x2="10" y2="27" />
    </Svg>
  );
}

export function WoodChopperIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* high pulley */}
      <circle cx="27" cy="5" r="1.4" />
      {/* cable to diagonal */}
      <line x1="27" y1="6" x2="10" y2="20" />
      {/* handle near floor */}
      <rect x="6" y="20" width="6" height="2.5" rx="0.5" />
      {/* person twisting */}
      <circle cx="16" cy="10" r="1.8" />
      <line x1="16" y1="12" x2="16" y2="20" />
      <line x1="16" y1="20" x2="13" y2="27" />
      <line x1="16" y1="20" x2="19" y2="27" />
      {/* arms diagonal */}
      <line x1="16" y1="14" x2="10" y2="20" />
    </Svg>
  );
}

export function PallofPressIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* side pulley */}
      <circle cx="3" cy="14" r="1.4" />
      <line x1="4" y1="14" x2="13" y2="14" />
      {/* handle in front of chest */}
      <rect x="13" y="13" width="3" height="2.5" rx="0.4" />
      {/* person */}
      <circle cx="22" cy="9" r="1.8" />
      <line x1="22" y1="11" x2="22" y2="20" />
      <line x1="22" y1="20" x2="19" y2="27" />
      <line x1="22" y1="20" x2="25" y2="27" />
      {/* arms forward holding handle */}
      <line x1="22" y1="13" x2="16" y2="14" />
    </Svg>
  );
}

/* ─── 변형 전용 아이콘 (동작이 확연히 다른 것) ──────────────────────────── */

export function DumbbellPulloverIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* bench */}
      <rect x="5" y="19" width="22" height="3" rx="0.5" />
      <line x1="9" y1="22" x2="9" y2="27" />
      <line x1="23" y1="22" x2="23" y2="27" />
      {/* body lying, head left */}
      <circle cx="7" cy="17" r="1.8" />
      <line x1="9" y1="17" x2="22" y2="17" />
      {/* arms reaching back over head (up-left) */}
      <line x1="12" y1="17" x2="6" y2="9" />
      {/* single dumbbell overhead */}
      <rect x="3" y="6.5" width="5" height="3" rx="0.6" />
    </Svg>
  );
}

export function TricepsKickbackIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* hinged torso */}
      <circle cx="8" cy="9" r="1.8" />
      <line x1="9" y1="11" x2="18" y2="15" />
      {/* legs */}
      <line x1="18" y1="15" x2="16" y2="27" />
      <line x1="18" y1="15" x2="21" y2="27" />
      {/* upper arm back, forearm extended straight back */}
      <line x1="12" y1="13" x2="18" y2="12" />
      <line x1="18" y1="12" x2="26" y2="14" />
      <rect x="25" y="12" width="3" height="4" rx="0.5" />
    </Svg>
  );
}

export function InvertedRowIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* high horizontal bar */}
      <line x1="4" y1="8" x2="22" y2="8" />
      <line x1="6" y1="8" x2="6" y2="3" />
      {/* body horizontal below, head left */}
      <circle cx="8" cy="14" r="1.8" />
      <line x1="10" y1="14" x2="26" y2="18" />
      {/* feet */}
      <line x1="26" y1="18" x2="29" y2="20" />
      {/* arms up to bar */}
      <line x1="11" y1="13" x2="11" y2="9" />
      <line x1="15" y1="14" x2="15" y2="9" />
    </Svg>
  );
}

export function CablePullThroughIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      {/* low pulley behind (right) */}
      <circle cx="28" cy="25" r="1.4" />
      {/* cable through legs to hands */}
      <line x1="27" y1="25" x2="15" y2="20" />
      {/* hinged person facing left */}
      <circle cx="8" cy="9" r="1.8" />
      <line x1="9" y1="11" x2="18" y2="15" />
      <line x1="18" y1="15" x2="17" y2="27" />
      <line x1="18" y1="15" x2="21" y2="27" />
      {/* arms down between legs to handle */}
      <line x1="13" y1="13" x2="15" y2="20" />
      <rect x="13" y="20" width="4" height="2.5" rx="0.4" />
    </Svg>
  );
}

export function HollowHoldIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* banana-shaped body, low back on floor */}
      <path d="M6 18 Q16 24 26 18" />
      <circle cx="5" cy="16" r="1.6" />
      {/* arms overhead */}
      <line x1="6" y1="17" x2="4" y2="11" />
      {/* legs raised */}
      <line x1="26" y1="17" x2="28" y2="11" />
    </Svg>
  );
}

export function VUpIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* torso up-left */}
      <circle cx="6" cy="10" r="1.6" />
      <line x1="7" y1="11" x2="15" y2="22" />
      {/* legs up-right (V) */}
      <line x1="15" y1="22" x2="26" y2="10" />
      {/* arms reaching toward feet */}
      <line x1="10" y1="15" x2="21" y2="15" />
    </Svg>
  );
}

export function BicycleCrunchIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* head/shoulders left */}
      <circle cx="7" cy="20" r="1.6" />
      <line x1="8" y1="19" x2="14" y2="16" />
      {/* one knee tucked */}
      <line x1="14" y1="16" x2="18" y2="20" />
      <line x1="18" y1="20" x2="15" y2="24" />
      {/* other leg extended */}
      <line x1="14" y1="16" x2="27" y2="22" />
      {/* elbow toward opposite knee (twist) */}
      <line x1="9" y1="18" x2="16" y2="20" />
    </Svg>
  );
}

export function PistolSquatIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="13" cy="6" r="1.8" />
      <line x1="13" y1="8" x2="13" y2="15" />
      {/* standing leg bent */}
      <path d="M13 15 L10 19 L12 27" />
      {/* other leg extended forward */}
      <line x1="13" y1="16" x2="27" y2="14" />
      {/* arms forward for balance */}
      <line x1="13" y1="11" x2="22" y2="11" />
    </Svg>
  );
}

export function SumoSquatIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="7" r="1.8" />
      <line x1="16" y1="9" x2="16" y2="15" />
      {/* very wide stance, knees out */}
      <path d="M16 15 L8 18 L7 26" />
      <path d="M16 15 L24 18 L25 26" />
      {/* hands holding weight at center */}
      <line x1="14" y1="13" x2="18" y2="13" />
      <path d="M14 13 L13 16 L19 16 L18 13" />
    </Svg>
  );
}

export function DiamondPushupIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* body diagonal, head right */}
      <line x1="6" y1="19" x2="25" y2="14" />
      <circle cx="27" cy="13" r="1.8" />
      {/* hands together (diamond) under chest */}
      <line x1="15" y1="16.5" x2="14" y2="24" />
      <path d="M11.5 24 L14 22 L16.5 24 L14 26 Z" />
      {/* legs */}
      <line x1="6" y1="19" x2="3" y2="27" />
    </Svg>
  );
}

/* ─── 기본 fallback ─────────────────────────────────────────────────── */

export function GenericDumbbellIcon(p: ExerciseIconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="13" width="5" height="6" rx="0.8" />
      <rect x="24" y="13" width="5" height="6" rx="0.8" />
      <line x1="8" y1="16" x2="24" y2="16" />
    </Svg>
  );
}

/* ─── lookup ────────────────────────────────────────────────────────── */

const ICONS: Record<string, (p: ExerciseIconProps) => ReactNode> = {
  // 가슴
  "bench-press": BenchPressIcon,
  "incline-press": InclinePressIcon,
  "decline-press": DeclinePressIcon,
  "chest-fly": ChestFlyIcon,
  "pec-deck": PecDeckIcon,
  "cable-crossover": CableCrossoverIcon,
  "push-up": PushUpIcon,
  dips: DipsIcon,
  "close-grip-bench-press": CloseGripBenchIcon,
  // 등
  deadlift: DeadliftIcon,
  "barbell-row": BarbellRowIcon,
  "t-bar-row": TBarRowIcon,
  "seated-cable-row": SeatedCableRowIcon,
  "one-arm-dumbbell-row": OneArmDumbbellRowIcon,
  "lat-pulldown": LatPulldownIcon,
  "pull-up": PullUpIcon,
  "chin-up": ChinUpIcon,
  "straight-arm-pulldown": StraightArmPulldownIcon,
  shrug: ShrugIcon,
  hyperextension: HyperextensionIcon,
  // 어깨
  ohp: OhpIcon,
  "arnold-press": ArnoldPressIcon,
  "lateral-raise": LateralRaiseIcon,
  "front-raise": FrontRaiseIcon,
  "rear-delt-fly": RearDeltFlyIcon,
  "upright-row": UprightRowIcon,
  "face-pull": FacePullIcon,
  // 팔
  "biceps-curl": BicepsCurlIcon,
  "hammer-curl": HammerCurlIcon,
  "preacher-curl": PreacherCurlIcon,
  "ez-bar-curl": EzBarCurlIcon,
  "incline-curl": InclineCurlIcon,
  "concentration-curl": ConcentrationCurlIcon,
  "reverse-curl": ReverseCurlIcon,
  "wrist-curl": WristCurlIcon,
  "triceps-pushdown": TricepsPushdownIcon,
  "skull-crusher": SkullCrusherIcon,
  "overhead-triceps-extension": OverheadTricepsExtensionIcon,
  "bench-dip": BenchDipIcon,
  // 하체
  squat: SquatIcon,
  "front-squat": FrontSquatIcon,
  "goblet-squat": GobletSquatIcon,
  "hack-squat": HackSquatIcon,
  "smith-squat": SmithSquatIcon,
  "leg-press": LegPressIcon,
  "leg-extension": LegExtensionIcon,
  "leg-curl": LegCurlIcon,
  "seated-leg-curl": SeatedLegCurlIcon,
  "hip-thrust": HipThrustIcon,
  "glute-bridge": GluteBridgeIcon,
  "hip-abduction": HipAbductionIcon,
  "hip-adduction": HipAdductionIcon,
  "cable-kickback": CableKickbackIcon,
  lunge: LungeIcon,
  "bulgarian-split-squat": BulgarianSplitSquatIcon,
  "walking-lunge": WalkingLungeIcon,
  "step-up": StepUpIcon,
  rdl: RdlIcon,
  "sumo-deadlift": SumoDeadliftIcon,
  "good-morning": GoodMorningIcon,
  "standing-calf-raise": StandingCalfRaiseIcon,
  "seated-calf-raise": SeatedCalfRaiseIcon,
  // 코어
  plank: PlankIcon,
  "side-plank": SidePlankIcon,
  "sit-up": SitUpIcon,
  crunch: CrunchIcon,
  "russian-twist": RussianTwistIcon,
  "ab-rollout": AbRolloutIcon,
  "mountain-climber": MountainClimberIcon,
  "hanging-leg-raise": HangingLegRaiseIcon,
  "cable-crunch": CableCrunchIcon,
  "wood-chopper": WoodChopperIcon,
  "pallof-press": PallofPressIcon,

  // 변형·머신 운동. 동작이 확연히 다른 것은 전용 아이콘을 새로 만들고,
  // 나머지(머신/그립 변형 등)는 '가장 가까운 동작'의 아이콘을 재사용한다.
  // (예전엔 매핑이 없어 전부 일반 덤벨로 떠서 실제 운동과 안 맞았다.)
  // 가슴
  "machine-chest-press": BenchPressIcon,
  "smith-bench-press": BenchPressIcon,
  "incline-cable-fly": CableCrossoverIcon,
  "diamond-pushup": DiamondPushupIcon,
  "dumbbell-pullover": DumbbellPulloverIcon,
  // 등
  "wide-grip-pull-up": PullUpIcon,
  "assisted-pull-up": PullUpIcon,
  "inverted-row": InvertedRowIcon,
  "pendlay-row": BarbellRowIcon,
  "meadows-row": TBarRowIcon,
  "chest-supported-row": SeatedCableRowIcon,
  "low-row-machine": SeatedCableRowIcon,
  // 어깨
  "machine-shoulder-press": OhpIcon,
  "cable-lateral-raise": LateralRaiseIcon,
  "machine-rear-delt-fly": RearDeltFlyIcon,
  "cable-rear-delt-fly": RearDeltFlyIcon,
  "cable-front-raise": FrontRaiseIcon,
  "reverse-pec-deck": RearDeltFlyIcon,
  // 가슴(케이블)
  "cable-fly": CableCrossoverIcon,
  // 팔
  "cable-curl": BicepsCurlIcon,
  "standing-cable-curl": BicepsCurlIcon,
  "drag-curl": BicepsCurlIcon,
  "zottman-curl": BicepsCurlIcon,
  "cable-rope-hammer-curl": HammerCurlIcon,
  "triceps-kickback": TricepsKickbackIcon,
  // 하체
  "box-squat": SquatIcon,
  "belt-squat": SquatIcon,
  "sumo-squat": SumoSquatIcon,
  "sissy-squat": SquatIcon,
  "pistol-squat": PistolSquatIcon,
  "single-leg-leg-press": LegPressIcon,
  "cossack-squat": LungeIcon,
  "curtsy-lunge": LungeIcon,
  "stiff-leg-deadlift": RdlIcon,
  "cable-pull-through": CablePullThroughIcon,
  "donkey-calf-raise": StandingCalfRaiseIcon,
  // 코어
  "bicycle-crunch": BicycleCrunchIcon,
  "reverse-crunch": CrunchIcon,
  "v-up": VUpIcon,
  "toes-to-bar": HangingLegRaiseIcon,
  "hollow-hold": HollowHoldIcon,
};

/** 운동 전용(일반 덤벨 폴백이 아닌) 아이콘이 매핑돼 있는지. */
export function hasDedicatedIcon(id: string): boolean {
  return id in ICONS;
}

/** 운동 id 로 매핑된 SVG 아이콘. 매핑 없으면 일반 덤벨 아이콘. */
export function ExerciseIcon({
  id,
  ...props
}: { id: string } & ExerciseIconProps) {
  const C = ICONS[id] ?? GenericDumbbellIcon;
  return <C {...props} />;
}
