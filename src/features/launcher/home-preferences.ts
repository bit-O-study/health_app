/** 가운데 홈을 제외한 왼쪽 두 칸, 오른쪽 두 칸. */
export const DEFAULT_DOCK_IDS = ["workout", "diet", "calendar", "groups"] as const;
export function normalizeDock(value: unknown): (string | null)[] {
  if (!Array.isArray(value) || value.length !== 4) return [...DEFAULT_DOCK_IDS];
  const seen = new Set<string>();
  return value.map(id => {
    if (typeof id !== "string" || seen.has(id)) return null;
    seen.add(id);
    return id;
  });
}
/** Move an existing shortcut by swapping slots; a new app replaces the destination. */
export function placeDockApp(ids: (string | null)[], id: string, target: number): (string | null)[] {
  const next = [...ids];
  if (target < 0 || target >= next.length) return next;
  const source = next.indexOf(id);
  if (source === target) return next;
  if (source >= 0) next[source] = next[target];
  next[target] = id;
  return next;
}