/** 늑대 미니룸 아이템(벽·바닥·소품) 카탈로그 — 순수 데이터. 테스트 가능.
 *  늑대가 사는 '방'을 꾸미는 개념(싸이월드 미니룸). 포인트로 사서 방에 배치. */

export type RoomCat = "wall" | "floor" | "decor";

export const ROOM_CATS: { cat: RoomCat; label: string }[] = [
  { cat: "wall", label: "벽지" },
  { cat: "floor", label: "바닥" },
  { cat: "decor", label: "소품" },
];

export function isRoomCat(v: unknown): v is RoomCat {
  return v === "wall" || v === "floor" || v === "decor";
}

export type RoomItem = {
  id: string;
  name: string;
  cat: RoomCat;
  price: number;
  /** decor: 이모지 소품. wall/floor: 미리보기 이모지. */
  emoji: string;
  /** wall/floor: 방에 칠할 배경 클래스. */
  className?: string;
};

export const ROOM_ITEMS: RoomItem[] = [
  // 벽지(기본=크림). className 이 벽 밴드 배경.
  { id: "wall-cream", name: "크림", cat: "wall", price: 0, emoji: "🟡", className: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "wall-sky", name: "하늘", cat: "wall", price: 40, emoji: "🔵", className: "bg-sky-100 dark:bg-sky-950/40" },
  { id: "wall-pink", name: "핑크", cat: "wall", price: 40, emoji: "🌸", className: "bg-rose-100 dark:bg-rose-950/40" },
  { id: "wall-mint", name: "민트", cat: "wall", price: 40, emoji: "🌿", className: "bg-emerald-100 dark:bg-emerald-950/40" },
  { id: "wall-night", name: "밤하늘", cat: "wall", price: 90, emoji: "🌙", className: "bg-indigo-900" },
  // 바닥(기본=원목).
  { id: "floor-wood", name: "원목", cat: "floor", price: 0, emoji: "🪵", className: "bg-amber-200 dark:bg-amber-900/60" },
  { id: "floor-grass", name: "잔디", cat: "floor", price: 40, emoji: "🌱", className: "bg-emerald-300 dark:bg-emerald-800/60" },
  { id: "floor-tile", name: "타일", cat: "floor", price: 40, emoji: "⬜", className: "bg-zinc-200 dark:bg-zinc-700" },
  { id: "floor-carpet", name: "카펫", cat: "floor", price: 60, emoji: "🟥", className: "bg-rose-300 dark:bg-rose-900/60" },
  // 소품(여러 개 배치 가능).
  { id: "decor-bed", name: "늑대 침대", cat: "decor", price: 80, emoji: "🛏️" },
  { id: "decor-sofa", name: "소파", cat: "decor", price: 60, emoji: "🛋️" },
  { id: "decor-chair", name: "의자", cat: "decor", price: 30, emoji: "🪑" },
  { id: "decor-plant", name: "화분", cat: "decor", price: 30, emoji: "🪴" },
  { id: "decor-tree", name: "야자수", cat: "decor", price: 50, emoji: "🌴" },
  { id: "decor-picture", name: "그림", cat: "decor", price: 40, emoji: "🖼️" },
  { id: "decor-teddy", name: "곰인형", cat: "decor", price: 45, emoji: "🧸" },
  { id: "decor-bone", name: "뼈다귀", cat: "decor", price: 20, emoji: "🦴" },
  { id: "decor-ball", name: "공", cat: "decor", price: 25, emoji: "🏀" },
  { id: "decor-balloon", name: "풍선", cat: "decor", price: 20, emoji: "🎈" },
  { id: "decor-tv", name: "TV", cat: "decor", price: 120, emoji: "📺" },
  { id: "decor-lamp", name: "조명", cat: "decor", price: 35, emoji: "💡" },
  { id: "decor-window", name: "창문", cat: "decor", price: 60, emoji: "🪟" },
  { id: "decor-star", name: "별조명", cat: "decor", price: 35, emoji: "⭐" },
];

export function roomItem(id: string): RoomItem | undefined {
  return ROOM_ITEMS.find((i) => i.id === id);
}

export function itemsByCat(cat: RoomCat): RoomItem[] {
  return ROOM_ITEMS.filter((i) => i.cat === cat);
}

/** 벽/바닥 배경 클래스(미설정/미보유 시 기본 아이템). */
export function wallClass(id?: string): string {
  return (id && roomItem(id)?.className) || "bg-amber-50 dark:bg-amber-950/30";
}
export function floorClass(id?: string): string {
  return (id && roomItem(id)?.className) || "bg-amber-200 dark:bg-amber-900/60";
}
