"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  getStepsState,
  requestStepsPermission,
} from "@/features/health/steps-native";
import { saveStepsAction } from "@/features/health/steps-actions";

/**
 * 네이티브 앱에서 걸음수를 동기화한다.
 * - 진입 시: 권한이 이미 있으면 읽어서 저장(자동 권한요청은 안 함 → 크래시 방지).
 * - 권한 없음: '걸음수 연동' 버튼 노출 → 탭하면 그때 권한 요청.
 * - 웹/미지원: 아무것도 렌더 안 함.
 */
export function StepsSync() {
  const router = useRouter();
  const [needConnect, setNeedConnect] = useState(false);
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
        setNeedConnect(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function connect() {
    start(async () => {
      const steps = await requestStepsPermission();
      if (steps == null) return; // 거부/실패
      setNeedConnect(false);
      await saveStepsAction(steps);
      router.refresh();
    });
  }

  if (!needConnect) return null;

  return (
    <button
      type="button"
      onClick={connect}
      disabled={pending}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 aria-hidden="true" size={13} className="animate-spin" />
      ) : null}
      걸음수 연동
    </button>
  );
}
