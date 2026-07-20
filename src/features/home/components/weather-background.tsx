"use client";

import { useEffect, useState } from "react";

import {
  categoryFromCode,
  readFreshWeatherCache,
  type WeatherCategory,
} from "@/features/home/weather-cache";

/** 위치 권한이 없거나 실패하면 서울 좌표로 대체. */
const SEOUL = { lat: 37.5665, lon: 126.978 };

const CACHE_KEY = "hx_weather_cache";
// 홈에 다시 올 때마다 위치 권한 협상 + Open-Meteo 호출을 반복하지 않게(최적화#34).
// 날씨는 자주 안 바뀌므로 20분이면 충분히 신선.
const FRESH_MS = 20 * 60 * 1000;

function cachedCategory(): WeatherCategory | null {
  if (typeof window === "undefined") return null;
  try {
    return readFreshWeatherCache(
      window.sessionStorage.getItem(CACHE_KEY),
      Date.now(),
      FRESH_MS,
    );
  } catch {
    return null; // sessionStorage 접근 불가(프라이빗 모드 등) — 조용히 무시.
  }
}

function writeCache(category: WeatherCategory) {
  try {
    window.sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ category, ts: Date.now() }),
    );
  } catch {
    /* 저장 실패는 무시 — 다음에 다시 조회하면 그만 */
  }
}

/** 다크모드는 기존 디자인 톤(짙은 #0a0a0b 근처)을 유지하면서 색만 은은하게 섞는다. */
const GRADIENT: Record<WeatherCategory, { light: string; dark: string }> = {
  clear: {
    light: "linear-gradient(180deg,#bfe3ff 0%,#fef3c7 55%,#fde68a 100%)",
    dark: "linear-gradient(180deg,#0a0a0b 0%,#111827 55%,#1e293b 100%)",
  },
  clouds: {
    light: "linear-gradient(180deg,#dbe2ea 0%,#eef1f4 100%)",
    dark: "linear-gradient(180deg,#0a0a0b 0%,#18181b 100%)",
  },
  rain: {
    light: "linear-gradient(180deg,#93a7bb 0%,#c7d2dd 100%)",
    dark: "linear-gradient(180deg,#050708 0%,#0f172a 100%)",
  },
  snow: {
    light: "linear-gradient(180deg,#eaf4ff 0%,#ffffff 100%)",
    dark: "linear-gradient(180deg,#0a0a0b 0%,#151a22 100%)",
  },
  thunder: {
    light: "linear-gradient(180deg,#5b6b7c 0%,#8a97a6 100%)",
    dark: "linear-gradient(180deg,#020204 0%,#150f2e 100%)",
  },
  fog: {
    light: "linear-gradient(180deg,#d9dadd 0%,#eceef0 100%)",
    dark: "linear-gradient(180deg,#0a0a0b 0%,#1a1a1d 100%)",
  },
};

/**
 * 홈 배경 — 오늘 날씨(위치 권한 있으면 현재 위치, 없으면 서울) 기준으로 은은하게 바뀐다.
 * Open-Meteo(무료·키 불필요) 사용. 실패하면 조용히 기본(흐림) 배경 유지.
 * 세션 캐시(20분)로 홈을 재방문할 때마다 위치 권한 협상·API 호출을 반복하지 않는다.
 */
export function WeatherBackground() {
  const [category, setCategory] = useState<WeatherCategory>(
    () => cachedCategory() ?? "clouds",
  );

  useEffect(() => {
    // 세션 캐시가 아직 신선하면 위치 권한 요청·API 호출을 생략.
    if (cachedCategory()) return;

    let cancelled = false;

    const load = async (lat: number, lon: number) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { current?: { weather_code?: number } };
        const code = Number(data.current?.weather_code);
        if (!cancelled && Number.isFinite(code)) {
          const next = categoryFromCode(code);
          setCategory(next);
          writeCache(next);
        }
      } catch {
        // 네트워크 실패는 조용히 무시 — 기본 배경 유지.
      }
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => load(pos.coords.latitude, pos.coords.longitude),
        () => load(SEOUL.lat, SEOUL.lon),
        { timeout: 4000, maximumAge: 30 * 60 * 1000 },
      );
    } else {
      load(SEOUL.lat, SEOUL.lon);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const g = GRADIENT[category];
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 transition-colors duration-700"
    >
      <div className="absolute inset-0 dark:hidden" style={{ background: g.light }} />
      <div className="absolute inset-0 hidden dark:block" style={{ background: g.dark }} />
    </div>
  );
}
