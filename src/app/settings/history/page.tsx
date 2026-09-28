import { redirect } from "next/navigation";
export default async function HistoryPage({searchParams}:{searchParams:Promise<{month?:string}>}) {
  const {month}=await searchParams;
  redirect(month && /^20\d{2}-(0[1-9]|1[0-2])$/.test(month) ? `/calendar?m=${month}` : "/calendar");
}
