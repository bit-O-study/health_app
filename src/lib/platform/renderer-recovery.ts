import { shouldRestoreRoute, type SavedRoute } from "@/lib/platform/route-restore";

export const RECOVERY_EVENT_MAX_AGE_MS = 5 * 60 * 1000;

export type RendererRecoveryEvent = {
  mode: "restore_once" | "safe_home";
  occurredAt: number;
  count: number;
  didCrash: boolean;
};

export function parseRendererRecovery(
  raw: string | null,
  now: number,
): RendererRecoveryEvent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<RendererRecoveryEvent>;
    if (
      (value.mode !== "restore_once" && value.mode !== "safe_home") ||
      typeof value.occurredAt !== "number" ||
      typeof value.count !== "number" ||
      typeof value.didCrash !== "boolean" ||
      now < value.occurredAt ||
      now - value.occurredAt >= RECOVERY_EVENT_MAX_AGE_MS
    ) {
      return null;
    }
    return value as RendererRecoveryEvent;
  } catch {
    return null;
  }
}

export function decideRendererRecovery(
  event: RendererRecoveryEvent | null,
  saved: SavedRoute | null,
  currentPath: string,
  now: number,
) {
  if (event?.mode === "safe_home") {
    return {
      targetPath: "/home",
      clearSavedRoute: true,
      notice: "화면 오류가 반복되어 홈으로 안전하게 이동했어요.",
    };
  }

  const targetPath = shouldRestoreRoute(saved, currentPath, now) ? saved!.path : null;
  return {
    targetPath,
    clearSavedRoute: false,
    notice: event?.mode === "restore_once" ? "앱 화면을 복구했어요." : null,
  };
}
