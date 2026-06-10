import { getActiveUsersSeries, getMembers } from "@/features/admin/admin";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  // 레이아웃(admin/layout.tsx)에서 isAdminUser 게이트 — 여기선 데이터만 로드.
  const [members, day, month, year] = await Promise.all([
    getMembers(),
    getActiveUsersSeries("day"),
    getActiveUsersSeries("month"),
    getActiveUsersSeries("year"),
  ]);

  const lite = members.map((m) => ({
    createdAt: m.createdAt,
    withdrawnAt: m.withdrawnAt,
  }));

  return <AdminDashboard members={lite} active={{ day, month, year }} />;
}