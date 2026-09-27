import CalendarPage from "../page";
export const dynamic = "force-dynamic";
export const metadata = { title: "주간 캘린더" };
export default async function WeekPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  return CalendarPage({ searchParams: Promise.resolve({ ...await searchParams, view: "week" }) });
}
