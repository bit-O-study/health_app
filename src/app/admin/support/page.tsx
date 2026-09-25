import { SupportList, type Filters } from "@/features/support/views";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<Filters>}) { return <SupportList admin filters={await searchParams}/>; }
