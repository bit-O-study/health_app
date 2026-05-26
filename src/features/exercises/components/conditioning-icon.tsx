import type { ReactNode, SVGProps } from "react";

/**
 * 워밍업/마무리(컨디셔닝) 동작별 SVG 아이콘.
 *
 * 운동 아이콘(exercise-icon.tsx)과 같은 규약:
 * 32x32 viewBox · strokeWidth 1.6 · currentColor.
 */

export type ConditioningIconProps = Omit<
  SVGProps<SVGSVGElement>,
  "children"
> & {
  size?: number;
};

function Svg({
  size = 24,
  children,
  ...rest
}: ConditioningIconProps & { children: ReactNode }) {
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

/* ─── 유산소 / 머신 ─────────────────────────────────────────────────── */

export function RunningIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      {/* treadmill belt */}
      <ellipse cx="16" cy="26" rx="13" ry="2" />
      {/* upright handle */}
      <line x1="3" y1="4" x2="3" y2="26" />
      <line x1="3" y1="10" x2="6" y2="10" />
      {/* runner mid-stride */}
      <circle cx="18" cy="9" r="1.8" />
      <line x1="18" y1="11" x2="15" y2="18" />
      {/* arms */}
      <line x1="16" y1="14" x2="12" y2="11" />
      <line x1="16" y1="14" x2="21" y2="17" />
      {/* legs in stride */}
      <line x1="15" y1="18" x2="10" y2="24" />
      <line x1="15" y1="18" x2="22" y2="24" />
    </Svg>
  );
}

export function StairMasterIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      {/* steps ascending */}
      <path d="M3 27 L9 27 L9 23 L15 23 L15 19 L21 19 L21 15 L27 15 L27 11" />
      {/* upward arrow */}
      <path d="M24 8 L27 5 L30 8" />
      <line x1="27" y1="5" x2="27" y2="11" />
    </Svg>
  );
}

export function CyclingIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      {/* wheels */}
      <circle cx="7" cy="22" r="4" />
      <circle cx="25" cy="22" r="4" />
      {/* frame */}
      <line x1="7" y1="22" x2="13" y2="13" />
      <line x1="13" y1="13" x2="25" y2="22" />
      <line x1="13" y1="13" x2="20" y2="13" />
      {/* handlebar */}
      <line x1="20" y1="13" x2="22" y2="9" />
      <line x1="21" y1="8" x2="24" y2="9" />
      {/* seat */}
      <line x1="13" y1="13" x2="11" y2="9" />
      <line x1="9" y1="9" x2="13" y2="9" />
      {/* pedal */}
      <circle cx="16" cy="22" r="1" />
    </Svg>
  );
}

export function RowingIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      {/* rail */}
      <line x1="3" y1="22" x2="29" y2="22" />
      {/* seat */}
      <rect x="14" y="18" width="6" height="3" rx="0.5" />
      {/* flywheel housing on right */}
      <circle cx="28" cy="14" r="3" />
      <path d="M28 11 L28 17 M25 14 L31 14" />
      {/* person seated */}
      <circle cx="9" cy="9" r="1.8" />
      <line x1="9" y1="11" x2="14" y2="17" />
      {/* arms pulling handle */}
      <line x1="11" y1="13" x2="18" y2="14" />
      {/* cable to fly */}
      <line x1="18" y1="14" x2="25" y2="14" />
      {/* legs */}
      <line x1="14" y1="17" x2="18" y2="21" />
    </Svg>
  );
}

export function EllipticalIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      {/* central column with flywheel */}
      <circle cx="6" cy="14" r="3.5" />
      <line x1="6" y1="14" x2="6" y2="22" />
      {/* handle posts */}
      <line x1="6" y1="14" x2="14" y2="6" />
      <line x1="6" y1="14" x2="20" y2="6" />
      {/* pedal arms */}
      <line x1="6" y1="14" x2="22" y2="22" />
      <line x1="6" y1="14" x2="28" y2="22" />
      {/* pedals */}
      <rect x="20" y="22" width="4" height="2" rx="0.5" />
      <rect x="26" y="22" width="4" height="2" rx="0.5" />
    </Svg>
  );
}

