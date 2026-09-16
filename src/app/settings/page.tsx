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
        className="flex h-11 items-center gap-3 px-3 transition active:bg-zinc-100 dark:active:bg-white/[0.06]"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300">
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
      <main data-testid="settings-rows" className="app-container space-y-4">
        {/* 계정은 제목 바로 아래 작은 한 줄 — 그룹 사이 간격도 24px → 16px(2026-09-16 촘촘하게). */}
        <p className="-mt-1 truncate px-1 text-sm text-zinc-500 dark:text-zinc-400">{user?.email}</p>
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
