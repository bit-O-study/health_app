import CommunityPage from "../page";
export const dynamic = "force-dynamic";
export default function Page() { return CommunityPage({ searchParams: Promise.resolve({ view: "mine" }) }); }