export function JumpRopeIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      {/* rope arc */}
      <path d="M4 22 Q16 4 28 22" />
      {/* handles */}
      <line x1="2" y1="22" x2="6" y2="22" />
      <line x1="26" y1="22" x2="30" y2="22" />
      {/* person jumping */}
      <circle cx="16" cy="12" r="1.8" />
      <line x1="16" y1="14" x2="16" y2="22" />
      {/* legs slightly off ground */}
      <line x1="16" y1="22" x2="13" y2="26" />
      <line x1="16" y1="22" x2="19" y2="26" />
      {/* arms holding rope to side */}
      <line x1="16" y1="16" x2="11" y2="20" />
      <line x1="16" y1="16" x2="21" y2="20" />
    </Svg>
  );
}

export function WalkingIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="6" r="1.8" />
      <line x1="16" y1="8" x2="16" y2="18" />
      {/* gentle stride */}
      <line x1="16" y1="18" x2="11" y2="26" />
      <line x1="16" y1="18" x2="20" y2="26" />
      {/* swinging arms */}
      <line x1="16" y1="11" x2="11" y2="14" />
      <line x1="16" y1="11" x2="20" y2="16" />
      {/* ground */}
      <line x1="4" y1="28" x2="28" y2="28" />
    </Svg>
  );
}

/* ─── 모빌리티 / 워밍업 ─────────────────────────────────────────────── */

export function ShoulderCircleIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="7" r="1.8" />
      <line x1="16" y1="9" x2="16" y2="20" />
      <line x1="16" y1="20" x2="13" y2="27" />
      <line x1="16" y1="20" x2="19" y2="27" />
      {/* circular arrows on each shoulder */}
      <path d="M10 11 Q7 13 9 16 Q12 17 12 14" />
      <path d="M10.5 10.5 L9 12 L11 12.5" />
      <path d="M22 11 Q25 13 23 16 Q20 17 20 14" />
      <path d="M21.5 10.5 L23 12 L21 12.5" />
    </Svg>
  );
}

export function CatCowIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* arched back (cat) */}
      <path d="M6 22 Q12 12 22 18" />
      {/* head */}
      <circle cx="24" cy="19" r="1.8" />
      {/* arms */}
      <line x1="6" y1="22" x2="6" y2="27" />
      <line x1="22" y1="18" x2="22" y2="27" />
      {/* legs (knees) */}
      <line x1="10" y1="20" x2="10" y2="27" />
      <line x1="18" y1="20" x2="18" y2="27" />
    </Svg>
  );
}

export function DeadHangIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      {/* bar */}
      <line x1="4" y1="5" x2="28" y2="5" />
      <line x1="5" y1="3" x2="5" y2="7" />
      <line x1="27" y1="3" x2="27" y2="7" />
      {/* grip */}
      <line x1="13" y1="5" x2="13" y2="8" />
      <line x1="19" y1="5" x2="19" y2="8" />
      {/* fully straight hanging */}
      <line x1="13" y1="8" x2="16" y2="11" />
      <line x1="19" y1="8" x2="16" y2="11" />
      <circle cx="16" cy="13" r="1.8" />
      <line x1="16" y1="15" x2="16" y2="25" />
      <line x1="16" y1="25" x2="14" y2="29" />
      <line x1="16" y1="25" x2="18" y2="29" />
    </Svg>
  );
}

export function BandPullApartIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="7" r="1.8" />
      <line x1="16" y1="9" x2="16" y2="20" />
      <line x1="16" y1="20" x2="13" y2="27" />
      <line x1="16" y1="20" x2="19" y2="27" />
      {/* arms forward holding band */}
      <line x1="16" y1="13" x2="6" y2="13" />
      <line x1="16" y1="13" x2="26" y2="13" />
      {/* band (slight stretch) */}
      <path d="M6 13 Q16 11 26 13" strokeDasharray="2 1.5" />
      {/* outward arrows */}
      <path d="M5 11 L3 13 L5 15" />
      <path d="M27 11 L29 13 L27 15" />
    </Svg>
  );
}

export function WallSlideIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      {/* wall */}
      <line x1="6" y1="3" x2="6" y2="29" />
      {/* head + body against wall */}
      <circle cx="9" cy="10" r="1.8" />
      <line x1="8" y1="12" x2="8" y2="24" />
      <line x1="8" y1="24" x2="11" y2="29" />
      <line x1="8" y1="24" x2="14" y2="29" />
      {/* arms bent up against wall (W shape) */}
      <path d="M8 14 L13 11 L11 7" />
      <path d="M8 18 L14 18 L13 14" />
    </Svg>
  );
}

