"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Footprints, Loader2, RefreshCw } from "lucide-react";

import {
  getStepsState,
  connectSteps,
  diagnoseSteps,
  formatStepsDiag,
  hasCapacitorBridge,
} from "@/features/health/steps-native";
import {
  saveStepsAction,
  saveStepsDaysAction,
} from "@/features/health/steps-actions";

/**
 * 네이티브 앱에서 걸음수를 동기화한다.
 * - 진입 시: 권한이 이미 있으면 읽어서 저장(자동 권한요청은 안 함 → 크래시 방지).
 * - ⭐ 읽은 걸음수는 0이라도 '항상' 화면에 표시한다(예: "오늘 0걸음"). 그래야
 *   "재설치했는데 안 바뀐다" 같은 침묵실패 없이, 0이면 삼성헬스 미연동을 바로 안내할 수 있다.
 * - 권한 없음: '걸음수 연동' 버튼 → 탭하면 권한 요청. 실패 시 '이유'를 화면에 표시.
 * - 웹/미지원: 아무것도 렌더 안 함.
 */
type Mode = "hidden" | "connect" | "synced";

/** 첫 접속 1회 자동 권한요청 여부(설치당 1번만) — 매번 권한창 뜨는 것 방지. */
const AUTO_ASKED_KEY = "heltch.steps.autoAsked";

export function StepsSync({ debug = false }: { debug?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("hidden");
  const [steps, setSteps] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [diag, setDiag] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // 화면 디버그(🩺 진단칩): '디버그 계정'(관리자 지정)에게만 앱에서 노출한다. 일반 사용자
  // 에겐 안 보인다. 단, URL 에 ?stepsdebug=1 이 있으면 누구나 강제로 볼 수 있다(일회성 진단).
  async function refreshDiag() {
    const forced =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("stepsdebug");
    if (!forced && !(debug && hasCapacitorBridge())) return; // 디버그 계정 아니면 칩 숨김
    // 진단이 느리거나 플러그인이 먹통이어도 칩은 '즉시' 뜨게 한다(멈춘 화면 방지).
    setDiag("진단 중…");
    const d = await diagnoseSteps();
    setDiag(formatStepsDiag(d));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshDiag();
      const st = await getStepsState();
      if (cancelled) return;
      if (st.status === "granted") {
        // 여러 날짜(백필) 맵이 있으면 통째로 저장, 없으면 오늘만.
        if (st.byDay && Object.keys(st.byDay).length > 0) {
          await saveStepsDaysAction(st.byDay);
        } else {
          await saveStepsAction(st.steps);
        }
        if (cancelled) return;
        setSteps(st.steps);
        setMode("synced");
        router.refresh();
      } else if (st.status === "denied") {
        setMode("connect"); // 네이티브인데 권한/플러그인/HC 문제 → 연동 버튼
        // C: 첫 접속(설치 후 1회)엔 다른 앱처럼 자동으로 권한을 요청한다. 이후엔 버튼으로.
        // (예전 크래시는 플러그인 미로드 때문 — 지금은 브리지/플러그인 정상. 화면 안정 후 지연 실행.)
        try {
          if (
            typeof window !== "undefined" &&
            !window.localStorage.getItem(AUTO_ASKED_KEY)
          ) {
            window.localStorage.setItem(AUTO_ASKED_KEY, "1");
            setTimeout(() => {
              if (!cancelled) sync();
            }, 700);
          }
        } catch {
          /* localStorage 불가 시 무시 — 버튼으로 요청 가능 */
        }
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
        if (r.byDay && Object.keys(r.byDay).length > 0) {
          await saveStepsDaysAction(r.byDay);
        } else {
          await saveStepsAction(r.steps);
        }
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
        <button
          type="button"
          onClick={() => window.alert(diag)}
          className="max-w-[280px] break-all rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-right text-[11px] font-semibold leading-tight text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          🩺 {diag} (탭하면 전체보기)
        </button>
      ) : null}
    </div>
  );
}
