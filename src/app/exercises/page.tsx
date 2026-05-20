import Link from "next/link";
import { ArrowRight, Dumbbell } from "lucide-react";

import {
  BODY_PART_LABEL,
  BODY_PART_ORDER,
  EQUIPMENT_LABELS,
  groupedByBodyPart,
  type BodyPart,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
import { ExerciseEquipmentFilter } from "@/features/exercises/components/exercise-equipment-filter";

export const dynamic = "force-dynamic";

type ExercisesPageProps = {
  searchParams: Promise<{ eq?: string }>;
};

const ALL_EQUIPMENTS: EquipmentId[] = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
];

function isEquipment(value: string | undefined): value is EquipmentId {
  return typeof value === "string" && (ALL_EQUIPMENTS as string[]).includes(value);
}

export default async function ExercisesPage({ searchParams }: ExercisesPageProps) {
  const { eq } = await searchParams;
  const filter = isEquipment(eq) ? eq : null;

  const grouped = groupedByBodyPart();

  // 부위별로 (운동 × 기구) 카드 펼치기, 기구 필터 적용
  const sections: {
    part: BodyPart;
    cards: {
      key: string;
      slug: string;
      equipment: EquipmentId;
      name: string;
      target: string;
    }[];
  }[] = BODY_PART_ORDER.map((part) => {
    const cards = grouped[part].flatMap((ex) =>
      ex.equipments
        .filter((e) => (filter ? e.equipment === filter : true))
        .map((e) => ({
          key: `${ex.id}-${e.equipment}`,
          slug: ex.id,
          equipment: e.equipment,
          name: ex.name,
          target: ex.target,
        })),
    );
    return { part, cards };
  });

  const totalCount = sections.reduce((s, sec) => s + sec.cards.length, 0);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950 sm:px-10">
      <section className="mx-auto w-full max-w-5xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Exercise library
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              운동 종목 리스트
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
              헬스장 기구별 운동법을 부위별로 정리했습니다. 부위 탭으로 이동하거나
              기구로 필터해 보세요.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100"
            href="/"
          >
            홈으로
          </Link>
        </div>

        {/* 부위 탭 + 기구 필터 */}
        <div className="sticky top-0 z-10 -mx-6 border-b border-zinc-200 bg-zinc-50/90 px-6 py-3 backdrop-blur sm:-mx-10 sm:px-10">
          <nav className="-mb-1 flex flex-wrap items-center gap-1.5">
            {BODY_PART_ORDER.map((part) => {
              const count = sections.find((s) => s.part === part)?.cards.length ?? 0;
              return (
                <a
                  key={part}
                  href={`#${part}`}
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  {BODY_PART_LABEL[part]}
                  <span className="text-[10px] font-bold text-zinc-400">
                    {count}
                  </span>
                </a>
              );
            })}
          </nav>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ExerciseEquipmentFilter current={filter} totalCount={totalCount} />
          </div>
        </div>

        {/* 부위별 섹션 */}
        <div className="space-y-10">
          {sections.map((section) => (
            <section
              key={section.part}
              id={section.part}
              className="scroll-mt-32"
            >
              <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-zinc-200 pb-2">
                <h2 className="text-xl font-bold text-zinc-950">
                  {BODY_PART_LABEL[section.part]}
                </h2>
                <span className="text-xs font-semibold text-zinc-500">
                  {section.cards.length}개
                </span>
              </div>

              {section.cards.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-5 py-8 text-center text-sm text-zinc-500">
                  선택한 기구로 등록된 운동이 없습니다.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {section.cards.map((item) => (
                    <Link
                      className="group rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                      href={`/exercises/${item.slug}?eq=${item.equipment}`}
                      key={item.key}
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                        <Dumbbell aria-hidden="true" size={23} />
                      </div>
                      <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-semibold text-zinc-950">
                            {item.name}
                          </h3>
                          <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                            {EQUIPMENT_LABELS[item.equipment]}
                          </span>
                        </div>
                        <p className="text-sm leading-6 text-zinc-600">
                          {item.target}
                        </p>
                        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          운동법 보기
                          <ArrowRight
                            aria-hidden="true"
                            className="transition group-hover:translate-x-1"
                            size={14}
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
