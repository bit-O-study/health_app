import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ClipboardList,
  Scale,
  SlidersHorizontal,
  TrendingUp,
  Trophy,
  UserRound,
} from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import { ThemePicker } from "@/features/theme/theme-picker";
import { getCurrentGym } from "@/features/gym/gym-data-access";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const gym = await getCurrentGym();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        href="/routine"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        메인으로
      </Link>

      <div className="mt-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          설정
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {user?.email}
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <Link
          href="/settings/me"
          className="group flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 shadow-sm transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md sm:gap-4 sm:p-5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <UserRound aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
              마이페이지
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
              내 프로필·신체·식단·운동을 한눈에
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="shrink-0 text-zinc-400 dark:text-zinc-500 transition group-hover:translate-x-1 group-hover:text-emerald-700"
            size={18}
          />
        </Link>

        <Link
          href="/settings/personal"
          className="group flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md sm:gap-4 sm:p-5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
            <SlidersHorizontal aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
              개인설정
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
              운동영상 보기/숨기기 등 화면 동작 설정
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="shrink-0 text-zinc-400 dark:text-zinc-500 transition group-hover:translate-x-1 group-hover:text-emerald-700"
            size={18}
          />
        </Link>

        <Link
          href="/settings/gym"
          className="group flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md sm:gap-4 sm:p-5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
            <Building2 aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
              내 헬스장
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
              {gym
                ? `${gym.name} · 기구 ${gym.equipmentIds.length}종`
                : "헬스장 이름·주소·보유 기구 등록"}
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="shrink-0 text-zinc-400 dark:text-zinc-500 transition group-hover:translate-x-1 group-hover:text-emerald-700"
            size={18}
          />
        </Link>

        <Link
          href="/settings/profile"
          className="group flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md sm:gap-4 sm:p-5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
            <Scale aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
              체형 정보
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
              키·몸무게·체지방률·근육량 기록과 추이 그래프
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="shrink-0 text-zinc-400 dark:text-zinc-500 transition group-hover:translate-x-1 group-hover:text-emerald-700"
            size={18}
          />
        </Link>

        <Link
          href="/settings/body-composition"
          className="group flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md sm:gap-4 sm:p-5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
            <ClipboardList aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
              체성분 결과 등록
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
              분석지 수치·사진 등록 → 밸런스·추천 루틴에 반영
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="shrink-0 text-zinc-400 dark:text-zinc-500 transition group-hover:translate-x-1 group-hover:text-emerald-700"
            size={18}
          />
        </Link>

        <Link
          href="/settings/score"
          className="group flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md sm:gap-4 sm:p-5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
            <Trophy aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
              운동 점수
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
              완료 기반 점수 · 연속 일수 · 최근 활동
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="shrink-0 text-zinc-400 dark:text-zinc-500 transition group-hover:translate-x-1 group-hover:text-emerald-700"
            size={18}
          />
        </Link>

        <Link
          href="/settings/progress"
          className="group flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md sm:gap-4 sm:p-5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400">
            <TrendingUp aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
              성장 그래프
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
              총 볼륨 추이 · 종목별 추정 1RM 추이
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="shrink-0 text-zinc-400 dark:text-zinc-500 transition group-hover:translate-x-1 group-hover:text-emerald-700"
            size={18}
          />
        </Link>

        <ThemePicker />
      </div>
    </main>
  );
}
