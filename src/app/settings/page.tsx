import Link from "next/link";
import {
  Bell,
  Building2,
  ChevronRight,
  ClipboardList,
  Download,
  HeartPulse,
  Scale,
  SlidersHorizontal,
  Smartphone,
  TrendingUp,
  Trophy,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { ThemePicker } from "@/features/theme/theme-picker";
import { getUserProfile } from "@/features/profile/data-access";

export const dynamic = "force-dynamic";

type Row = { href: string; title: string; icon: LucideIcon };

/**
 * 설정 한 줄 — 아이폰 설정 앱처럼 아이콘 · 제목 · › 만. 설명 문구는 뺐다
 * (2026-09-15 "글씨가 너무 많아, 간결하게").
 */
function SettingsRow({ href, title, icon: Icon }: Row) {
  return (
    <li>
      <Link
        href={href}
        data-testid={href === "/settings/trainers" ? "settings-trainers" : undefined}
        className="app-row transition active:bg-zinc-100 dark:active:bg-white/[0.06]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Icon aria-hidden="true" size={16} />
        </span>
        <h2 className="min-w-0 flex-1 truncate text-base text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
        <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-zinc-400" />
      </Link>
    </li>
  );
}

function Group({ label, rows }: { label: string; rows: Row[] }) {
  return (
    <section>
      <p className="app-section-label">{label}</p>
      <ul className="app-list">
        {rows.map((r) => (
          <SettingsRow key={r.href} {...r} />
        ))}
      </ul>
    </section>
  );
}

export default async function SettingsPage() {
  const [user, profile] = await Promise.all([getCurrentUser(), getUserProfile()]);

  const me: Row[] = [
    { href: "/settings/me", title: "마이페이지", icon: UserRound },
    { href: "/settings/profile", title: "체형 정보", icon: Scale },
    { href: "/settings/body-composition", title: "체성분 결과 등록", icon: ClipboardList },
    ...(profile?.gender === "female"
      ? [{ href: "/cycle", title: "생리 기록", icon: HeartPulse }]
      : []),
  ];
  const workout: Row[] = [
    { href: "/settings/trainers", title: "트레이너 연결", icon: UsersRound },
    { href: "/settings/gym", title: "내 헬스장", icon: Building2 },
    { href: "/settings/score", title: "운동 점수", icon: Trophy },
    { href: "/settings/progress", title: "성장 그래프", icon: TrendingUp },
  ];
  const app: Row[] = [
    { href: "/settings/personal", title: "개인설정", icon: SlidersHorizontal },
    { href: "/settings/notifications", title: "알림 설정", icon: Bell },
    { href: "/settings/health", title: "건강 연동", icon: Smartphone },
    { href: "/settings/subscription", title: "구독", icon: Trophy },
    { href: "/settings/export", title: "내 데이터 내보내기", icon: Download },
  ];

  return (
    <div className="app-page">
      <PageHeader title="설정" back />
      <main data-testid="settings-rows" className="app-container space-y-6">
        {/* 계정은 제목 바로 아래 작은 한 줄 — 그룹 사이 간격도 24px → 16px(2026-09-16 촘촘하게). */}
        <Link href="/settings/me" className="app-card app-press flex items-center gap-3 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
            <UserRound aria-hidden="true" size={24} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold">내 프로필</span>
            <span className="mt-0.5 block truncate text-sm text-muted">{user?.email}</span>
          </span>
          <ChevronRight aria-hidden="true" size={18} className="text-muted" />
        </Link>
        <Group label="내 정보" rows={me} />
        <Group label="운동" rows={workout} />
        <Group label="앱" rows={app} />
        <div className="app-list">
          <ThemePicker />
        </div>
      </main>
    </div>
  );
}
