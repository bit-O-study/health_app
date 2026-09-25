import { SupportDetail } from "@/features/support/views";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{id:string}>}) { return <SupportDetail id={(await params).id} admin/>; }
