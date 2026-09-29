import { redirect } from "next/navigation";
import { ADMIN_CONSOLE_URL } from "@/features/auth/oauth-redirect";
export default function Page() { redirect(`${ADMIN_CONSOLE_URL}/health/settings`); }
