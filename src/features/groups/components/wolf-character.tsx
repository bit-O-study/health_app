"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

import { WolfSvg } from "@/features/groups/components/wolf-svg";

/**
 * 헬스장 늑대 캐릭터 — 애셋 우선순위: 실사 이미지/움짤 → Lottie → (없으면) SVG 폴백.
 *   1) public/wolf/wolf.png  (실사 렌더/사진/움짤: png·apng·gif·webp 를 이 이름으로)
 *   2) public/wolf/wolf.json (Lottie 애니메이션)
 *   3) 코드로 그린 SVG 늑대(임시)
 * 애셋만 넣으면 코드 수정 없이 자동 교체된다. (public/wolf/README.md 참고)
 */
const IMG_URL = "/wolf/wolf.png";
const JSON_URL = "/wolf/wolf.json";

type Kind = "loading" | "img" | "lottie" | "svg";
let cachedKind: Kind | null = null;
let cachedLottie: object | null = null;

export function WolfCharacter({
  size = 44,
  level = 0,
}: {
  size?: number;
  level?: number;
}) {
  const [kind, setKind] = useState<Kind>(cachedKind ?? "loading");
  const [lottie, setLottie] = useState<object | null>(cachedLottie);

  useEffect(() => {
    if (cachedKind) {
      setKind(cachedKind);
      setLottie(cachedLottie);
      return;
    }
    if (typeof window === "undefined") return;
    let on = true;

    const useSvg = () => {
      cachedKind = "svg";
      if (on) setKind("svg");
    };
    const tryLottie = async () => {
      try {
        const r = await fetch(JSON_URL);
        if (r.ok) {
          const j = (await r.json()) as object;
          cachedLottie = j;
          cachedKind = "lottie";
          if (on) {
            setLottie(j);
            setKind("lottie");
          }
          return;
        }
      } catch {
        /* 무시 */
      }
      useSvg();
    };

    const img = new window.Image();
    img.onload = () => {
      cachedKind = "img";
      if (on) setKind("img");
    };
    img.onerror = () => {
      void tryLottie();
    };
    img.src = IMG_URL;

    return () => {
      on = false;
    };
  }, []);

  if (kind === "img") {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={IMG_URL}
        alt="늑대"
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }
  if (kind === "lottie" && lottie) {
    return (
      <div style={{ width: size, height: size }}>
        <Lottie
          animationData={lottie}
          loop
          autoplay
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    );
  }
  return <WolfSvg size={size} level={level} />;
}
