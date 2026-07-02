import type { MetadataRoute } from "next";

import { ALL_CONDITIONING_ITEMS } from "@/features/routine/conditioning-catalog";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    // /exercises(운동 찾기)는 로그인 후에만 노출 → 사이트맵에서 제외(색인 대상 아님).
    ...ALL_CONDITIONING_ITEMS.map((item) => ({
      url: absoluteUrl(`/conditioning/${item.id}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
