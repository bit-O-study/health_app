"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Dumbbell,
  type LucideIcon,
} from "lucide-react";
import { useEffect } from "react";

import { Logo } from "@/features/brand/logo";

type TrainingMode = "routine" | "powerlifting";

const MODE_STORAGE_KEY = "training.mode.v1";

const modeHref: Record<TrainingMode, string> = {
  routine: "/routine",
  powerlifting: "/powerlifting",
};

export default function ModeSelectPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldChoose = params.get("choose") === "1";
    const savedMode = window.localStorage.getItem(MODE_STORAGE_KEY) as TrainingMode | null;

    if (!shouldChoose && savedMode && savedMode in modeHref) {
      window.location.replace(modeHref[savedMode]);
    }
  }, []);

  function rememberMode(mode: TrainingMode) {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6">
        <header>
          <Logo size={36} />
        </header>

        <section className="mt-9">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Training mode
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight">
            모드를 선택해주세요
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            선택한 모드는 저장되어 다음 실행부터 바로 열립니다.
          </p>
        </section>

        <section className="mt-7 space-y-3">
          <ModeCard
            href="/routine"
            icon={Activity}
            title="웨이트 트레이닝"
            description="분할 루틴, 추천 운동, 기록과 신체 변화"
            onClick={() => rememberMode("routine")}
          />
          <ModeCard
            href="/powerlifting"
            icon={Dumbbell}
            title="스트렝스 훈련"
            description="5x5, 5/3/1, 1RM 기반 중량 계산"
            onClick={() => rememberMode("powerlifting")}
          />
        </section>

        <div className="mt-auto" />
      </div>
    </main>
  );
}

function ModeCard({
  href,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        onClick();
      }}
      className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-emerald-700 sm:p-5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
        <Icon aria-hidden="true" size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-zinc-950 dark:text-zinc-100">
          {title}
        </span>
        <span className="mt-0.5 block text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {description}
        </span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="shrink-0 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-emerald-700"
        size={18}
      />
    </Link>
  );
}
