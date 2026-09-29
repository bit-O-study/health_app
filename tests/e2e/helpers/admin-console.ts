/** Admin UI runs as a second application; local Supabase cookies share the host. */
export function adminUrl(path = "/admin"): string {
  const origin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3120";
  const target = path === "/admin" ? "/admin" : path.replace(/^\/admin\//, "/admin/health/");
  return new URL(target, origin).toString();
}
