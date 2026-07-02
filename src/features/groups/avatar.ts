/** 랭킹 아바타 — 이름 이니셜 + 결정적 색상. 순수 로직(테스트 가능). */

/** 이름 첫 글자(이모지/한글/영문 안전). 없으면 "?". */
export function memberInitial(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return [...t][0].toUpperCase();
}

const PALETTE = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-fuchsia-500",
] as const;

/** 이름 기반 결정적 아바타 배경색 클래스(같은 이름 → 항상 같은 색). */
export function avatarColorClass(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** #1 대비 상대 막대 길이(%). 1위=100, kcal 0/최댓값 0이면 0. */
export function relativeBarPct(kcal: number, topKcal: number): number {
  if (topKcal <= 0 || kcal <= 0) return 0;
  return Math.max(4, Math.min(100, Math.round((kcal / topKcal) * 100)));
}

// 아기자기 귀여운 동물 캐릭터 — 이름 기반으로 고정 배정(같은 이름 → 늘 같은 캐릭터).
const CHARACTERS = [
  "🐰",
  "🐻",
  "🐱",
  "🐶",
  "🐥",
  "🐸",
  "🐼",
  "🦊",
  "🐯",
  "🐨",
  "🐹",
  "🐷",
] as const;

export function characterEmoji(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CHARACTERS[h % CHARACTERS.length];
}

// 캐릭터 뒤 파스텔 배경(부드럽고 귀엽게).
const PASTELS = [
  "bg-rose-100 dark:bg-rose-950/40",
  "bg-amber-100 dark:bg-amber-950/40",
  "bg-emerald-100 dark:bg-emerald-950/40",
  "bg-sky-100 dark:bg-sky-950/40",
  "bg-violet-100 dark:bg-violet-950/40",
  "bg-teal-100 dark:bg-teal-950/40",
] as const;

export function pastelClass(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 17 + seed.charCodeAt(i)) >>> 0;
  return PASTELS[h % PASTELS.length];
}
