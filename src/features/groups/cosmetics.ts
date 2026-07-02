/** 그룹 늑대 꾸미기 아이템(상점) — 순수 데이터. 테스트 가능. 코인으로 구매·착용. */

export type CosmeticSlot = "hat" | "face" | "neck";

export const COSMETIC_SLOTS: { slot: CosmeticSlot; label: string }[] = [
  { slot: "hat", label: "머리" },
  { slot: "face", label: "얼굴" },
  { slot: "neck", label: "목" },
];

export function isCosmeticSlot(v: unknown): v is CosmeticSlot {
  return v === "hat" || v === "face" || v === "neck";
}

export type Cosmetic = {
  id: string;
  name: string;
  slot: CosmeticSlot;
  emoji: string;
  price: number;
};

export const COSMETICS: Cosmetic[] = [
  // 머리
  { id: "hat-band", name: "머리띠", slot: "hat", emoji: "🎀", price: 100 },
  { id: "hat-cap", name: "모자", slot: "hat", emoji: "🧢", price: 150 },
  { id: "hat-straw", name: "밀짚모자", slot: "hat", emoji: "👒", price: 220 },
  { id: "hat-party", name: "파티모자", slot: "hat", emoji: "🎉", price: 180 },
  { id: "hat-crown", name: "왕관", slot: "hat", emoji: "👑", price: 500 },
  // 얼굴
  { id: "face-glasses", name: "안경", slot: "face", emoji: "👓", price: 100 },
  { id: "face-sun", name: "선글라스", slot: "face", emoji: "🕶️", price: 160 },
  // 목
  { id: "neck-scarf", name: "목도리", slot: "neck", emoji: "🧣", price: 180 },
  { id: "neck-tie", name: "넥타이", slot: "neck", emoji: "👔", price: 150 },
  { id: "neck-medal", name: "메달", slot: "neck", emoji: "🏅", price: 400 },
];

export function cosmetic(id: string): Cosmetic | undefined {
  return COSMETICS.find((c) => c.id === id);
}

export function cosmeticsBySlot(slot: CosmeticSlot): Cosmetic[] {
  return COSMETICS.filter((c) => c.slot === slot);
}
