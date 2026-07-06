"use client";

/**
 * 그룹 펫 캐릭터 — 진화 단계별 고급 인라인 SVG(+알).
 * 이미지 파일/원격 에셋 없이(WebView CSP·오프라인 안전) 벡터로 그린다.
 * 그라데이션·부드러운 음영·표정으로 퀄리티를 끌어올렸다.
 * 아이템(썬그라스 등) 오버레이가 없어 정렬 틀어짐 문제도 원천 제거.
 *
 * 단계: 알 → 아기 → 청소년 → 어른 → 할아버지 강아지
 */

import { petStage, type PetStageId } from "@/features/groups/evolution";

/** 단계별 팔레트(털·그림자·배). */
const PALETTES: Record<
  Exclude<PetStageId, "egg">,
  { light: string; base: string; dark: string; belly: string; nose: string; ear: string }
> = {
  baby: { light: "#FBE0B0", base: "#F0C078", dark: "#D9A253", belly: "#FFF4DE", nose: "#5A4130", ear: "#D9A253" },
  teen: { light: "#F2C888", base: "#E3A857", dark: "#C58A3C", belly: "#FBEBCB", nose: "#4A3324", ear: "#B87B31" },
  adult: { light: "#E7B678", base: "#D19A4E", dark: "#B07E35", belly: "#F6E6C6", nose: "#3E2C1E", ear: "#9C6B2C" },
  elder: { light: "#E3DED4", base: "#CDC6BA", dark: "#ABA093", belly: "#F3F0EA", nose: "#5A5048", ear: "#B4A99B" },
};

