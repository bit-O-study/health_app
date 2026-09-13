"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Disc } from "lucide-react";

import {
  BAR_KG_OPTIONS,
  type BarKg,
  defaultBarKg,
  formatPerSide,
  isBarKg,
  platesPerSide,
  usesPlates,
} from "@/features/routine/plate-math";

/**
 * 원판 구성 한 줄 — 운동모드·계획 편집이 **같은 모양**으로 쓴다(`OverloadHint` 와 같은 규칙).
 *
 * 앱은 총중량으로 기록하는데 랙 앞에서 필요한 건 "한쪽에 뭘 몇 장"이라 매번 암산이 든다.
 * 원판을 안 쓰는 기구(덤벨·머신·케이블)에서는 **아무것도 안 그린다** — 성립하지 않는 계산이다.
 *
 * 봉 무게는 사용자가 눌러서 바꾸고 **기구별로** 기억한다(스미스는 기계마다 달라 기본 0).
 * localStorage 는 보조 편의라 못 읽어도 화면은 기본값으로 정상 동작한다.
 */

const STORE_KEY = "helssu:plate-bar-kg";

/**
 * localStorage 는 React 밖의 저장소라 `useSyncExternalStore` 로 읽는다.
 * (effect 안에서 setState 하면 하이드레이션 직후 한 번 더 렌더된다 —
 * `react-hooks/set-state-in-effect` 가 잡는 그 패턴이다.)
 * 같은 화면에 원판 안내가 둘 이상 있을 수 있어(계획 편집의 운동 줄들) 구독자에게 함께 알린다.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readBarKg(equipment: string): BarKg {
  const fallback = defaultBarKg(equipment);
  try {
    const raw = window.localStorage.getItem(`${STORE_KEY}:${equipment}`);
    const n = raw === null ? Number.NaN : Number(raw);
    return isBarKg(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function writeBarKg(equipment: string, kg: BarKg): void {
  try {
    window.localStorage.setItem(`${STORE_KEY}:${equipment}`, String(kg));
  } catch {
    // 저장 실패(사파리 프라이빗 등)는 무시 — 이번 화면에서만 유지된다.
  }
  for (const l of listeners) l();
}

export function PlateHint({
  weightKg,
  equipment,
  compact = false,
}: {
  weightKg: number | null;
  equipment?: string | null;
  /** 좁은 자리(계획 편집 줄 아래)용 — 글자·여백을 줄인다. */
  compact?: boolean;
}) {
  const eq = equipment ?? "";
  const getSnapshot = useCallback(() => readBarKg(eq), [eq]);
  const getServerSnapshot = useCallback(() => defaultBarKg(eq), [eq]);
  // 숫자(원시값)라 매 호출마다 새로 읽어도 참조가 흔들리지 않는다.
  const barKg = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const result = usesPlates(eq) ? platesPerSide(weightKg, barKg) : null;
  if (result === null) return null;

  function cycleBar() {
    const i = BAR_KG_OPTIONS.indexOf(barKg);
    writeBarKg(eq, BAR_KG_OPTIONS[(i + 1) % BAR_KG_OPTIONS.length]);
  }

  const barLabel = barKg === 0 ? "봉 제외" : `봉 ${barKg}kg`;
  const text = result.belowBar
    ? `${barKg}kg 봉보다 가벼워요`
    : result.perSide.length === 0
      ? "봉만 (원판 없음)"
      : `한쪽 ${formatPerSide(result.perSide)}`;

  return (
    <div
      data-testid="plate-hint"
      data-per-side={result.perSide.join(",")}
      data-bar-kg={barKg}
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 ${
        compact ? "px-2 py-1.5 text-[11px]" : "px-2.5 py-2 text-xs"
      }`}
    >
      <p className="flex items-center gap-1 font-semibold">
        <Disc aria-hidden="true" size={compact ? 11 : 12} />
        원판
      </p>
      <p className="font-bold tabular-nums">{text}</p>
      {result.leftoverKg > 0 && !result.belowBar ? (
        <p className="text-amber-700 dark:text-amber-400">
          {result.leftoverKg}kg 는 원판으로 못 맞춰요
        </p>
      ) : null}
      <button
        type="button"
        onClick={cycleBar}
        aria-label={`봉 무게 바꾸기 (현재 ${barLabel})`}
        className="ml-auto rounded-md border border-zinc-300 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 transition hover:border-emerald-400 hover:text-emerald-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-emerald-400"
      >
        {barLabel}
      </button>
    </div>
  );
}
