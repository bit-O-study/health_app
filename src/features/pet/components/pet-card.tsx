import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { PetRoom } from "@/features/pet/components/pet-room";
import { petStage } from "@/features/pet/level";
import type { PetView } from "@/features/pet/data-access";

/** 그룹 보드 하단 미니 펫 카드 — 늑대 + Lv·포인트·경험치. 탭하면 꾸미기 화면(/pet)으로. */
export function PetCard({ pet }: { pet: PetView }) {
  const stage = petStage(pet.level.level);
  const name = pet.name || "이름 없는 늑대";
  return (
    <Link
      href="/pet"
      className="block rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-2.5 shadow-sm transition hover:border-violet-300 dark:border-violet-900/50 dark:from-violet-950/30 dark:to-zinc-900"
    >
      <div className="flex items-center gap-2.5">
        <div className="h-14 w-20 shrink-0">
          <PetRoom equipped={pet.equipped} level={pet.level.level} size="sm" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
            {name}
            <span className="rounded-full bg-violet-500 px-1.5 text-[10px] font-bold text-white">
              Lv.{pet.level.level}
            </span>
          </p>
          <p className="text-[11px] font-semibold text-violet-600 dark:text-violet-300">
            {stage.title} · 🪙 {pet.points.toLocaleString()}P
          </p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-violet-950/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-500"
              style={{ width: `${pet.level.pct}%` }}
            />
          </div>
        </div>
        <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-violet-300" />
      </div>
    </Link>
  );
}