/** 공통 defs — 부드러운 그림자 + 볼 홍조 + 단계별 몸통 그라데이션. */
function Defs({ id, pal }: { id: string; pal?: (typeof PALETTES)[keyof typeof PALETTES] }) {
  return (
    <defs>
      <radialGradient id={`${id}-body`} cx="42%" cy="32%" r="78%">
        <stop offset="0%" stopColor={pal?.light ?? "#FBF3E0"} />
        <stop offset="62%" stopColor={pal?.base ?? "#F0DDB0"} />
        <stop offset="100%" stopColor={pal?.dark ?? "#E4CB95"} />
      </radialGradient>
      <radialGradient id={`${id}-cheek`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#F79A93" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#F79A93" stopOpacity="0" />
      </radialGradient>
      <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="b" />
        <feOffset in="b" dy="4" result="o" />
        <feComponentTransfer in="o" result="s">
          <feFuncA type="linear" slope="0.28" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="s" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

function Egg({ id }: { id: string }) {
  return (
    <>
      <Defs id={id} />
      <g filter={`url(#${id}-soft)`}>
        <ellipse cx="100" cy="112" rx="62" ry="78" fill={`url(#${id}-body)`} />
        {/* 반점 */}
        <circle cx="74" cy="82" r="10" fill="#D9B476" opacity="0.5" />
        <circle cx="128" cy="150" r="12" fill="#D9B476" opacity="0.45" />
        <circle cx="120" cy="74" r="6" fill="#D9B476" opacity="0.45" />
        <circle cx="70" cy="142" r="7" fill="#D9B476" opacity="0.45" />
        {/* 지그재그 금(크랙) */}
        <path
          d="M40 116 L60 104 L74 120 L92 102 L110 120 L128 102 L144 116 L162 106"
          fill="none"
          stroke="#C58A3C"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* 삐죽 나온 새싹털 */}
        <path d="M100 34 q-4 -14 4 -22 q4 10 -4 22 z" fill="#C58A3C" />
        {/* 광택 */}
        <ellipse cx="78" cy="64" rx="12" ry="22" fill="#FFFFFF" opacity="0.5" transform="rotate(-18 78 64)" />
      </g>
    </>
  );
}

/** 앞모습 강아지 — 팔레트/비율/귀 모양/부가요소로 단계 구분. */
function Dog({
  id,
  pal,
  headR,
  headY,
  bodyRy,
  ear,
  extras,
}: {
  id: string;
  pal: (typeof PALETTES)[keyof typeof PALETTES];
  headR: number;
  headY: number;
  bodyRy: number;
  ear: "floppy" | "point" | "semi";
  extras?: "baby" | "teen" | "elder";
}) {
  const bodyY = 152;
  const bodyRx = headR * 1.08;
  const eyeY = headY - headR * 0.08;
  const eyeDx = headR * 0.4;
  const eyeR = headR * 0.2;
  return (
    <>
      <Defs id={id} pal={pal} />
      <g filter={`url(#${id}-soft)`}>
        {/* 뒷발 */}
        <ellipse cx="74" cy="192" rx="15" ry="9" fill={pal.dark} />
        <ellipse cx="126" cy="192" rx="15" ry="9" fill={pal.dark} />

        {/* 꼬리 */}
        <path
          d={`M${100 + bodyRx * 0.8} ${bodyY} q34 -6 30 -40 q-2 -12 -12 -6 q10 6 2 22 q-8 16 -28 12 z`}
          fill={pal.base}
        />

        {/* 몸 */}
        <ellipse cx="100" cy={bodyY} rx={bodyRx} ry={bodyRy} fill={`url(#${id}-body)`} />
        <ellipse cx="100" cy={bodyY + 10} rx={bodyRx * 0.58} ry={bodyRy * 0.66} fill={pal.belly} />

        {/* 앞발 */}
        <ellipse cx="84" cy={bodyY + bodyRy * 0.72} rx="12" ry="9" fill={pal.belly} />
        <ellipse cx="116" cy={bodyY + bodyRy * 0.72} rx="12" ry="9" fill={pal.belly} />

        {/* 귀 */}
        {ear === "floppy" ? (
          <>
            <ellipse cx={100 - headR * 0.92} cy={headY + 4} rx="17" ry="34" fill={pal.ear} transform={`rotate(-16 ${100 - headR * 0.92} ${headY + 4})`} />
            <ellipse cx={100 + headR * 0.92} cy={headY + 4} rx="17" ry="34" fill={pal.ear} transform={`rotate(16 ${100 + headR * 0.92} ${headY + 4})`} />
          </>
        ) : ear === "point" ? (
          <>
            <path d={`M${100 - headR * 0.7} ${headY - headR * 0.78} L${100 - headR * 1.08} ${headY + headR * 0.2} L${100 - headR * 0.24} ${headY - headR * 0.12} Z`} fill={pal.ear} />
            <path d={`M${100 + headR * 0.7} ${headY - headR * 0.78} L${100 + headR * 1.08} ${headY + headR * 0.2} L${100 + headR * 0.24} ${headY - headR * 0.12} Z`} fill={pal.ear} />
            <path d={`M${100 - headR * 0.66} ${headY - headR * 0.6} L${100 - headR * 0.86} ${headY + headR * 0.04} L${100 - headR * 0.36} ${headY - headR * 0.14} Z`} fill={pal.belly} opacity="0.7" />
            <path d={`M${100 + headR * 0.66} ${headY - headR * 0.6} L${100 + headR * 0.86} ${headY + headR * 0.04} L${100 + headR * 0.36} ${headY - headR * 0.14} Z`} fill={pal.belly} opacity="0.7" />
          </>
        ) : (
          <>
            <path d={`M${100 - headR * 0.82} ${headY - headR * 0.66} Q${100 - headR * 1.16} ${headY - headR * 0.1} ${100 - headR * 0.72} ${headY + headR * 0.5} Q${100 - headR * 0.5} ${headY + headR * 0.1} ${100 - headR * 0.2} ${headY} Z`} fill={pal.ear} />
            <path d={`M${100 + headR * 0.82} ${headY - headR * 0.66} Q${100 + headR * 1.16} ${headY - headR * 0.1} ${100 + headR * 0.72} ${headY + headR * 0.5} Q${100 + headR * 0.5} ${headY + headR * 0.1} ${100 + headR * 0.2} ${headY} Z`} fill={pal.ear} />
          </>
        )}

        {/* 머리 */}
        <circle cx="100" cy={headY} r={headR} fill={`url(#${id}-body)`} />
        {/* 주둥이 영역 */}
        <ellipse cx="100" cy={headY + headR * 0.44} rx={headR * 0.5} ry={headR * 0.38} fill={pal.belly} />

        {/* 볼 홍조(아기) */}
        {extras === "baby" ? (
          <>
            <circle cx={100 - headR * 0.66} cy={headY + headR * 0.28} r="9" fill={`url(#${id}-cheek)`} />
            <circle cx={100 + headR * 0.66} cy={headY + headR * 0.28} r="9" fill={`url(#${id}-cheek)`} />
          </>
        ) : null}

        {/* 눈 — 흰자 + 눈동자 + 하이라이트 */}
        <ellipse cx={100 - eyeDx} cy={eyeY} rx={eyeR * 0.78} ry={eyeR} fill="#fff" />
        <ellipse cx={100 + eyeDx} cy={eyeY} rx={eyeR * 0.78} ry={eyeR} fill="#fff" />
        <circle cx={100 - eyeDx} cy={eyeY + eyeR * 0.14} r={eyeR * 0.62} fill="#2A2018" />
        <circle cx={100 + eyeDx} cy={eyeY + eyeR * 0.14} r={eyeR * 0.62} fill="#2A2018" />
        <circle cx={100 - eyeDx - eyeR * 0.2} cy={eyeY - eyeR * 0.2} r={eyeR * 0.22} fill="#fff" />
        <circle cx={100 + eyeDx - eyeR * 0.2} cy={eyeY - eyeR * 0.2} r={eyeR * 0.22} fill="#fff" />

        {/* 눈썹(어른) */}
        {extras === "elder" ? null : extras === undefined ? (
          <>
            <path d={`M${100 - eyeDx - eyeR * 0.6} ${eyeY - eyeR * 1.15} q${eyeR * 0.6} ${-eyeR * 0.5} ${eyeR * 1.2} 0`} fill="none" stroke={pal.dark} strokeWidth="2.4" strokeLinecap="round" />
            <path d={`M${100 + eyeDx - eyeR * 0.6} ${eyeY - eyeR * 1.15} q${eyeR * 0.6} ${-eyeR * 0.5} ${eyeR * 1.2} 0`} fill="none" stroke={pal.dark} strokeWidth="2.4" strokeLinecap="round" />
          </>
        ) : null}

        {/* 코 */}
        <ellipse cx="100" cy={headY + headR * 0.26} rx={headR * 0.17} ry={headR * 0.12} fill={pal.nose} />
        <ellipse cx={100 - headR * 0.05} cy={headY + headR * 0.22} rx={headR * 0.05} ry={headR * 0.035} fill="#fff" opacity="0.6" />

        {/* 입 + 혀(청소년) */}
        {extras === "teen" ? (
          <path d={`M${100 - 5} ${headY + headR * 0.46} q5 ${headR * 0.34} 10 0 z`} fill="#F0808A" />
        ) : null}
        <path
          d={`M100 ${headY + headR * 0.38} Q${100 - headR * 0.24} ${headY + headR * 0.56} ${100 - headR * 0.3} ${headY + headR * 0.44} M100 ${headY + headR * 0.38} Q${100 + headR * 0.24} ${headY + headR * 0.56} ${100 + headR * 0.3} ${headY + headR * 0.44}`}
          fill="none"
          stroke={pal.nose}
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* 할아버지: 흰 눈썹 + 안경 + 수염 */}
        {extras === "elder" ? (
          <>
            <path d={`M${100 - eyeDx - eyeR * 0.7} ${eyeY - eyeR * 1.3} q${eyeR * 0.7} ${-eyeR * 0.7} ${eyeR * 1.5} 0`} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
            <path d={`M${100 + eyeDx - eyeR * 0.8} ${eyeY - eyeR * 1.3} q${eyeR * 0.7} ${-eyeR * 0.7} ${eyeR * 1.5} 0`} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
            <circle cx={100 - eyeDx} cy={eyeY} r={eyeR * 1.5} fill="none" stroke="#6B675E" strokeWidth="3" />
            <circle cx={100 + eyeDx} cy={eyeY} r={eyeR * 1.5} fill="none" stroke="#6B675E" strokeWidth="3" />
            <line x1={100 - eyeDx + eyeR} y1={eyeY} x2={100 + eyeDx - eyeR} y2={eyeY} stroke="#6B675E" strokeWidth="3" />
            <path d={`M${100 - headR * 0.34} ${headY + headR * 0.6} Q100 ${headY + headR * 1.0} ${100 + headR * 0.34} ${headY + headR * 0.6}`} fill="none" stroke={pal.belly} strokeWidth="7" strokeLinecap="round" />
          </>
        ) : null}
      </g>
    </>
  );
}

function StageArt({ id, stageId }: { id: string; stageId: PetStageId }) {
  switch (stageId) {
    case "egg":
      return <Egg id={id} />;
    case "baby":
      return <Dog id={id} pal={PALETTES.baby} headR={52} headY={92} bodyRy={34} ear="floppy" extras="baby" />;
    case "teen":
      return <Dog id={id} pal={PALETTES.teen} headR={44} headY={86} bodyRy={44} ear="point" extras="teen" />;
    case "adult":
      return <Dog id={id} pal={PALETTES.adult} headR={47} headY={84} bodyRy={47} ear="semi" />;
    case "elder":
      return <Dog id={id} pal={PALETTES.elder} headR={47} headY={84} bodyRy={47} ear="semi" extras="elder" />;
    default:
      return null;
  }
}

/** 진화 단계에 맞는 캐릭터를 size(px, 정사각) 로 렌더. 부드러운 상하 흔들림. */
export function PetCreature({ level, size }: { level: number; size: number }) {
  const stage = petStage(level);
  // gradient/filter id를 단계별로 고정 — 같은 단계면 재사용, 충돌해도 렌더 안전.
  const id = `pet-${stage.id}`;
  return (
    <div className="wolf-idle" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={stage.title}>
        <StageArt id={id} stageId={stage.id} />
      </svg>
    </div>
  );
}