export function DynamicLungeIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <circle cx="14" cy="6" r="1.8" />
      <line x1="14" y1="8" x2="14" y2="17" />
      {/* front leg bent */}
      <line x1="14" y1="17" x2="22" y2="22" />
      <line x1="22" y1="22" x2="22" y2="27" />
      {/* back leg */}
      <line x1="14" y1="17" x2="6" y2="22" />
      <line x1="6" y1="22" x2="6" y2="27" />
      {/* dynamic motion arrows */}
      <path d="M25 14 L29 14 L27 12 M29 14 L27 16" />
      <path d="M27 22 L29 24" />
    </Svg>
  );
}

export function BwSquatIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="7" r="1.8" />
      <line x1="16" y1="9" x2="16" y2="16" />
      {/* squatting legs */}
      <path d="M16 16 L11 20 L11 26" />
      <path d="M16 16 L21 20 L21 26" />
      {/* arms forward for balance */}
      <line x1="16" y1="11" x2="22" y2="13" />
      <line x1="16" y1="11" x2="10" y2="13" />
    </Svg>
  );
}

export function HipCircleIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="6" r="1.8" />
      <line x1="16" y1="8" x2="16" y2="16" />
      {/* hips circle */}
      <ellipse cx="16" cy="18" rx="6" ry="2.5" strokeDasharray="2 1.5" />
      {/* arrow on circle */}
      <path d="M22 17 L20 16 L20 18" />
      {/* legs */}
      <line x1="13" y1="20" x2="13" y2="27" />
      <line x1="19" y1="20" x2="19" y2="27" />
    </Svg>
  );
}

export function DeadBugIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* lying on back */}
      <circle cx="6" cy="22" r="1.8" />
      <line x1="8" y1="23" x2="22" y2="23" />
      {/* opposite arm up */}
      <line x1="10" y1="22" x2="10" y2="14" />
      {/* opposite leg up */}
      <line x1="20" y1="23" x2="26" y2="14" />
      {/* other arm down on floor */}
      <line x1="15" y1="22" x2="15" y2="26" />
      {/* other leg bent on floor */}
      <line x1="22" y1="23" x2="22" y2="26" />
    </Svg>
  );
}

export function GluteBridgeWarmIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      <circle cx="5" cy="20" r="1.6" />
      {/* hips raised straight body */}
      <line x1="7" y1="21" x2="20" y2="14" />
      {/* hips down to bent knees */}
      <line x1="20" y1="14" x2="22" y2="22" />
      <line x1="22" y1="22" x2="22" y2="27" />
      {/* arm flat on floor */}
      <line x1="6" y1="22" x2="14" y2="22" />
    </Svg>
  );
}

export function JumpingJackIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="7" r="1.8" />
      <line x1="16" y1="9" x2="16" y2="20" />
      {/* arms up + out */}
      <line x1="16" y1="11" x2="6" y2="5" />
      <line x1="16" y1="11" x2="26" y2="5" />
      {/* legs wide */}
      <line x1="16" y1="20" x2="8" y2="28" />
      <line x1="16" y1="20" x2="24" y2="28" />
    </Svg>
  );
}

export function WristCircleIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      {/* forearm */}
      <line x1="4" y1="22" x2="16" y2="14" />
      {/* hand */}
      <path d="M16 14 L20 11 L21 14 L18 17 Z" />
      {/* circular arrow around wrist */}
      <path d="M22 13 Q26 16 22 20 Q18 19 20 16" />
      <path d="M21 12 L22 13 L20.5 14" />
    </Svg>
  );
}

export function PushUpWarmIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      <line x1="6" y1="19" x2="26" y2="14" />
      <circle cx="27" cy="13" r="1.6" />
      <line x1="10" y1="19" x2="10" y2="27" />
      <line x1="6" y1="19" x2="3" y2="27" />
    </Svg>
  );
}

/* ─── 정적 스트레칭 / 마무리 ────────────────────────────────────────── */

export function ChestDoorStretchIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      {/* door frame */}
      <line x1="6" y1="3" x2="6" y2="29" />
      <line x1="6" y1="3" x2="14" y2="3" />
      {/* person */}
      <circle cx="18" cy="8" r="1.8" />
      <line x1="18" y1="10" x2="18" y2="20" />
      <line x1="18" y1="20" x2="15" y2="27" />
      <line x1="18" y1="20" x2="21" y2="27" />
      {/* arm pressed back against frame */}
      <line x1="18" y1="12" x2="7" y2="10" />
    </Svg>
  );
}

