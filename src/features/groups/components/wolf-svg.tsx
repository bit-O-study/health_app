/**
 * 직접 그린 SVG 늑대(치비/앞모습) — 이모지 대비 고퀄. 꼬리 흔들기·눈 깜빡임 애니메이션.
 * 레벨이 오르면 목에 반다나/왕관 액세서리가 붙어 성장감을 준다.
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
        <radialGradient id={`${uid}-body`} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#aeb6c4" />
          <stop offset="100%" stopColor="#7b8494" />
        </radialGradient>
        <linearGradient id={`${uid}-belly`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f6fa" />
          <stop offset="100%" stopColor="#dfe4ec" />
        </linearGradient>
      </defs>

      {/* 꼬리 */}
      <g className="wolf-tail" style={{ transformOrigin: "74px 70px" }}>
        <path
          d="M74 70 q18 -2 20 -20 q-14 6 -20 14 z"
          fill={`url(#${uid}-body)`}
          stroke="#6b7280"
          strokeWidth="1"
        />
        <path d="M84 54 q6 4 8 -2 q-4 -1 -8 2 z" fill="#eef1f6" />
      </g>

      {/* 몸통 */}
      <ellipse cx="50" cy="74" rx="25" ry="19" fill={`url(#${uid}-body)`} />
      <ellipse cx="50" cy="80" rx="15" ry="11" fill={`url(#${uid}-belly)`} />
      {/* 다리 */}
      <ellipse cx="38" cy="90" rx="6" ry="5" fill="#6f7889" />
      <ellipse cx="62" cy="90" rx="6" ry="5" fill="#6f7889" />

      {/* 목 액세서리(레벨 성장) */}
      {level >= 3 ? (
        <rect x="38" y="60" width="24" height="6" rx="3" fill="#ef4444" />
      ) : null}

      {/* 귀 */}
      <path d="M28 24 L38 6 L46 26 Z" fill={`url(#${uid}-body)`} />
      <path d="M72 24 L62 6 L54 26 Z" fill={`url(#${uid}-body)`} />
      <path d="M33 22 L38 12 L42 24 Z" fill="#f6b9c6" />
      <path d="M67 22 L62 12 L58 24 Z" fill="#f6b9c6" />

      {/* 머리 */}
      <circle cx="50" cy="42" r="26" fill={`url(#${uid}-body)`} />
      {/* 얼굴 밝은 영역 */}
      <path
        d="M50 24 q22 4 20 24 q-2 20 -20 22 q-18 -2 -20 -22 q-2 -20 20 -24 z"
        fill={`url(#${uid}-belly)`}
        opacity="0.95"
      />
      {/* 볼터치 */}
      <ellipse cx="32" cy="50" rx="4" ry="2.6" fill="#f7b7c6" opacity="0.85" />
      <ellipse cx="68" cy="50" rx="4" ry="2.6" fill="#f7b7c6" opacity="0.85" />

      {/* 눈(깜빡임) */}
      <g className="wolf-blink" style={{ transformOrigin: "50px 42px" }}>
        <ellipse cx="40" cy="42" rx="4.2" ry="5.4" fill="#2b2f38" />
        <ellipse cx="60" cy="42" rx="4.2" ry="5.4" fill="#2b2f38" />
        <circle cx="41.4" cy="40" r="1.4" fill="#fff" />
        <circle cx="61.4" cy="40" r="1.4" fill="#fff" />
      </g>

      {/* 코 + 입 */}
      <path d="M46 50 L54 50 L50 55 Z" fill="#33373f" />
      <path
        d="M50 55 q-4 5 -8 3 M50 55 q4 5 8 3"
        fill="none"
        stroke="#5b6373"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* 왕관(고레벨) */}
      {level >= 8 ? (
        <path
          d="M36 14 L42 22 L50 12 L58 22 L64 14 L62 24 L38 24 Z"
          fill="#fbbf24"
          stroke="#d97706"
          strokeWidth="1"
        />
      ) : null}
    </svg>
  );
}
