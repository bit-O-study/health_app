"use client";

import { Building2, Check, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { GYM_EQUIPMENT_GROUPS } from "@/features/gym/gym-equipment-catalog";

/**
 * 고른 헬스장 요약 — 이름·주소는 검색 결과에서 온 값이라 여기선 읽기 전용이다.
 * 다시 고르려면 검색으로 돌아간다.
 */
export function SelectedGymSummary({
  name,
  address,
  onChange,
  changeLabel = "다시 검색",
}: {
  name: string;
  address: string;
  onChange: () => void;
  changeLabel?: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-800 dark:bg-emerald-950/30">
      <Building2
        aria-hidden="true"
        size={16}
        className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-100">
          {name}
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-zinc-600 dark:text-zinc-400">
          <MapPin aria-hidden="true" size={11} className="shrink-0" />
          {address || "주소 정보 없음"}
        </p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-zinc-900 dark:text-emerald-300"
      >
        {changeLabel}
      </button>
    </div>
  );
}

/**
 * 미리 체크된 값이 **어디서 왔는지**.
 * - `saved`  내가 전에 저장한 내 설정
 * - `union`  이 헬스장 회원들이 등록한 기구의 합집합
 * - `default` 아무 정보도 없어 평균 한국 헬스장 기본 보유기구
 *
 * 문구가 출처마다 달라야 사용자가 "왜 이게 미리 체크돼 있지" 를 알 수 있다.
 */
export type GymEquipmentSource = "saved" | "union" | "default";

const SOURCE_HINT: Record<GymEquipmentSource, string> = {
  saved: "지금 내 설정이에요. 바뀐 게 있으면 고쳐주세요.",
  union:
    "이 헬스장 회원들이 등록한 기구를 모아 미리 체크했어요. 없는 것만 체크 해제해주세요.",
  default:
    "아직 등록된 정보가 없어 평균 한국 헬스장 기준으로 미리 체크했어요. 없는 것만 체크 해제해주세요.",
};

/** 보유 기구 체크 목록. */
export function GymEquipmentPicker({
  selected,
  onToggle,
  source,
}: {
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  source: GymEquipmentSource;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        보유 기구
      </p>
      <p className="mb-3 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        {SOURCE_HINT[source]}
      </p>
      <div className="space-y-3">
        {GYM_EQUIPMENT_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((it) => {
                const on = selected.has(it.id);
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => onToggle(it.id)}
                    aria-pressed={on}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      on
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : "border-zinc-300 bg-white text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
                    )}
                  >
                    {on ? <Check aria-hidden="true" size={12} /> : null}
                    {it.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
