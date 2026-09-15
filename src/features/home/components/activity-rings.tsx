import type { Ring, RingKey } from "@/features/home/activity-rings";

/** 링 색 — 운동(브랜드)·식단(주의색)·다짐(정보색). 모두 토큰이라 다크에서 알아서 바뀐다. */
export const RING_COLOR: Record<RingKey, string> = {
  workout: "var(--brand)",
  diet: "var(--warn)",
  commit: "var(--info)",
};

/**
 * 동심원 활동 링 3개(바깥 → 안: 운동 · 식단 · 다짐). 서버 컴포넌트 — 숫자만 받아 그린다.
 * 트랙(옅은 링) 위에 진행 링을 둥근 끝으로 겹친다.
 */
export function ActivityRings({ rings, size = 132 }: { rings: Ring[]; size?: number }) {
  const stroke = size * 0.105;
  const gap = stroke * 0.28;
  const c = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={rings.map((r) => `${r.label} ${r.pct}%`).join(", ")}
      className="shrink-0 -rotate-90"
    >
      {rings.map((ring, i) => {
        const r = c - stroke / 2 - i * (stroke + gap);
        const len = 2 * Math.PI * r;
        const color = RING_COLOR[ring.key];
        return (
          <g key={ring.key}>
            <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={stroke} />
            {ring.pct > 0 ? (
              <circle
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${(len * ring.pct) / 100} ${len}`}
                className="transition-[stroke-dasharray] duration-700"
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
