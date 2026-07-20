export type WeatherCategory = "clear" | "clouds" | "rain" | "snow" | "thunder" | "fog";

const CATEGORIES: readonly WeatherCategory[] = [
  "clear",
  "clouds",
  "rain",
  "snow",
  "thunder",
  "fog",
];

export function isWeatherCategory(v: unknown): v is WeatherCategory {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

/** Open-Meteo WMO 날씨 코드 → 카테고리. https://open-meteo.com/en/docs */
export function categoryFromCode(code: number): WeatherCategory {
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "clouds";
  if (code === 45 || code === 48) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "thunder";
  return "clouds";
}

/**
 * 세션 캐시(문자열, sessionStorage 원본)에서 아직 신선한(freshMs 이내) 날씨 카테고리를
 * 읽는다. 없거나 형식이 깨졌거나 오래됐으면 null(다시 위치·API 조회가 필요하다는 뜻).
 * 홈에 다시 올 때마다 위치 권한 협상 + Open-Meteo 호출을 반복하던 걸 줄이기 위함.
 */
export function readFreshWeatherCache(
  raw: string | null,
  now: number,
  freshMs: number,
): WeatherCategory | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { category, ts } = parsed as { category?: unknown; ts?: unknown };
  if (!isWeatherCategory(category)) return null;
  if (typeof ts !== "number" || !Number.isFinite(ts)) return null;
  if (now - ts > freshMs) return null;
  return category;
}
