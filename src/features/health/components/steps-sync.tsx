"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Footprints, Loader2, RefreshCw } from "lucide-react";

import {
  getStepsState,
  connectSteps,
  diagnoseSteps,
  formatStepsDiag,
} from "@/features/health/steps-native";
import { saveStepsAction } from "@/features/health/steps-actions";

/**
 * 네이티브 앱에서 걸음수를 동기화한다.
 * - 진입 시: 권한이 이미 있으면 읽어서 저장(자동 권한요청은 안 함 → 크래시 방지).
 * - ⭐ 읽은 걸음수는 0이라도 '항상' 화면에 표시한다(예: "오늘 0걸음"). 그래야
 *   "재설치했는데 안 바뀐다" 같은 침묵실패 없이, 0이면 삼성헬스 미연동을 바로 안내할 수 있다.
 * - 권한 없음: '걸음수 연동' 버튼 → 탭하면 권한 요청. 실패 시 '이유'를 화면에 표시.
 * - 웹/미지원: 아무것도 렌더 안 함.
 */
type Mode = "hidden" | "connect" | "synced";

export function StepsSync() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("hidden");
  const [steps, setSteps] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [diag, setDiag] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // 화면 디버그: 네이티브에서 파이프라인 원시값(권한/레코드/합계)을 한 줄로 노출.
  async function refreshDiag() {
    const d = await diagnoseSteps();
    if (d.native) setDiag(formatStepsDiag(d));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshDiag();
      const st = await getStepsState();
      if (cancelled) return;
      if (st.status === "granted") {
        await saveStepsAction(st.steps);
        if (cancelled) return;
        setSteps(st.steps);
        setMode("synced");
        router.refresh();
      } else if (st.status === "denied") {
        setMode("connect"); // 네이티브인데 권한/플러그인/HC 문제 → 연동 버튼
      }
      // unavailable(웹) → hidden 유지
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // 연동 버튼 + '다시 동기화' 버튼 공용 핸들러(이미 허용됐으면 권한창 없이 즉시 재조회).
  function sync() {
    setMsg(null);
    start(async () => {
      const r = await connectSteps();
      if (r.ok) {
        await saveStepsAction(r.steps);
        setSteps(r.steps);
        setMode("synced");
        router.refresh();
      } else {
        setMsg(r.reason);
      }
      await refreshDiag();
    });
  }

  // 디버그 라인은 네이티브면 mode 가 hidden 이어도 보여준다(원인 파악용).
  if (mode === "hidden" && !diag) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      {mode === "connect" ? (
        <button
          type="button"
          onClick={sync}
          disabled={pending}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 aria-hidden="true" size={13} className="animate-spin" />
          ) : (
            <Footprints aria-hidden="true" size={13} />
          )}
          걸음수 연동
        </button>
      ) : (
        <button
          type="button"
          onClick={sync}
          disabled={pending}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {pending ? (
            <Loader2 aria-hidden="true" size={13} className="animate-spin" />
          ) : (
            <RefreshCw aria-hidden="true" size={13} />
          )}
          오늘 {(steps ?? 0).toLocaleString()}걸음
        </button>
      )}

      {mode === "synced" && steps === 0 ? (
        <span className="max-w-[220px] text-right text-[11px] leading-tight text-amber-600 dark:text-amber-400">
          걸음수가 0이면 삼성헬스 → Health Connect 의 걸음수 공유를 켜주세요.
        </span>
      ) : null}
      {msg ? (
        <span className="max-w-[220px] text-right text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
          {msg}
        </span>
      ) : null}
      {diag ? (
        <span className="max-w-[260px] break-all text-right text-[10px] leading-tight text-zinc-400 dark:text-zinc-500">
          {diag}
        </span>
      ) : null}
    </div>
  );
}
