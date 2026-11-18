import type { ReactNode } from "react";

/** 펫 방 소품 — 직접 그린 단색 선 아이콘. */
export const DECOR_ICONS: Record<string, ReactNode> = {
  "decor-bed": (
    <>
      <ellipse cx="12" cy="11" rx="9" ry="3.5" />
      <path d="M3 11v2.5c0 3 4 5.5 9 5.5s9-2.5 9-5.5V11" />
      <path d="M8 11.5c1.2.6 2.5.8 4 .8" />
    </>
  ),
  "decor-sofa": (
    <>
      <path d="M6 11V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
      <path d="M3 17v-4a2 2 0 0 1 4 0v1h10v-1a2 2 0 0 1 4 0v4z" />
      <path d="M6 17v2.5M18 17v2.5" />
    </>
  ),
  "decor-chair": (
    <>
      <rect x="7" y="3" width="10" height="9" rx="1.5" />
      <rect x="5" y="12" width="14" height="3" rx="1" />
      <path d="M7 15v6M17 15v6" />
    </>
  ),
  "decor-plant": (
    <>
      <path d="M7 14h10l-1.5 7h-7z" />
      <path d="M12 14V9" />
      <path d="M12 11c0-4-3-6-7-6 0 4 3 6 7 6z" />
      <path d="M12 9c0-3 2-5 6-5 0 3-2 5-6 5z" />
    </>
  ),
  "decor-tree": (
    <>
      <path d="M10 21c1-4 1.5-7 3-10" />
      <path d="M13 11C12 7 7 6 3.5 8.5" />
      <path d="M13 11c1-4 5-5 8-2.5" />
      <path d="M13 11c-4 0-6.5 2.5-6.5 6" />
      <path d="M13 11c3.5 0 5.5 2.5 5.5 6" />
      <path d="M13 11V4" />
    </>
  ),
  "decor-picture": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="16" cy="9" r="1.5" />
      <path d="M3 17l5-5 5 5 3-3 5 5" />
    </>
  ),
  "decor-teddy": (
    <>
      <circle cx="12" cy="8" r="4.5" />
      <circle cx="7" cy="4.5" r="1.6" />
      <circle cx="17" cy="4.5" r="1.6" />
      <path d="M8 12.2c-2.2 1-3 4.5-2 8h12c1-3.5.2-7-2-8" />
      <path d="M10.3 7.5h.01M13.7 7.5h.01M11.2 9.8h1.6" />
    </>
  ),
  "decor-bone": (
    <g transform="rotate(-35 12 12)">
      <path d="M8 10.2h8A2.7 2.7 0 1 1 21 12a2.7 2.7 0 1 1-5 1.8H8A2.7 2.7 0 1 1 3 12a2.7 2.7 0 1 1 5-1.8z" />
    </g>
  ),
  "decor-ball": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
      <path d="M5.5 5.5c2.5 3.5 2.5 9.5 0 13M18.5 5.5c-2.5 3.5-2.5 9.5 0 13" />
    </>
  ),
  "decor-balloon": (
    <>
      <path d="M12 2.5c-4 0-6.5 3-6.5 6.5 0 4 3 7 6.5 8 3.5-1 6.5-4 6.5-8 0-3.5-2.5-6.5-6.5-6.5z" />
      <path d="M10.5 19.5L12 17.5l1.5 2z" />
      <path d="M12 19.5c-1.5 1-1.5 1.5 0 2.5" />
    </>
  ),
  "decor-tv": (
    <>
      <rect x="3" y="7" width="18" height="11" rx="2" />
      <path d="M8 3l4 4 4-4" />
      <path d="M8 18v3M16 18v3" />
    </>
  ),
  "decor-lamp": (
    <>
      <path d="M8 3h8l3 8H5z" />
      <path d="M12 11v10" />
      <path d="M8 21h8" />
    </>
  ),
  "decor-window": (
    <>
      <rect x="4" y="3" width="16" height="16" rx="1.5" />
      <path d="M12 3v16M4 11h16" />
      <path d="M2.5 21.5h19" />
    </>
  ),
  "decor-star": (
    <>
      <path d="M12 2v3.5" />
      <polygon points="12,5.5 13.94,10.83 19.61,11.03 15.14,14.52 16.7,19.97 12,16.8 7.3,19.97 8.86,14.52 4.39,11.03 10.06,10.83" />
    </>
  ),
};
