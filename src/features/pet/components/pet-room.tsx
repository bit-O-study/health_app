import { floorClass, roomItem, wallClass } from "@/features/pet/catalog";
import { petStage } from "@/features/pet/level";

const SIZE = {
  sm: { wolf: "text-2xl", decor: "text-sm" },
  md: { wolf: "text-4xl", decor: "text-xl" },
  lg: { wolf: "text-6xl", decor: "text-3xl" },
} as const;

/**
 * 늑대 미니룸 — 벽지 + 바닥 + 배치한 소품들 사이에서 늑대가 산다(가끔 움직임).
 * 부모가 크기를 정한다(h-full w-full). equipped: { wall, floor, decor:[] }.
 */
export function PetRoom({
  equipped,
  level,
  size = "md",
}: {
  equipped: Record<string, unknown>;
  level: number;
  size?: keyof typeof SIZE;
}) {
  const wall = wallClass(equipped.wall as string | undefined);
  const floor = floorClass(equipped.floor as string | undefined);
  const decor = Array.isArray(equipped.decor) ? (equipped.decor as string[]) : [];
  const night = equipped.wall === "wall-night";
  const stage = petStage(level);
  const s = SIZE[size];

  const half = Math.ceil(decor.length / 2);
  const left = decor.slice(0, half);
  const right = decor.slice(half);
  const emoji = (id: string) => {
    const it = roomItem(id);
    return it ? (
      <span key={id} className={s.decor}>
        {it.emoji}
      </span>
    ) : null;
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      {/* 벽 */}
      <div className={`absolute inset-x-0 top-0 h-[58%] ${wall}`}>
        {night ? (
          <span className="absolute right-1.5 top-1 text-[10px]">✨🌙⭐</span>
        ) : null}
      </div>
      {/* 바닥 */}
      <div className={`absolute inset-x-0 bottom-0 h-[42%] ${floor}`} />

      {/* 소품 사이에 사는 늑대 */}
      <div className="absolute inset-x-1 bottom-[7%] flex items-end justify-center gap-0.5">
        {left.map(emoji)}
        <span
          className="wolf-idle"
          style={{
            fontSize: `calc(${
              size === "lg" ? "3.75rem" : size === "sm" ? "1.5rem" : "2.25rem"
            } * ${stage.scale})`,
            lineHeight: 1,
          }}
        >
          🐺
        </span>
        {right.map(emoji)}
      </div>
    </div>
  );
}
