'use client';
export default function CommunityError({ reset }: { reset: () => void }) {
  return <main className="app-page app-container py-12 text-center"><h1 className="text-lg font-semibold">게시물을 불러오지 못했어요</h1><p className="mt-2 text-sm text-zinc-500">잠시 후 다시 시도해주세요.</p><button type="button" onClick={reset} className="mt-4 min-h-11 rounded-lg border px-4">다시 시도</button></main>;
}
