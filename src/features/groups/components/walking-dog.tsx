"use client";

import { useEffect, useRef, useState } from "react";

import { SpriteWolf } from "@/features/groups/components/sprite-wolf";

// 헬스장 안(가로·세로 %)에서만 배회 — 화면 밖으로 안 나간다. y 는 바닥 영역(top %).
const XMIN = 5;
const XMAX = 80;
const YMIN = 48; // 위(멀리)
const YMAX = 82; // 아래(가까이)

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** 헬스장 안에서 위아래·좌우로 자유롭게 배회하는 강아지(방향에 따라 좌우 반전). */
export function WalkingDog({
  size,
  label,
  zIndex = 20,
  seed = 0,
}: {
  size: number;
  label?: string;
  zIndex?: number;
  seed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // 초기 위치는 렌더 중 ref 를 읽지 않도록 state 로 한 번만 고정.
  const [init] = useState(() => ({ x: rand(XMIN, XMAX), y: rand(YMIN, YMAX) }));
  const st = useRef({
    x: init.x,
    y: init.y,
    tx: init.x,
    ty: init.y,
    speed: 9 + (seed % 5) * 2, // %/초
    last: 0,
  });
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    let raf = 0;
    const pickTarget = () => {
      const s = st.current;
      s.tx = rand(XMIN, XMAX);
      s.ty = rand(YMIN, YMAX);
      setFlip(s.tx < s.x); // 왼쪽으로 가면 반전
    };
    pickTarget();
    const tick = (t: number) => {
      const s = st.current;
      if (!s.last) s.last = t;
      const dt = Math.min(0.05, (t - s.last) / 1000);
      s.last = t;
      const dx = s.tx - s.x;
      const dy = s.ty - s.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1.2) {
        pickTarget();
      } else {
        s.x += (dx / dist) * s.speed * dt;
        s.y += (dy / dist) * s.speed * dt;
      }
      if (ref.current) {
        ref.current.style.left = `${s.x}%`;
        ref.current.style.top = `${s.y}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={ref}
      className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
      style={{ left: `${init.x}%`, top: `${init.y}%`, zIndex }}
    >
      <SpriteWolf size={size} flip={flip} />
      {label ? (
        <span className="-mt-1 whitespace-nowrap rounded-full bg-white/85 px-1.5 text-[9px] font-bold text-zinc-600 shadow-sm dark:bg-zinc-800/85 dark:text-zinc-300">
          {label}
        </span>
      ) : null}
    </div>
  );
}
