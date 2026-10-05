import CommunityPage from "../page";
export const dynamic = "force-dynamic";
/** 내 글 · ?view=commented 면 댓글 단 글(커뮤니티 4-1). */
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; view?: string }> }) { const { view, ...rest } = await searchParams; return CommunityPage({ searchParams: Promise.resolve({ ...rest, view: view === "commented" ? "commented" : "mine" }) }); }
