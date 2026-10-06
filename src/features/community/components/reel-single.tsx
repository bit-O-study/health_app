"use client";

import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import type { FeedPost } from "../data-access";
import { TeachingReels } from "./teaching-reels";

/** 공유 링크로 연 운동 영상 한 편 — 릴스 화면 그대로, 한 장만. */
export function ReelSingle({ post, canModerate }: { post: FeedPost; canModerate: boolean }) {
  const router = useRouter();
  return (
    <div className="app-page mx-auto flex h-[calc(100dvh-3.75rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-3xl flex-col overflow-hidden">
      <PageHeader title="운동 영상" backHref="/community/teaching" back="운동 영상" />
      <div className="min-h-0 flex-1">
        <TeachingReels posts={[post]} canModerate={canModerate} onChanged={() => router.push("/community/teaching")} />
      </div>
    </div>
  );
}