export function ShoulderCrossStretchIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="6" r="1.8" />
      <line x1="16" y1="8" x2="16" y2="20" />
      <line x1="16" y1="20" x2="13" y2="27" />
      <line x1="16" y1="20" x2="19" y2="27" />
      {/* arm crossed across body */}
      <line x1="16" y1="11" x2="5" y2="14" />
      {/* support arm bent over crossed arm */}
      <line x1="16" y1="11" x2="9" y2="9" />
      <line x1="9" y1="9" x2="8" y2="13" />
    </Svg>
  );
}

export function ChildPoseIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* hips back over heels, head down */}
      <circle cx="22" cy="20" r="1.8" />
      {/* arms stretched forward */}
      <line x1="22" y1="22" x2="3" y2="25" />
      {/* spine from hips folded over knees */}
      <path d="M22 22 Q26 25 26 27" />
      {/* knees */}
      <line x1="26" y1="22" x2="26" y2="27" />
    </Svg>
  );
}

export function CobraStretchIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* prone body, chest lifted */}
      <circle cx="6" cy="9" r="1.8" />
      {/* spine curving up */}
      <path d="M7 11 Q14 22 26 23" />
      {/* arms pushing up */}
      <line x1="8" y1="13" x2="10" y2="22" />
      <line x1="10" y1="22" x2="10" y2="27" />
      {/* legs flat */}
      <line x1="20" y1="23" x2="26" y2="23" />
    </Svg>
  );
}

export function LatStretchIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      {/* leaning sideways */}
      <circle cx="11" cy="8" r="1.8" />
      <line x1="12" y1="10" x2="18" y2="22" />
      {/* arm overhead, leaning */}
      <line x1="11" y1="9" x2="5" y2="4" />
      {/* other arm */}
      <line x1="14" y1="14" x2="20" y2="14" />
      {/* legs */}
      <line x1="18" y1="22" x2="16" y2="28" />
      <line x1="18" y1="22" x2="22" y2="28" />
    </Svg>
  );
}

export function SleeperStretchIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* lying on side */}
      <circle cx="5" cy="20" r="1.8" />
      <line x1="7" y1="21" x2="22" y2="21" />
      {/* shoulder arm vertical, forearm pressed down by other hand */}
      <line x1="11" y1="21" x2="11" y2="14" />
      <line x1="11" y1="14" x2="17" y2="18" />
      {/* bent legs */}
      <line x1="22" y1="21" x2="20" y2="26" />
      <line x1="22" y1="21" x2="26" y2="26" />
    </Svg>
  );
}

export function TricepsOverheadStretchIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="9" r="1.8" />
      <line x1="16" y1="11" x2="16" y2="22" />
      <line x1="16" y1="22" x2="13" y2="28" />
      <line x1="16" y1="22" x2="19" y2="28" />
      {/* one arm bent behind head */}
      <line x1="16" y1="13" x2="13" y2="6" />
      <line x1="13" y1="6" x2="19" y2="9" />
      {/* opposite hand pulling elbow */}
      <line x1="16" y1="14" x2="12" y2="8" />
    </Svg>
  );
}

export function BicepsDoorStretchIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      {/* wall */}
      <line x1="27" y1="3" x2="27" y2="29" />
      <circle cx="12" cy="9" r="1.8" />
      <line x1="12" y1="11" x2="12" y2="22" />
      <line x1="12" y1="22" x2="9" y2="27" />
      <line x1="12" y1="22" x2="15" y2="27" />
      {/* arm extended back, palm on wall */}
      <line x1="12" y1="13" x2="26" y2="14" />
    </Svg>
  );
}

export function WristStretchIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      {/* forearm extended */}
      <line x1="4" y1="20" x2="18" y2="14" />
      {/* hand bent back (wrist extension) */}
      <line x1="18" y1="14" x2="22" y2="18" />
      {/* fingers */}
      <line x1="22" y1="18" x2="25" y2="22" />
      <line x1="22" y1="18" x2="25" y2="19" />
      <line x1="22" y1="18" x2="24" y2="15" />
      {/* opposite hand pressing back */}
      <line x1="14" y1="9" x2="22" y2="16" />
    </Svg>
  );
}

export function HamstringStretchIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* standing forward fold */}
      <circle cx="22" cy="22" r="1.6" />
      {/* spine bent over straight legs */}
      <path d="M21 22 Q14 20 10 27" />
      {/* arms reaching toward toes */}
      <line x1="22" y1="22" x2="10" y2="26" />
      {/* straight legs */}
      <line x1="14" y1="22" x2="10" y2="27" />
    </Svg>
  );
}

