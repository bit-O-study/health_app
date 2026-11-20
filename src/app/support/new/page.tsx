import { PageHeader } from "@/components/page-header";
import { NewTicket } from "@/features/support/forms";
import { supportAccess } from "@/features/support/data";
export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  await supportAccess();
  const idea = (await searchParams).category === "idea";
  return <div className="app-page"><PageHeader title="문의 작성" back/><main className="app-container"><NewTicket initialCategory={idea ? "idea" : "feedback"}/></main></div>;
}
