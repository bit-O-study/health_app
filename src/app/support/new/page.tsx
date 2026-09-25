import { PageHeader } from "@/components/page-header";
import { NewTicket } from "@/features/support/forms";
import { supportAccess } from "@/features/support/data";
export default async function Page() { await supportAccess(); return <div className="app-page"><PageHeader title="문의하기" back/><main className="app-container"><NewTicket/></main></div>; }
