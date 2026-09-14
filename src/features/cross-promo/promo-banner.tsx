"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

/** 광고 슬라이드(헬쑤를 뺀 나머지 서비스). 자동 롤링. */
type Slide = {
  image: string;
  headline: string;
  sub: string;
  cta: string;
  url: string;
};

const SLIDES: Slide[] = [
  {
    image: "/promo/iq-test-photo.webp",
    headline: "내 아이큐 몇일까?",
    sub: "멘사식 36문항 정밀 지능검사",
    cta: "무료 테스트",
    url: "https://iq-test-fuyo-pi.vercel.app",
  },
  {
    image: "/promo/whisky-price-photo.webp",
    headline: "그 위스키, 최저가는?",
    sub: "롯데·이마트·코스트코 가격 한눈에",
    cta: "최저가 보기",
    url: "https://whisky-app-vert.vercel.app",
  },
];

/** 자동 롤링 간격. */
export const PROMO_ROTATE_MS = 4500;

/**
 * 홈 **맨 아래** 광고 한 줄.
 *
 * 예전엔 홈 맨 위에 154px 사진 배너로 떠서, 내 기록보다 광고가 먼저 보였다.
 * 2026-09-14 화면 간결화에서 사용자가 "맨 아래 한 줄"로 정했다 — 다른 카드와
 * 같은 모양(app-card)이라 화면 흐름을 끊지 않는다.
 */
export function PromoBanner() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (
      SLIDES.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const t = setInterval(
      () => setI((v) => (v + 1) % SLIDES.length),
      PROMO_ROTATE_MS,
    );
    return () => clearInterval(t);
  }, []);

  const s = SLIDES[i];
  return (
    <section aria-label="함께하는 서비스" data-testid="promo-banner">
      <a
        href={s.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${s.headline} — ${s.cta}`}
        className="app-card flex items-center gap-3 py-2.5 pl-2.5 pr-3 transition active:scale-[0.99]"
      >
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[10px] bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={s.image}
            alt=""
            fill
            sizes="40px"
            className="object-cover"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {s.headline}
          </span>
          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
            AD · {s.sub}
          </span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-brand">
          {s.cta}
        </span>
        <ChevronRight
          aria-hidden="true"
          size={16}
          className="-ml-2 shrink-0 text-zinc-400"
        />
      </a>
    </section>
  );
}
