import { redirect } from "next/navigation";
export default async function Page({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days } = await searchParams;
  redirect("/diet/history" + (days && ["7", "30", "90"].includes(days) ? "?days=" + days : ""));
}
