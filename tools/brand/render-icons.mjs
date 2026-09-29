#!/usr/bin/env node
/**
 * 짐꾼 아이콘 PNG 만들기 — 안드로이드 원본(assets/) + 웹 정적 아이콘(public/).
 *
 * 도형은 `src/features/brand/mark.tsx` 의 `JimkkunMark` 와 **같은 좌표**다
 * (tests/be/logic/brand.test.ts 가 두 곳의 좌표가 같은지 지킨다).
 *
 * 사용: node tools/brand/render-icons.mjs
 * 그다음 안드로이드 mipmap: corepack pnpm exec capacitor-assets generate --android
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const BG = "#0a6b4e";
export const MINT = "#45d6a0";
/** public/ 아이콘 파일 이름에 붙는 버전 — 바꾸면 layout.tsx·manifest.ts 의 PWA_ICON_VERSION 도. */
export const ICON_VERSION = "20260929";

/** 마크 도형(viewBox 0 0 100 100). mark.tsx 와 같은 좌표. */
export const MARK_SHAPES = [
  `<line x1="15" y1="34" x2="85" y2="34" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>`,
  `<rect x="21" y="21" width="7" height="26" rx="2.2" fill="${MINT}"/>`,
  `<rect x="29.5" y="26" width="4.5" height="16" rx="1.6" fill="${MINT}"/>`,
  `<rect x="72" y="21" width="7" height="26" rx="2.2" fill="${MINT}"/>`,
  `<rect x="66" y="26" width="4.5" height="16" rx="1.6" fill="${MINT}"/>`,
  `<path d="M50 44 L31 78 M50 44 L69 78" stroke="#ffffff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
].join("");

/**
 * @param {{ bg: boolean, radius?: number, scale: number }} o
 *   radius: 바탕 모서리(0~50, viewBox 단위). 0 이면 꽉 찬 사각.
 */
export function iconSvg({ bg, radius = 0, scale }) {
  const back = bg ? `<rect width="100" height="100" rx="${radius}" fill="${BG}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${back}<g transform="translate(50 50) scale(${scale}) translate(-50 -50)">${MARK_SHAPES}</g></svg>`;
}

async function png(svg, size, out) {
  const file = resolve(ROOT, out);
  mkdirSync(dirname(file), { recursive: true });
  await sharp(Buffer.from(svg), { density: 72 * (size / 100) * 4 })
    .resize(size, size)
    .png()
    .toFile(file);
  console.log("✓", out, `${size}px`);
}

async function main() {
  const solid = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${BG}"/></svg>`;
  // 안드로이드 적응형 아이콘: 바탕·전경 분리. 전경은 원형으로 잘려도 안전 영역(66%) 안에 들게 0.66.
  await png(solid, 1024, "assets/icon-background.png");
  await png(iconSvg({ bg: false, scale: 0.66 }), 1024, "assets/icon-foreground.png");
  // 시작 화면·레거시 아이콘 원본(둥근 사각).
  await png(iconSvg({ bg: true, radius: 22, scale: 0.82 }), 1024, "assets/logo.png");

  // 웹 정적 아이콘 — 알림 아이콘·공유 카드가 버전 없는 이름을 쓰고, PWA 는 버전 이름을 쓴다.
  for (const suffix of ["", `-${ICON_VERSION}`]) {
    await png(iconSvg({ bg: true, radius: 22, scale: 0.82 }), 192, `public/icon-192${suffix}.png`);
    await png(iconSvg({ bg: true, radius: 22, scale: 0.82 }), 512, `public/icon-512${suffix}.png`);
    await png(iconSvg({ bg: true, scale: 0.72 }), 512, `public/icon-512-maskable${suffix}.png`);
    await png(iconSvg({ bg: true, scale: 0.82 }), 180, `public/apple-touch-icon${suffix}.png`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
