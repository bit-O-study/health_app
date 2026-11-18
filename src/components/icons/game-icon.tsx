import type { SVGProps } from "react";
import { AVATAR_ICONS } from "./game/avatar-icons";
import { COSMETIC_ICONS } from "./game/cosmetic-icons";
import { DECOR_ICONS } from "./game/decor-icons";
import { PET_ICONS } from "./game/pet-icons";

/**
 * 게임 그림(동물 아바타·펫 방 소품·꾸미기·진화 단계) — 이모지 대신 직접 그린 단색 선 아이콘.
 * 색은 넣지 않는다: 둘러싼 글자색(currentColor)을 따르고, 크기는 기본이 글자 크기(1em)라
 * 예전에 이모지를 `text-2xl` 로 키우던 자리에 그대로 들어간다.
 */
const ICONS = { ...AVATAR_ICONS, ...COSMETIC_ICONS, ...DECOR_ICONS, ...PET_ICONS };

export type GameIconName = keyof typeof ICONS;

export function GameIcon({
  name,
  size = "1em",
  ...rest
}: Omit<SVGProps<SVGSVGElement>, "children" | "name"> & { name: string; size?: number | string }) {
  const body = (ICONS as Record<string, React.ReactNode>)[name];
  if (!body) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {body}
    </svg>
  );
}

/** 등록된 아이콘 이름 전체 — 데이터가 없는 이름을 가리키지 않는지 테스트가 대조한다. */
export const GAME_ICON_NAMES: string[] = Object.keys(ICONS);
