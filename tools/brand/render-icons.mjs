#!/usr/bin/env node
/**
 * 헬쑤 아이콘 PNG 만들기 — 안드로이드 원본(assets/) + 웹 정적 아이콘(public/).
 *
 * 도형은 `src/features/brand/mark.tsx` 의 `HelssuMark` 와 **같은 좌표**다
 * (tests/be/logic/brand.test.ts 가 두 곳의 좌표가 같은지 지킨다).
 *
 * 사용: node tools/brand/render-icons.mjs
 * Android 아이콘도 직접 생성한다. splash 재생성 시 capacitor-assets 실행 후 이 스크립트를 다시 실행한다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const BG = "#0a6b4e";
export const MINT = "#45d6a0";
/** public/ 아이콘 파일 이름에 붙는 버전 — 바꾸면 layout.tsx·manifest.ts 의 PWA_ICON_VERSION 도. */
export const ICON_VERSION = "20261001";

/** 마크 도형(viewBox 0 0 100 100). mark.tsx 와 같은 좌표. */
export const MARK_SHAPES = [
  `<line x1="43" y1="17" x2="57" y2="17" stroke="${MINT}" stroke-width="7" stroke-linecap="round"/>`,
  `<line x1="17" y1="35" x2="83" y2="35" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>`,
  `<rect x="23" y="25" width="8" height="20" rx="3" fill="${MINT}"/>`,
  `<rect x="69" y="25" width="8" height="20" rx="3" fill="${MINT}"/>`,
  `<circle cx="50" cy="67" r="17" stroke="#ffffff" stroke-width="8" fill="none"/>`,
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

  // 108dp adaptive canvas: content stays inside the central 66% safe area.
  // capacitor-assets logo mode overwrites foregrounds at legacy sizes; render them explicitly.
  for (const [density, factor] of [["ldpi", 0.75], ["mdpi", 1], ["hdpi", 1.5], ["xhdpi", 2], ["xxhdpi", 3], ["xxxhdpi", 4]]) {
    const dir = `android/app/src/main/res/mipmap-${density}`;
    await png(iconSvg({ bg: true, radius: 22, scale: 0.82 }), 48 * factor, `${dir}/ic_launcher.png`);
    await png(iconSvg({ bg: true, radius: 50, scale: 0.72 }), 48 * factor, `${dir}/ic_launcher_round.png`);
    await png(iconSvg({ bg: false, scale: 0.66 }), 108 * factor, `${dir}/ic_launcher_foreground.png`);
    await png(solid, 108 * factor, `${dir}/ic_launcher_background.png`);
  }
  const adaptiveDir = resolve(ROOT, "android/app/src/main/res/mipmap-anydpi-v26");
  mkdirSync(adaptiveDir, { recursive: true });
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
  for (const name of ["ic_launcher", "ic_launcher_round"]) writeFileSync(resolve(adaptiveDir, `${name}.xml`), adaptiveXml);
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