export function PigeonPoseIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* head + torso upright slightly forward */}
      <circle cx="14" cy="9" r="1.8" />
      <line x1="15" y1="11" x2="18" y2="22" />
      {/* front shin sideways on floor */}
      <line x1="18" y1="22" x2="6" y2="22" />
      {/* back leg straight back */}
      <line x1="18" y1="22" x2="28" y2="24" />
      {/* arm supporting */}
      <line x1="16" y1="16" x2="13" y2="22" />
    </Svg>
  );
}

export function CalfStretchIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <line x1="3" y1="27" x2="29" y2="27" />
      {/* wall */}
      <line x1="3" y1="3" x2="3" y2="27" />
      <circle cx="10" cy="9" r="1.8" />
      {/* leaning forward */}
      <line x1="10" y1="11" x2="14" y2="20" />
      {/* arms on wall */}
      <line x1="10" y1="13" x2="4" y2="11" />
      <line x1="10" y1="13" x2="4" y2="15" />
      {/* front leg bent */}
      <line x1="14" y1="20" x2="11" y2="27" />
      {/* back leg straight (calf stretched) */}
      <line x1="14" y1="20" x2="24" y2="27" />
    </Svg>
  );
}

export function NeckStretchIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      {/* tilted head */}
      <circle cx="14" cy="8" r="2.4" />
      {/* tilt indicator line */}
      <line x1="14" y1="11" x2="16" y2="14" />
      {/* body */}
      <line x1="16" y1="14" x2="16" y2="22" />
      <line x1="16" y1="22" x2="13" y2="28" />
      <line x1="16" y1="22" x2="19" y2="28" />
      {/* hand pulling head to side */}
      <line x1="16" y1="15" x2="14" y2="9" />
      {/* tilt arc */}
      <path d="M12 5 Q10 7 11 11" />
    </Svg>
  );
}

/* ─── 폴백 ─────────────────────────────────────────────────────────── */

export function GenericConditioningIcon(p: ConditioningIconProps) {
  return (
    <Svg {...p}>
      <circle cx="16" cy="16" r="11" />
      <path d="M16 9 V16 L21 19" />
    </Svg>
  );
}

/* ─── lookup ────────────────────────────────────────────────────────── */

const ICONS: Record<string, (p: ConditioningIconProps) => ReactNode> = {
  // 유산소 / 머신
  running: RunningIcon,
  "stair-master": StairMasterIcon,
  cycling: CyclingIcon,
  rowing: RowingIcon,
  elliptical: EllipticalIcon,
  "jump-rope": JumpRopeIcon,
  walking: WalkingIcon,
  // 모빌리티 / 워밍업
  "shoulder-circle": ShoulderCircleIcon,
  "cat-cow": CatCowIcon,
  "dead-hang": DeadHangIcon,
  "band-pull-apart": BandPullApartIcon,
  "wall-slide": WallSlideIcon,
  "dynamic-lunge": DynamicLungeIcon,
  "bw-squat": BwSquatIcon,
  "hip-circle": HipCircleIcon,
  "dead-bug": DeadBugIcon,
  "glute-bridge-warm": GluteBridgeWarmIcon,
  "jumping-jack": JumpingJackIcon,
  "wrist-circle": WristCircleIcon,
  "push-up-warm": PushUpWarmIcon,
  // 정적 스트레칭 / 마무리
  "chest-door-stretch": ChestDoorStretchIcon,
  "shoulder-cross-stretch": ShoulderCrossStretchIcon,
  "child-pose": ChildPoseIcon,
  "cobra-stretch": CobraStretchIcon,
  "lat-stretch": LatStretchIcon,
  "sleeper-stretch": SleeperStretchIcon,
  "triceps-overhead-stretch": TricepsOverheadStretchIcon,
  "biceps-door-stretch": BicepsDoorStretchIcon,
  "wrist-stretch": WristStretchIcon,
  "hamstring-stretch": HamstringStretchIcon,
  "pigeon-pose": PigeonPoseIcon,
  "calf-stretch": CalfStretchIcon,
  "neck-stretch": NeckStretchIcon,
};

/** 컨디셔닝 item id → 전용 SVG. 없으면 일반 시계 아이콘. */
export function ConditioningIcon({
  id,
  ...props
}: { id: string } & ConditioningIconProps) {
  const C = ICONS[id] ?? GenericConditioningIcon;
  return <C {...props} />;
}
