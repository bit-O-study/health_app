"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2 } from "lucide-react";

import {
  markAllTodayCompleteAction,
  type CondMarkInput,
  type PlanMarkInput,
} from "@/features/routine/mark-all-actions";
import { callIdempotentAction } from "@/lib/actions/resilient-action";

export function MarkAllDoneButton({
  planRows,
  warmup,
  cooldown,
}: {
  planRows: PlanMarkInput[];
  warmup: CondMarkInput[];
  cooldown: CondMarkInput[];
}) {
  const router = useRouter();
  // 🔴 `useTransition` 의 pending 을 쓰지 않는다. 그 안에서 `router.refresh()` 까지
  // 기다리는데, 액션 응답이 끊기면(아래 참고) pending 이 true 로 굳어 **버튼이 영원히
  // 도는 상태**가 됐다. 스피너의 끝은 우리가 직접 책임진다(finally).
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const total = planRows.length + warmup.length + cooldown.length;

  async function run() {
    if (total === 0 || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      // 🔴 이 액션의 응답이 스트리밍 도중 끊기는 일이 있다(2026-09-02 측정: 약 30%).
      // 끊기면 await 가 영원히 안 끝나고, 끊긴 시점에 따라 **DB 쓰기 자체가 안 된
      // 경우도 있었다** — 사용자에겐 "눌렀는데 아무 일도 안 일어남"으로 보인다.
      // 이 액션은 upsert 라 다시 보내도 결과가 같다(멱등) → 안전하게 재시도한다.
      const res = await callIdempotentAction(() =>
        markAllTodayCompleteAction({ planRows, warmup, cooldown }),
      );
      setFailed(!res.ok);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
    // 실패했더라도 새로고침한다 — 첫 요청이 서버에 닿아 기록이 남았을 수 있다.
    // (트랜지션 밖에서 부른다: refresh 가 늦어져도 버튼은 이미 풀려 있다.)
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy || total === 0}
        onClick={run}
        title={total === 0 ? "완료 처리할 운동이 없습니다" : undefined}
        className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={14} />
        ) : (
          <CheckCheck aria-hidden="true" size={14} />
        )}
        오늘 전부 완료
        {total > 0 ? (
          <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
            {total}
          </span>
        ) : null}
      </button>
      {failed ? (
        // 조용히 실패하지 않는다 — 눌렀는데 아무 말이 없으면 됐는지 안 됐는지 모른다.
        //
        // ⚠ 문구를 "저장 실패" 라고 단정하지 않는다. 측정해 보면 이 경우 **기록은 남아
        // 있는데 화면만 안 바뀐 것**이 대부분이었다(응답만 못 받았다). "실패했다" 고
        // 하면 멀쩡히 저장된 걸 사용자가 다시 하게 만든다. 확실한 건 '확인 못 했다' 뿐이고,
        // 확인하는 방법(새로고침)은 우리가 제공한다.
        <span className="flex max-w-[240px] flex-col items-end gap-1 text-right">
          <span
            data-testid="mark-all-unconfirmed"
            className="text-[11px] leading-tight text-amber-600 dark:text-amber-400"
          >
            저장 결과를 확인하지 못했어요. 새로고침해서 확인해 주세요.
          </span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border border-amber-300 px-2 py-0.5 text-[11px] font-bold text-amber-700 transition hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
          >
            새로고침
          </button>
        </span>
      ) : null}
    </div>
  );
}
