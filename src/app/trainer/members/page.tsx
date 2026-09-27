import { TrainerSectionPage } from "@/features/trainer/section-page";
export const dynamic = "force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{q?:string}>}) { const {q}=await searchParams; return TrainerSectionPage({section:"members",query:q}); }