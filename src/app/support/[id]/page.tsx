import { SupportDetail } from "@/features/support/views";
export const dynamic="force-dynamic";
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{created?:string}>}) { return <SupportDetail id={(await params).id} created={(await searchParams).created==="1"}/>; }
