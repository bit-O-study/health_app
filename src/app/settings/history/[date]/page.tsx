import { notFound, redirect } from "next/navigation";
export default async function HistoryDetailPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  redirect(`/calendar/${date}`);
}
