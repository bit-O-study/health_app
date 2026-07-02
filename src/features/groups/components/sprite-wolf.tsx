/**
 * 걸어다니는 강아지(늑대 대용) 스프라이트 — CC0 pzUH "Cat & Dog". 10프레임 워크 사이클.
 * size = 표시 높이(px). flip 이면 좌우 반전(왼쪽 이동 시).
 */
export function SpriteWolf({
  size = 96,
  flip = false,
}: {
  size?: number;
  flip?: boolean;
}) {
  const scale = size / 160; // 원본 프레임 높이 160
  return (
    <div
      style={{
        width: 182 * scale,
        height: 160 * scale,
        transform: flip ? "scaleX(-1)" : undefined,
      }}
    >
      <div
        className="dog-walk-sprite"
        style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
      />
    </div>
  );
}
