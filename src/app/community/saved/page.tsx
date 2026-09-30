import CommunityPage from "../page";
export const dynamic = "force-dynamic";
/** 내가 저장한 글·영상(커뮤니티 3단계·4-3). ?kind=routine 이면 저장한 루틴. */
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) { const { kind, ...rest } = await searchParams; return CommunityPage({ searchParams: Promise.resolve({ ...rest, view: kind === "routine" ? "saved_routines" : "saved" }) }); }
