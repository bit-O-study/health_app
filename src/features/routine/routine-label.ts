/**
 * 루틴 표시 라벨 — '분할명 · 변형명' 조합. 변형명이 분할명을 이미 포함하면
 * 중복을 제거한다(예: '커스텀' · '커스텀 루틴' → '커스텀 루틴').
 */
export function routineDisplayLabel(
  presetLabel: string | null | undefined,
  variantName: string | null | undefined,
): string {
  const p = (presetLabel ?? "").trim();
  const v = (variantName ?? "").trim();
  if (!p) return v;
  if (!v) return p;
  if (v === p || v.startsWith(p)) return v; // 중복 → 변형명만
  return `${p} · ${v}`;
}
