import Link from "next/link";
import {
  ArrowRight,
  Dumbbell,
  MessageSquare,
  Sparkles,
  Upload,
} from "lucide-react";

import { RoutinePlanner } from "@/features/routine/components/routine-planner";

const features = [
  {
    title: "운동 종목 라이브러리",
    description:
      "스쿼트·데드리프트·벤치프레스 등 핵심 운동을 부위별로 탐색합니다.",
    icon: Dumbbell,
    href: "/exercises",
  },
  {
    title: "자세 영상 업로드",
    description: "운동별 상세 페이지에서 내 자세 영상을 바로 업로드합니다.",
    icon: Upload,
    href: "/exercises",
  },
  {
    title: "익명 댓글 피드백",
    description: "올린 영상에 부담 없이 익명으로 자세 피드백을 주고받습니다.",
    icon: MessageSquare,
    href: "/exercises",
  },
];

const stats = [
  { value: "1~6", label: "분할 프리셋" },
  { value: "10+", label: "루틴 변형" },
  { value: "7일", label: "주간 자동 구성" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      {/* 상단 네비게이션 */}
      <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 sm:px-10">
          <Link className="flex items-center gap-2" href="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Dumbbell aria-hidden="true" size={20} />
            </span>
            <span className="text-base font-bold tracking-tight">
              HELTCH
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              className="hidden h-9 items-center rounded-md px-3 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950 sm:inline-flex"
              href="/exercises"
            >
              운동 리스트
            </Link>
            <Link
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-zinc-900 px-3.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
              href="/exercises"
            >
              시작하기
              <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </div>
        </nav>
      </header>

      {/* 히어로 */}
      <section className="relative overflow-hidden bg-zinc-950 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-emerald-600/10 blur-3xl" />
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10 sm:py-24">
          <div className="flex max-w-2xl flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              <Sparkles aria-hidden="true" size={14} />
              Fitness feedback platform
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              루틴은 자동으로,
              <br />
              피드백은 솔직하게.
            </h1>
            <p className="max-w-xl text-base leading-7 text-zinc-300 sm:text-lg">
              몇 분할로 운동할지만 고르면 일주일 루틴이 채워집니다. 자세
              영상을 올리고 익명 피드백으로 폼을 다듬어 보세요.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                href="#routine"
              >
                내 루틴 만들기
                <ArrowRight aria-hidden="true" size={17} />
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900/60 px-5 text-sm font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800"
                href="/exercises"
              >
                운동 리스트 보기
              </Link>
            </div>
            <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-2xl font-bold text-white sm:text-3xl">
                    {stat.value}
                  </dt>
                  <dd className="mt-0.5 text-sm text-zinc-400">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl space-y-16 px-6 py-16 sm:px-10">
        {/* 나의 루틴 */}
        <section id="routine" className="scroll-mt-20">
          <RoutinePlanner />
        </section>

        {/* 기능 소개 */}
        <section className="space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              What you can do
            </p>
            <h2 className="text-2xl font-bold sm:text-3xl">
              영상 한 편으로 피드백까지
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <Icon aria-hidden="true" size={22} />
                    </span>
                    <span className="text-sm font-semibold text-zinc-300">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-zinc-950">
                    {feature.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-zinc-600">
                    {feature.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    바로 가기
                    <ArrowRight
                      aria-hidden="true"
                      className="transition group-hover:translate-x-1"
                      size={15}
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <span className="font-semibold text-zinc-700">
            HELTCH · Health Platform MVP
          </span>
          <span>운동 루틴 · 자세 영상 · 익명 피드백</span>
        </div>
      </footer>
    </div>
  );
}