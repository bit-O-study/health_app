"use client";

/**
 * 그룹 펫 캐릭터 — 진화 단계별 인라인 SVG 강아지(+알).
 * 이미지 파일/원격 에셋 없이(WebView CSP·오프라인 안전) 벡터로 그린다.
 * 아이템(썬그라스 등) 오버레이가 사라져 정렬 틀어짐 문제도 원천 제거.
 *
 * 단계: 알 🥚 → 아기 🐶 → 청소년 🐕 → 어른 🦮 → 할아버지 🐕‍🦺
 */

import { petStage, type PetStageId } from "@/features/groups/evolution";

const DOG = {
  body: "#E3A857",
  dark: "#C88A3E",
  belly: "#F6E3BE",
  nose: "#4A3728",
  eye: "#3A2A1A",
};
const ELDER = {
  body: "#CDC7BE",
  dark: "#AAA49B",
  belly: "#EFECE6",
  nose: "#5A5048",
  eye: "#3A362F",
};

function Egg() {
  return (
    <g>
      <ellipse cx="100" cy="112" rx="60" ry="76" fill="#FBF3E0" />
      <ellipse cx="100" cy="112" rx="60" ry="76" fill="none" stroke="#EAD9B4" strokeWidth="2" />
      {/* 반점 */}
      <circle cx="74" cy="80" r="10" fill="#DCBA82" opacity="0.55" />
      <circle cx="126" cy="150" r="12" fill="#DCBA82" opacity="0.5" />
      <circle cx="118" cy="72" r="6" fill="#DCBA82" opacity="0.5" />
      <circle cx="70" cy="140" r="7" fill="#DCBA82" opacity="0.5" />
      {/* 금(크랙) */}
      <path
        d="M42 118 L60 106 L74 120 L92 104 L110 120 L128 104 L142 118 L160 108"
        fill="none"
        stroke="#C88A3E"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* 광택 */}
      <ellipse cx="78" cy="66" rx="11" ry="20" fill="#FFFFFF" opacity="0.5" transform="rotate(-18 78 66)" />
    </g>
  );
}

