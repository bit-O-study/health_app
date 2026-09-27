import { DietSectionPage } from "@/features/diet/section-page";
export const dynamic = "force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{days?:string}>}) { const {days}=await searchParams; return DietSectionPage({section:"history",days}); }