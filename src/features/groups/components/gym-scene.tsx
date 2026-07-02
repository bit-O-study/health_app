/**
 * 플랫 카툰 헬스장 배경(SVG) — 귀여운 강아지 스프라이트 그림체에 맞춘 납작한 카툰 스타일.
 * 가운데는 캐릭터가 서므로 기구는 좌우/뒤에 배치. 컨테이너를 꽉 채운다(slice).
 */
export function GymScene() {
  return (
    <svg
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {/* 벽 */}
      <rect x="0" y="0" width="400" height="180" fill="#ffe9cf" />
      {/* 벽 몰딩 */}
      <rect x="0" y="168" width="400" height="12" fill="#f6d3a8" />
      {/* 바닥(원목) */}
      <rect x="0" y="180" width="400" height="80" fill="#e6c093" />
      <g stroke="#d3a973" strokeWidth="2">
        <line x1="0" y1="205" x2="400" y2="205" />
        <line x1="0" y1="232" x2="400" y2="232" />
        <line x1="70" y1="180" x2="70" y2="205" />
        <line x1="180" y1="205" x2="180" y2="232" />
        <line x1="300" y1="232" x2="300" y2="260" />
      </g>

      {/* 창문 */}
      <g>
        <rect x="150" y="34" width="100" height="72" rx="8" fill="#ffffff" />
        <rect x="156" y="40" width="88" height="60" rx="5" fill="#bfe3ff" />
        <circle cx="228" cy="56" r="9" fill="#fff3b0" />
        <ellipse cx="182" cy="72" rx="16" ry="8" fill="#ffffff" opacity="0.9" />
        <line x1="200" y1="40" x2="200" y2="100" stroke="#ffffff" strokeWidth="4" />
        <line x1="156" y1="70" x2="244" y2="70" stroke="#ffffff" strokeWidth="4" />
      </g>

      {/* 동기부여 포스터 */}
      <g>
        <rect x="40" y="44" width="44" height="56" rx="4" fill="#78c99a" />
        <circle cx="62" cy="62" r="10" fill="#ffffff" />
        <rect x="48" y="80" width="28" height="4" rx="2" fill="#ffffff" opacity="0.9" />
        <rect x="52" y="88" width="20" height="4" rx="2" fill="#ffffff" opacity="0.8" />
      </g>

      {/* 벽시계 */}
      <g>
        <circle cx="316" cy="60" r="16" fill="#ffffff" stroke="#d9b98c" strokeWidth="3" />
        <line x1="316" y1="60" x2="316" y2="50" stroke="#6b7280" strokeWidth="2" />
        <line x1="316" y1="60" x2="324" y2="60" stroke="#6b7280" strokeWidth="2" />
      </g>

      {/* 러닝머신(왼쪽) */}
      <g>
        <rect x="18" y="150" width="70" height="18" rx="6" fill="#3f4756" />
        <rect x="24" y="150" width="58" height="6" rx="3" fill="#5b6472" />
        <rect x="74" y="112" width="10" height="40" rx="4" fill="#59616f" />
        <rect x="64" y="104" width="30" height="12" rx="4" fill="#2c333f" />
      </g>

      {/* 덤벨 랙(오른쪽) */}
      <g>
        <rect x="320" y="140" width="66" height="10" rx="3" fill="#8a94a6" />
        <rect x="320" y="158" width="66" height="10" rx="3" fill="#8a94a6" />
        {[334, 356, 378].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="140" r="7" fill="#3f4756" />
            <circle cx={cx} cy="158" r="7" fill="#3f4756" />
          </g>
        ))}
      </g>

      {/* 벤치 + 바벨(오른쪽 바닥) */}
      <g>
        <rect x="300" y="196" width="60" height="9" rx="4" fill="#4b5563" />
        <rect x="326" y="205" width="8" height="18" fill="#6b7280" />
        <rect x="290" y="188" width="80" height="4" rx="2" fill="#374151" />
        <circle cx="292" cy="190" r="8" fill="#1f2937" />
        <circle cx="368" cy="190" r="8" fill="#1f2937" />
      </g>

      {/* 화분(왼쪽 바닥) */}
      <g>
        <path d="M26 236 h22 l-3 20 h-16 z" fill="#e07a5f" />
        <circle cx="31" cy="230" r="9" fill="#7cbf7c" />
        <circle cx="43" cy="230" r="9" fill="#6fae6f" />
        <circle cx="37" cy="222" r="9" fill="#84c884" />
      </g>

      {/* 요가매트(가운데 바닥, 캐릭터 발밑 느낌) */}
      <rect x="150" y="238" width="100" height="16" rx="8" fill="#f4a6b8" opacity="0.85" />
    </svg>
  );
}
