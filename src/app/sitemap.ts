import type { MetadataRoute } from "next";

import { ALL_CONDITIONING_ITEMS } from "@/features/routine/conditioning-catalog";
import { ALL_EXERCISES } from "@/features/routine/exercise-catalog";
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
    {
      url: absoluteUrl("/exercises"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...ALL_EXERCISES.map((exercise) => ({
      url: absoluteUrl(`/exercises/${exercise.id}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...ALL_CONDITIONING_ITEMS.map((item) => ({
      url: absoluteUrl(`/conditioning/${item.id}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
