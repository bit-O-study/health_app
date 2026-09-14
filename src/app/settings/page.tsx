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
  TrendingUp,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { ThemePicker } from "@/features/theme/theme-picker";
import { getCurrentGym } from "@/features/gym/gym-data-access";
import { getUserProfile } from "@/features/profile/data-access";

export const dynamic = "force-dynamic";

type Row = { href: string; title: string; desc: string; icon: LucideIcon };

/**
 * 설정 한 줄 — 모든 행이 같은 모양(아이콘 칩은 회색 하나, 화살표는 ChevronRight).
 * 예전엔 행마다 초록·빨강·주황·남색 칩이 규칙 없이 섞였다(2026-09-14 검수보고서).
 */
function SettingsRow({ href, title, desc, icon: Icon }: Row) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-zinc-50 dark:hover:bg-white/[0.03]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-zinc-100 text-zinc-600 dark:bg-white/[0.06] dark:text-zinc-300">
          <Icon aria-hidden="true" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
            {title}
          </h2>
          <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
            {desc}
          </p>
        </div>
        <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-zinc-400" />
      </Link>
    </li>
  );
}

export default async function SettingsPage() {
  const [user, gym, profile] = await Promise.all([
    getCurrentUser(),
    getCurrentGym(),
    getUserProfile(),
  ]);

  const rows: Row[] = [
    { href: "/settings/me", title: "마이페이지", desc: "내 프로필·신체·식단·운동을 한눈에", icon: UserRound },
    { href: "/settings/personal", title: "개인설정", desc: "운동영상 보기/숨기기 등 화면 동작 설정", icon: SlidersHorizontal },
    {
      href: "/settings/gym",
      title: "내 헬스장",
      desc: gym ? `${gym.name} · 기구 ${gym.equipmentIds.length}종` : "헬스장 이름·주소·보유 기구 등록",
      icon: Building2,
    },
    { href: "/settings/profile", title: "체형 정보", desc: "키·몸무게·체지방률·근육량 기록과 추이 그래프", icon: Scale },
    { href: "/settings/body-composition", title: "체성분 결과 등록", desc: "분석지 수치·사진 등록 → 밸런스·추천 루틴에 반영", icon: ClipboardList },
    ...(profile?.gender === "female"
      ? [{ href: "/cycle", title: "생리 기록", desc: "주기 기록 · 다음 생리 예측", icon: HeartPulse }]
      : []),
    { href: "/settings/health", title: "건강 연동", desc: "걸음 수 · 체중/체성분을 Health Connect 에서 가져오기", icon: Scale },
    { href: "/settings/subscription", title: "구독", desc: "AI 기능 이용 횟수 · 프리미엄 상태", icon: Trophy },
    { href: "/settings/score", title: "운동 점수", desc: "완료 기반 점수 · 연속 일수 · 최근 활동", icon: Trophy },
    { href: "/settings/notifications", title: "알림 설정", desc: "받을 알림 종류 · 야간 방해 금지", icon: Bell },
    { href: "/settings/progress", title: "성장 그래프", desc: "총 볼륨 추이 · 종목별 추정 1RM 추이", icon: TrendingUp },
    { href: "/settings/export", title: "내 데이터 내보내기", desc: "운동·체중·식단 CSV · 전체 JSON 백업", icon: Download },
  ];

  return (
    <div className="app-page">
      <PageHeader title="설정" back />
      <main className="app-container space-y-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{user?.email}</p>

        <ul
          data-testid="settings-rows"
          className="app-card divide-y divide-[var(--line)] overflow-hidden"
        >
          {rows.map((r) => (
            <SettingsRow key={r.href} {...r} />
          ))}
        </ul>

        <ThemePicker />
      </main>
    </div>
  );
}
