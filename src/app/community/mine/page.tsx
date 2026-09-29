import CommunityPage from "../page";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) { return CommunityPage({ searchParams: Promise.resolve({ ...await searchParams, view: "mine" }) }); }
