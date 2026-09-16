"use client";

import { useRef, useState } from "react";
import { Droplet, Undo2 } from "lucide-react";

import { addWaterAction } from "@/features/diet/water-actions";
import {
  WATER_CUPS,
  clampWaterMl,
  formatWater,
  waterPercent,
} from "@/features/diet/water";

/**
 * 수분 섭취 카드 — 식단 화면 맨 위. 컵을 누르면 그만큼 쌓인다.
 *
 * 🔴 **PendingButton 을 쓰지 않는다.** 컵 담기는 "연타가 정상"인 버튼이라(두 잔 연속)
 * 누를 때마다 잠그면 오히려 못 쓴다. 대신 화면은 즉시 올리고(낙관적), 합산은 DB 함수가
 * 한 문장으로 처리한다 — 요청이 겹쳐도 잔이 사라지지 않는다.
 *
 * 서버가 돌려준 값은 **가장 나중에 보낸 요청의 응답만** 반영한다. 응답이 순서를 바꿔
 * 도착하면(연타하면 흔하다) 오래된 값이 최신 화면을 덮어 숫자가 튄다.
 *
 * `DietBoard` 와 상태를 섞지 않으려고 별도 컴포넌트로 둔다 — 그쪽 낙관적 상태에
 * 재동기화를 얹으면 식단 수정이 깨진다(과거 사고).
 */
export function WaterCard({
  date,
  initialMl,
  targetMl,
}: {
  date: string;
  initialMl: number;
  targetMl: number;
}) {
  const [ml, setMl] = useState(initialMl);
  // 되돌리기용 — 이 화면에서 담은 양만 쌓는다(새로고침하면 비워진다).
  const [added, setAdded] = useState<number[]>([]);
  const seq = useRef(0);

  async function apply(delta: number) {
    setMl((prev) => clampWaterMl(prev + delta));
    const mine = ++seq.current;
    const r = await addWaterAction(delta, date);
    if (r.ok && mine === seq.current) setMl(r.ml);
  }

  function addCup(cupMl: number) {
    setAdded((prev) => [...prev, cupMl]);
    void apply(cupMl);
  }

  function undo() {
    const last = added[added.length - 1];
    if (last === undefined) return;
    setAdded((prev) => prev.slice(0, -1));
    void apply(-last);
  }

  const pct = waterPercent(ml, targetMl);
  const reached = pct >= 100;

  return (
    <section
      aria-label="수분 섭취"
      data-testid="water-card"
      data-ml={ml}
      className="app-card px-3 py-2.5"
    >
      <div className="flex items-center gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <Droplet aria-hidden="true" size={15} className="text-brand" />
          수분
        </p>
        <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {formatWater(ml)}
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          / {formatWater(targetMl)}
        </p>
        {added.length > 0 ? (
          <button
            type="button"
            onClick={undo}
            aria-label="마지막 담은 수분 되돌리기"
            className="ml-auto inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs font-semibold text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <Undo2 aria-hidden="true" size={12} />
            되돌리기
          </button>
        ) : null}
      </div>

      <div
        role="progressbar"
        aria-label="수분 목표 달성률"
        aria-valuenow={Math.min(100, pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
      >
        <div
          className={`h-full rounded-full bg-brand transition-[width] ${reached ? "" : "opacity-70"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      {/* 컵 버튼 — 색 알약 대신 회색 알약(아이폰 느낌). 누르면 살짝 눌린다. */}
      <div className="mt-2 flex gap-1.5">
        {WATER_CUPS.map((cup) => (
          <button
            key={cup.ml}
            type="button"
            onClick={() => addCup(cup.ml)}
            className="app-press inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-full bg-zinc-100 px-2 text-xs font-semibold text-zinc-800 dark:bg-white/[0.08] dark:text-zinc-200"
          >
            +{cup.ml}ml
            <span className="font-normal text-zinc-500 dark:text-zinc-400">{cup.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
