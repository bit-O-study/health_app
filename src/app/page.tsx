import Link from "next/link";
import { ArrowRight, Dumbbell, MessageSquare, Upload } from "lucide-react";

export default function Home() {
  const mvpFeatures = [
    {
      title: "운동 종목 리스트",
      description: "스쿼트, 데드리프트, 벤치프레스 등 핵심 운동을 탐색합니다.",
      icon: Dumbbell,
    },
    {
      title: "자세 영상 업로드",
      description: "운동별 상세 페이지에서 자세 영상을 업로드할 수 있습니다.",
      icon: Upload,
    },
    {
      title: "익명 댓글 피드백",
      description: "업로드된 영상에 익명으로 자세 피드백을 남깁니다.",
      icon: MessageSquare,
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950 sm:px-10">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <div className="flex flex-col gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Dumbbell aria-hidden="true" size={26} />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Fitness feedback MVP
            </p>
            <h1 className="text-4xl font-bold text-zinc-950 sm:text-5xl">
              Health Platform MVP
            </h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
              운동 종목별 자세 영상을 업로드하고, 익명 댓글로 피드백을 주고받는
              헬스 플랫폼 MVP 개발 환경입니다.
            </p>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
              href="/exercises"
            >
              운동 리스트 보기
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {mvpFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-orange-100 text-orange-700">
                  <Icon aria-hidden="true" size={22} />
                </div>
                <h2 className="text-lg font-semibold text-zinc-950">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
