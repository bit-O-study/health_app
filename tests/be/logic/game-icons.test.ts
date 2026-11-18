import { describe, expect, it } from "vitest";

import { GAME_ICON_NAMES } from "@/components/icons/game-icon";
import { characterIcon } from "@/features/groups/avatar";
import { COSMETICS } from "@/features/groups/cosmetics";
import { PET_STAGES } from "@/features/groups/evolution";
import { ROOM_ITEMS } from "@/features/pet/catalog";

/**
 * 게임 그림은 이모지가 아니라 직접 그린 단색 선 아이콘이다. 데이터가 가리키는 이름이
 * 아이콘 모음에 하나라도 빠지면 화면에 빈칸이 생기므로 여기서 잡는다.
 */
describe("게임 아이콘 — 데이터가 가리키는 그림이 모두 있다", () => {
  const names = new Set(GAME_ICON_NAMES);

  it("동물 아바타 12종", () => {
    for (const seed of ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하"]) {
      expect(names.has(characterIcon(seed))).toBe(true);
    }
    expect(GAME_ICON_NAMES.filter((n) => n.startsWith("avatar-")).length).toBe(12);
  });

  it("꾸미기 아이템", () => {
    for (const c of COSMETICS) expect(names.has(c.icon)).toBe(true);
  });

  it("펫 방 소품(벽·바닥은 색 견본)", () => {
    for (const it of ROOM_ITEMS) {
      if (it.cat === "decor") expect(names.has(it.icon ?? "")).toBe(true);
      else expect(it.className).toBeTruthy();
    }
  });

  it("진화 단계와 늑대·밤 장식", () => {
    for (const s of PET_STAGES) expect(names.has(s.icon)).toBe(true);
    for (const n of ["wolf", "scene-moon", "scene-stars"]) expect(names.has(n)).toBe(true);
  });

  it("이모지를 데이터에 두지 않는다", () => {
    const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2B50}\u{2B1C}]/u;
    const all = JSON.stringify([COSMETICS, ROOM_ITEMS, PET_STAGES, [characterIcon("x")]]);
    expect(EMOJI.test(all)).toBe(false);
  });
});
