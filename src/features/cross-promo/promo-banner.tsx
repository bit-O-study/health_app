"use client";

import { useEffect, useState } from "react";

/** 광고 배너 슬라이드(헬쑤를 뺀 나머지 서비스). 자동 롤링. */
type Slide = {
  emoji: string;
  headline: string;
  sub: string;
  cta: string;
  url: string;
  grad: string;
};

const SLIDES: Slide[] = [
  {
    emoji: "🧠",
    headline: "내 아이큐 몇일까?",
    sub: "멘사식 36문항 · 3분이면 결과 확인",
    cta: "무료 테스트",
    url: "https://iq-test-fuyo-pi.vercel.app",
    grad: "from-indigo-500 to-violet-600",
  },
  {
    emoji: "🍶",
    headline: "그 위스키, 최저가는?",
    sub: "롯데·이마트·코스트코 가격 한눈에",
    cta: "최저가 보기",
    url: "https://whisky-app-vert.vercel.app",
    grad: "from-amber-500 to-orange-600",
  },
];

export function PromoBanner() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (SLIDES.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const s = SLIDES[i];
  return (
    <section className="mt-8">
      <a
        href={s.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r ${s.grad} px-4 py-4 text-white shadow-lg transition active:scale-[0.99] sm:gap-4 sm:px-5`}
      >
        <span className="text-4xl drop-shadow-sm sm:text-5xl" aria-hidden="true">
          {s.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
            AD
          </p>
          <p className="truncate text-base font-black leading-tight sm:text-lg">
            {s.headline}
          </p>
          <p className="truncate text-xs text-white/85 sm:text-sm">{s.sub}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-zinc-900 sm:px-4 sm:py-2 sm:text-sm">
          {s.cta} →
        </span>
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
          {SLIDES.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-4 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      </a>
    </section>
  );
}