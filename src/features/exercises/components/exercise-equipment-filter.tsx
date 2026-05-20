import Link from "next/link";

import {
  EQUIPMENT_LABELS,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";

const ORDER: EquipmentId[] = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
];

/**
 * /exercises 페이지 상단 기구 필터.
 * 쿼리스트링(`?eq=`) 으로 동작하므로 서버 컴포넌트로 충분.
 */
export function ExerciseEquipmentFilter({
  current,
  totalCount,
}: {
  current: EquipmentId | null;
  totalCount: number;
}) {
  return (
    <>
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        기구
      </span>
      <Link
        href="/exercises"
        scroll={false}
        className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold transition ${
          current === null
            ? "border-emerald-500 bg-emerald-600 text-white"
            : "border-zinc-300 bg-white text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50"
        }`}
      >
        전체 <span className="ml-1 text-[10px] opacity-80">{totalCount}</span>
      </Link>
      {ORDER.map((eq) => (
        <Link
          key={eq}
          href={`/exercises?eq=${eq}`}
          scroll={false}
          className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold transition ${
            current === eq
              ? "border-emerald-500 bg-emerald-600 text-white"
              : "border-zinc-300 bg-white text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50"
          }`}
        >
          {EQUIPMENT_LABELS[eq]}
        </Link>
      ))}
    </>
  );
}
