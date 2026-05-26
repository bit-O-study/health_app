export type ThemeChoice = "dark" | "light" | "system";

export const THEME_STORAGE_KEY = "heltch.theme";

/** localStorage 에 들어 있는 raw 값을 안전 검증 */
export function isThemeChoice(v: unknown): v is ThemeChoice {
  return v === "dark" || v === "light" || v === "system";
}

/** 시스템 다크 여부 (브라우저 전용) */
export function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/** 선택값을 실제 적용할 모드(dark/light)로 환산 */
export function resolveTheme(choice: ThemeChoice): "dark" | "light" {
  if (choice === "system") return systemPrefersDark() ? "dark" : "light";
  return choice;
}
