import CommunityPage from "../page";
export const dynamic = "force-dynamic";
/** 내가 저장한 글(커뮤니티 3단계). */
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) { return CommunityPage({ searchParams: Promise.resolve({ ...await searchParams, view: "saved" }) }); }
