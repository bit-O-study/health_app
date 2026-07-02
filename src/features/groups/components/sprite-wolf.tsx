/**
 * 걸어다니는 강아지(늑대 대용) 스프라이트 — CC0 pzUH "Cat & Dog". 10프레임 워크 사이클.
 * size = 표시 높이(px). flip 이면 좌우 반전(왼쪽 이동 시).
 *
 * 배경 이미지·크기는 인라인으로 못박아, globals.css 의 .dog-walk-sprite 규칙이
 * 어떤 이유로 안 먹어도 최소한 정지 프레임 강아지는 항상 보이게 한다.
 * (애니메이션(background-position steps)만 클래스에 의존.)
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
        overflow: "hidden",
      }}
    >
      <div
        className="dog-walk-sprite"
        style={{
          width: 182,
          height: 160,
          backgroundImage: "url(/wolf/dog-walk.png)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "1820px 160px",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}
