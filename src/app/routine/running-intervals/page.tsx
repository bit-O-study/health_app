import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { IntervalRunner } from "@/features/running/components/interval-runner";
export const metadata = { title: "런닝 구간 운동" };
export default async function RunningIntervalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/routine/running-intervals");
  return <div className="app-page"><PageHeader title="런닝 구간 운동" back="런닝 기록" backHref="/routine/running-records" /><main className="app-container"><IntervalRunner userId={user.id} /></main></div>;
}
