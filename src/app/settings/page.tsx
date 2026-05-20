import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  Dumbbell,
  LogOut,
  Scale,
  Trophy,
} from "lucide-react";

import { signOut } from "@/features/auth/actions";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserRoutine } from "@/features/routine/data-access";
import { resolveRoutine } from "@/features/routine/data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const routine = await getUserRoutine();
  const resolved = routine
    ? resolveRoutine(routine.splits, routine.variantId, routine.customWeek)
    : null;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800"
        href="/"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        메인으로
      </Link>

      <div className="mt-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950">설정</h1>
        <p className="text-sm text-zinc-600">{user?.email}</p>
      </div>

      <div className="mt-8 space-y-4">
        <Link
          href="/settings/routine"
          className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <CalendarDays aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-950">
              루틴 설정
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-600">
              {resolved
                ? `현재: ${resolved.preset.label} · ${resolved.variant.name}`
                : "아직 설정한 루틴이 없습니다 — 분할을 골라 시작하세요."}
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="shrink-0 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-emerald-700"
            size={18}
          />
        </Link>

        <Link
          href="/plan"
          className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Dumbbell aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-950">
              운동 등록
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-600">
              추천으로 한 번에 등록하거나 부위별로 직접 추가
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="shrink-0 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-emerald-700"
            size={18}
          />
        </Link>

        <Link
          href="/settings/profile"
          className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Scale aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-950">
              체형 정보
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-600">
              키·몸무게·체지방률·근육량 기록과 추이 그래프
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="shrink-0 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-emerald-700"
            size={18}
          />
        </Link>

        <Link
          href="/settings/score"
          className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Trophy aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-950">
              운동 점수
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-600">
              완료 기반 점수 · 연속 일수 · 최근 활동
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="shrink-0 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-emerald-700"
            size={18}
          />
        </Link>

        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut aria-hidden="true" size={16} />
            로그아웃
          </button>
        </form>
      </div>
    </main>
  );
}