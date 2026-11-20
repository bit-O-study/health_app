/** 예전 설정은 숨긴 앱 배열이다. 그때 없던 고객센터는 직접 추가할 때까지 숨긴다. */
export function readHiddenApps(stored: string): string[] {
  try {
    const saved = JSON.parse(stored);
    const legacy = Array.isArray(saved);
    const ids: unknown = legacy ? saved : saved?.hidden;
    if (Array.isArray(ids)) {
      const hidden = ids.filter((id): id is string => typeof id === "string");
      return legacy ? [...new Set([...hidden, "support"])] : hidden;
    }
  } catch { /* 처음 방문했거나 저장값이 손상된 경우 */ }
  return ["support"];
}

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
