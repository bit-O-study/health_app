import DietPage from "../page";
export const dynamic = "force-dynamic";
export default function Page() { return DietPage({ searchParams: Promise.resolve({ view: "search" }) }); }
