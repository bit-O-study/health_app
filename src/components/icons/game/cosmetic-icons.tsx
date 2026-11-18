import type { ReactNode } from "react";

/** 펫 꾸미기 아이템 — 직접 그린 단색 선 아이콘. */
export const COSMETIC_ICONS: Record<string, ReactNode> = {
  "hat-band": (
    <>
      <path d="M12 11 L4 6 V16 Z" />
      <path d="M12 11 L20 6 V16 Z" />
      <circle cx="12" cy="11" r="1.5" />
      <path d="M11 13 L8.5 20" />
      <path d="M13 13 L15.5 20" />
    </>
  ),
  "hat-cap": (
    <>
      <path d="M4 17 V14 C4 9 8 5 12 5 C16 5 18 9 18 14 V17 Z" />
      <path d="M18 14 H20 C21.5 14 22 15.5 22 17 C22 18 21 18 20 18 H11" />
      <path d="M11 5.5 V10" />
    </>
  ),
  "hat-straw": (
    <>
      <path d="M8 13 C8 7 9.5 5 12 5 C14.5 5 16 7 16 13" />
      <path d="M3 15 C3 13.5 7 13 12 13 S21 13.5 21 15 S17 17 12 17 S3 16.5 3 15 Z" />
      <path d="M8 11 H16" />
    </>
  ),
  "hat-party": (
    <>
      <path d="M12 6 L5 19 H19 Z" />
      <circle cx="12" cy="4" r="1.5" />
      <path d="M9.5 11.5 H14.5" />
      <path d="M7.7 15.5 H16.3" />
    </>
  ),
  "hat-crown": (
    <>
      <path d="M4 18 L3 7 L8.5 12 L12 5 L15.5 12 L21 7 L20 18 Z" />
    </>
  ),
  "face-glasses": (
    <>
      <circle cx="7" cy="13" r="4" />
      <circle cx="17" cy="13" r="4" />
      <path d="M11 13 Q12 11.5 13 13" />
      <path d="M3 12 L2 9" />
      <path d="M21 12 L22 9" />
    </>
  ),
  "face-sun": (
    <>
      <path d="M3 10 H11 V14 C11 16.5 9.5 17.5 7 17.5 C4.5 17.5 3 16.5 3 14 Z" />
      <path d="M13 10 H21 V14 C21 16.5 19.5 17.5 17 17.5 C14.5 17.5 13 16.5 13 14 Z" />
      <path d="M11 11 H13" />
      <path d="M3 10 L2 8" />
      <path d="M21 10 L22 8" />
      <path d="M5.5 14.5 L8 12" />
      <path d="M15.5 14.5 L18 12" />
    </>
  ),
  "neck-scarf": (
    <>
      <path d="M3 7 C8 10 16 10 21 7 V12 C16 15 8 15 3 12 Z" />
      <path d="M14 13.5 V20 H18.5 V12.5" />
    </>
  ),
  "neck-tie": (
    <>
      <path d="M9.5 3 H14.5 L13.5 7 H10.5 Z" />
      <path d="M10.5 7 L8.5 18 L12 21 L15.5 18 L13.5 7" />
    </>
  ),
  "neck-medal": (
    <>
      <path d="M8 3 L11 10" />
      <path d="M16 3 L13 10" />
      <circle cx="12" cy="15.5" r="5.5" />
      <circle cx="12" cy="15.5" r="1.5" />
    </>
  ),
};
