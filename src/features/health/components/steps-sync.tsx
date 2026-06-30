"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Footprints, Loader2 } from "lucide-react";

import { getStepsState, connectSteps } from "@/features/health/steps-native";
import { saveStepsAction } from "@/features/health/steps-actions";

/**
 * 네이티브 앱에서 걸음수를 동기화한다.
 * - 진입 시: 권한이 이미 있으면 읽어서 저장(자동 권한요청은 안 함 → 크래시 방지).
 * - 권한 없음: '걸음수 연동' 버튼 → 탭하면 권한 요청. 실패 시 '이유'를 화면에 표시(디버깅).
 * - 웹/미지원: 아무것도 렌더 안 함.
 */
export function StepsSync() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const st = await getStepsState();
      if (cancelled) return;
      if (st.status === "granted") {
        const res = await saveStepsAction(st.steps);
        if (!cancelled && res.ok) router.refresh();
      } else if (st.status === "denied") {
        setShow(true); // 네이티브인데 권한 없음 → 연동 버튼
      }
      // unavailable → 아무것도 안 보임(웹/HC 미지원)
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function connect() {
    setMsg(null);
    start(async () => {
      const r = await connectSteps();
      if (r.ok) {
        await saveStepsAction(r.steps);
        setShow(false);
        setMsg(`동기화됨: ${r.steps.toLocaleString()}걸음`);
        router.refresh();
      } else {
        setMsg(r.reason);
      }
    });
  }

  if (!show && !msg) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      {show ? (
        <button
          type="button"
          onClick={connect}
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
      ) : null}
      {msg ? (
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{msg}</span>
      ) : null}
    </div>
  );
}
