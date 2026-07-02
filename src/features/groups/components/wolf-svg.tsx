/**
 * 모찌 늑대 — 동글동글 통통한 카와이 늑대(앞모습 2D). 왕눈이·볼터치·꼬물 손발.
 * 레벨이 오르면 목 반다나/왕관이 붙는다. (에셋 오면 wolf-character 가 교체)
 */
export function WolfSvg({
  size = 44,
  level = 0,
  className = "",
}: {
  size?: number;
  level?: number;
  className?: string;
}) {
  const uid = `w${Math.round(size)}-${level}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${uid}-b`} cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#cfd5e2" />
          <stop offset="100%" stopColor="#9ca4b6" />
        </radialGradient>
        <linearGradient id={`${uid}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef1f7" />
        </linearGradient>
      </defs>

      {/* 꼬리(옆으로 살짝) */}
      <g className="wolf-tail" style={{ transformOrigin: "82px 72px" }}>
        <path d="M80 72 q18 4 16 -12 q-3 -8 -11 -6 q6 8 -1 16 z" fill={`url(#${uid}-b)`} />
        <path d="M88 56 q6 2 6 -3 q-4 -1 -6 3 z" fill="#f3f5fa" />
      </g>

      {/* 귀 */}
      <path d="M26 34 q-6 -18 12 -20 q4 12 0 24 q-8 2 -12 -4 z" fill={`url(#${uid}-b)`} />
      <path d="M74 34 q6 -18 -12 -20 q-4 12 0 24 q8 2 12 -4 z" fill={`url(#${uid}-b)`} />
      <path d="M31 30 q-2 -10 8 -11 q2 7 0 15 q-5 1 -8 -4 z" fill="#f7b7cb" />
      <path d="M69 30 q2 -10 -8 -11 q-2 7 0 15 q5 1 8 -4 z" fill="#f7b7cb" />

      {/* 통통 몸통(머리+몸 하나로 동글) */}
      <ellipse cx="50" cy="56" rx="34" ry="33" fill={`url(#${uid}-b)`} />
      {/* 손발(꼬물) */}
      <ellipse cx="20" cy="64" rx="6" ry="7" fill={`url(#${uid}-b)`} />
      <ellipse cx="80" cy="64" rx="6" ry="7" fill={`url(#${uid}-b)`} />
      <ellipse cx="38" cy="88" rx="7" ry="5" fill="#8890a1" />
      <ellipse cx="62" cy="88" rx="7" ry="5" fill="#8890a1" />

      {/* 밝은 배/얼굴 패치 */}
      <ellipse cx="50" cy="62" rx="24" ry="24" fill={`url(#${uid}-f)`} />

      {/* 목 액세서리(레벨) */}
      {level >= 3 ? (
        <path d="M30 52 q20 10 40 0 l-3 7 q-17 8 -34 0 z" fill="#ef5a6a" />
      ) : null}

      {/* 볼터치 */}
      <ellipse cx="28" cy="58" rx="5.5" ry="3.4" fill="#f9b3c6" opacity="0.9" />
      <ellipse cx="72" cy="58" rx="5.5" ry="3.4" fill="#f9b3c6" opacity="0.9" />

      {/* 왕눈이(깜빡임) */}
      <g className="wolf-blink" style={{ transformOrigin: "50px 50px" }}>
        <ellipse cx="38" cy="50" rx="6.2" ry="8.2" fill="#2b2f38" />
        <ellipse cx="62" cy="50" rx="6.2" ry="8.2" fill="#2b2f38" />
        <circle cx="40" cy="47" r="2.5" fill="#fff" />
        <circle cx="64" cy="47" r="2.5" fill="#fff" />
        <circle cx="36.5" cy="53" r="1.2" fill="#fff" />
        <circle cx="60.5" cy="53" r="1.2" fill="#fff" />
      </g>

      {/* 코 + 방긋 입 */}
      <ellipse cx="50" cy="59" rx="2.8" ry="2.1" fill="#3a3f4b" />
      <path
        d="M50 61 q-3.5 4 -7 1.5 M50 61 q3.5 4 7 1.5"
        fill="none"
        stroke="#6b7280"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* 왕관(고레벨) */}
      {level >= 8 ? (
        <path
          d="M34 14 L42 22 L50 11 L58 22 L66 14 L64 26 L36 26 Z"
          fill="#fbbf24"
          stroke="#e08e0b"
          strokeWidth="1"
        />
      ) : null}
    </svg>
  );
}
