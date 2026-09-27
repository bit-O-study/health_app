import { GroupSectionPage } from "@/features/groups/section-page";
export const dynamic = "force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{q?:string}>}) { const {q}=await searchParams; return GroupSectionPage({section:"activity",query:q}); }