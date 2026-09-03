export const LIGHT_MODE_KEY = "heltch.performance.lightMode";
export const LIGHT_MODE_EVENT = "heltch:light-mode-change";

export type LightModePreference = "auto" | "light";

export type PerformanceHints = {
  deviceMemory?: number;
  cores?: number;
  reducedMotion?: boolean;
};

export function parseLightModePreference(value: string | null): LightModePreference {
  return value === "light" ? "light" : "auto";
}

export function resolveLightMode(
  preference: LightModePreference,
  hints: PerformanceHints,
): boolean {
  return (
    preference === "light" ||
    hints.reducedMotion === true ||
    (typeof hints.deviceMemory === "number" && hints.deviceMemory < 4) ||
    (typeof hints.cores === "number" && hints.cores <= 4)
  );
}

export function detectLightMode(): boolean {
  if (typeof window === "undefined") return false;

  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  const preference = parseLightModePreference(window.localStorage.getItem(LIGHT_MODE_KEY));

  return resolveLightMode(preference, {
    deviceMemory: navigatorWithMemory.deviceMemory,
    cores: navigator.hardwareConcurrency,
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  });
}

export function saveLightModePreference(preference: LightModePreference): void {
  window.localStorage.setItem(LIGHT_MODE_KEY, preference);
  window.dispatchEvent(new Event(LIGHT_MODE_EVENT));
}