/** 앞모습 강아지 — 팔레트/비율/귀 모양/부가요소로 단계 구분. */
function Dog({
  pal,
  headR,
  headY,
  bodyRy,
  ear,
  extras,
}: {
  pal: typeof DOG;
  headR: number;
  headY: number;
  bodyRy: number;
  ear: "floppy" | "point" | "semi";
  extras?: "baby" | "teen" | "elder";
}) {
  const bodyY = 150;
  const bodyRx = headR * 1.05;
  return (
    <g>
      {/* 뒷다리/발 */}
      <ellipse cx="76" cy="188" rx="13" ry="8" fill={pal.belly} />
      <ellipse cx="124" cy="188" rx="13" ry="8" fill={pal.belly} />
      {/* 몸 */}
      <ellipse cx="100" cy={bodyY} rx={bodyRx} ry={bodyRy} fill={pal.body} />
      <ellipse cx="100" cy={bodyY + 8} rx={bodyRx * 0.6} ry={bodyRy * 0.68} fill={pal.belly} />

      {/* 귀 */}
      {ear === "floppy" ? (
        <>
          <ellipse cx={100 - headR * 0.9} cy={headY} rx="15" ry="30" fill={pal.dark} transform={`rotate(-14 ${100 - headR * 0.9} ${headY})`} />
          <ellipse cx={100 + headR * 0.9} cy={headY} rx="15" ry="30" fill={pal.dark} transform={`rotate(14 ${100 + headR * 0.9} ${headY})`} />
        </>
      ) : ear === "point" ? (
        <>
          <path d={`M${100 - headR * 0.75} ${headY - headR * 0.7} L${100 - headR * 1.05} ${headY + headR * 0.15} L${100 - headR * 0.28} ${headY - headR * 0.15} Z`} fill={pal.dark} />
          <path d={`M${100 + headR * 0.75} ${headY - headR * 0.7} L${100 + headR * 1.05} ${headY + headR * 0.15} L${100 + headR * 0.28} ${headY - headR * 0.15} Z`} fill={pal.dark} />
        </>
      ) : (
        <>
          <path d={`M${100 - headR * 0.8} ${headY - headR * 0.6} L${100 - headR * 1.05} ${headY + headR * 0.4} L${100 - headR * 0.2} ${headY} Z`} fill={pal.dark} />
          <path d={`M${100 + headR * 0.8} ${headY - headR * 0.6} L${100 + headR * 1.05} ${headY + headR * 0.4} L${100 + headR * 0.2} ${headY} Z`} fill={pal.dark} />
        </>
      )}

      {/* 머리 */}
      <circle cx="100" cy={headY} r={headR} fill={pal.body} />
      {/* 주둥이 */}
      <ellipse cx="100" cy={headY + headR * 0.42} rx={headR * 0.46} ry={headR * 0.34} fill={pal.belly} />

      {/* 볼터치(아기) */}
      {extras === "baby" ? (
        <>
          <circle cx={100 - headR * 0.68} cy={headY + headR * 0.28} r="7" fill="#F6A6A0" opacity="0.5" />
          <circle cx={100 + headR * 0.68} cy={headY + headR * 0.28} r="7" fill="#F6A6A0" opacity="0.5" />
        </>
      ) : null}

      {/* 눈 */}
      <circle cx={100 - headR * 0.38} cy={headY - headR * 0.1} r={headR * 0.18} fill={pal.eye} />
      <circle cx={100 + headR * 0.38} cy={headY - headR * 0.1} r={headR * 0.18} fill={pal.eye} />
      <circle cx={100 - headR * 0.33} cy={headY - headR * 0.18} r={headR * 0.06} fill="#fff" />
      <circle cx={100 + headR * 0.43} cy={headY - headR * 0.18} r={headR * 0.06} fill="#fff" />

      {/* 코 */}
      <ellipse cx="100" cy={headY + headR * 0.24} rx={headR * 0.15} ry={headR * 0.1} fill={pal.nose} />

      {/* 입 / 혀(청소년) */}
      {extras === "teen" ? (
        <path d={`M${100 - 4} ${headY + headR * 0.42} Q100 ${headY + headR * 0.72} ${100 + 4} ${headY + headR * 0.42} Z`} fill="#F08080" />
      ) : null}
      <path
        d={`M100 ${headY + headR * 0.34} Q100 ${headY + headR * 0.5} ${100 - headR * 0.22} ${headY + headR * 0.52} M100 ${headY + headR * 0.34} Q100 ${headY + headR * 0.5} ${100 + headR * 0.22} ${headY + headR * 0.52}`}
        fill="none"
        stroke={pal.nose}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* 할아버지: 흰 눈썹 + 동그란 안경 + 수염 */}
      {extras === "elder" ? (
        <>
          <ellipse cx={100 - headR * 0.38} cy={headY - headR * 0.4} rx="11" ry="5" fill="#fff" transform={`rotate(-8 ${100 - headR * 0.38} ${headY - headR * 0.4})`} />
          <ellipse cx={100 + headR * 0.38} cy={headY - headR * 0.4} rx="11" ry="5" fill="#fff" transform={`rotate(8 ${100 + headR * 0.38} ${headY - headR * 0.4})`} />
          <circle cx={100 - headR * 0.38} cy={headY - headR * 0.1} r={headR * 0.3} fill="none" stroke="#5A5750" strokeWidth="3" />
          <circle cx={100 + headR * 0.38} cy={headY - headR * 0.1} r={headR * 0.3} fill="none" stroke="#5A5750" strokeWidth="3" />
          <line x1={100 - headR * 0.08} y1={headY - headR * 0.1} x2={100 + headR * 0.08} y2={headY - headR * 0.1} stroke="#5A5750" strokeWidth="3" />
          <path d={`M${100 - headR * 0.3} ${headY + headR * 0.6} Q100 ${headY + headR * 0.95} ${100 + headR * 0.3} ${headY + headR * 0.6} Q100 ${headY + headR * 0.78} 100 ${headY + headR * 0.78} Z`} fill={pal.belly} />
        </>
      ) : null}
    </g>
  );
}

function StageArt({ id }: { id: PetStageId }) {
  switch (id) {
    case "egg":
      return <Egg />;
    case "baby":
      return <Dog pal={DOG} headR={50} headY={90} bodyRy={34} ear="floppy" extras="baby" />;
    case "teen":
      return <Dog pal={DOG} headR={42} headY={84} bodyRy={44} ear="point" extras="teen" />;
    case "adult":
      return <Dog pal={DOG} headR={46} headY={82} bodyRy={46} ear="semi" />;
    case "elder":
      return <Dog pal={ELDER} headR={46} headY={82} bodyRy={46} ear="semi" extras="elder" />;
    default:
      return null;
  }
}

/** 진화 단계에 맞는 캐릭터를 size(px, 정사각) 로 렌더. 부드러운 상하 흔들림. */
export function PetCreature({ level, size }: { level: number; size: number }) {
  const stage = petStage(level);
  return (
    <div className="wolf-idle" style={{ width: size, height: size }} aria-hidden="true">
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role="img"
        aria-label={stage.title}
      >
        <StageArt id={stage.id} />
      </svg>
    </div>
  );
}