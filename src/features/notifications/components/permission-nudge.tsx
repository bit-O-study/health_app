"use client";

import { useEffect, useState } from "react";
import { Bell, Footprints, Loader2, X } from "lucide-react";

import { ensurePushSubscribed } from "@/features/notifications/push-client";
import {
  hasNativePushPermission,
  registerNativePush,
} from "@/features/notifications/native-push";
import { pickNudge } from "@/features/notifications/nudge-pick";
import { connectSteps, getStepsState } from "@/features/health/steps-native";
import { isNativeApp } from "@/lib/platform/is-native-app";

// 알림 권한은 받을 때까지 계속 요청한다 → '나중에'는 이번 세션만 숨김(sessionStorage).
// 새로고침/재접속하면 권한이 아직 없으면 다시 뜬다.
const PUSH_SNOOZE = "heltch.nudge.push.snooze";
// 걸음수 넛지는 '다시는 안 보기'가 영구(설치/브라우저당).
const STEPS_DISMISS = "heltch.nudge.steps.dismissed";

/**
 * 권한 넛지 — 접속할 때마다(세션마다) 확인해서:
 * - 앱 푸시 알림 권한이 아직이면 알림 한 줄
 * - (네이티브) 걸음수(삼성헬스/Health Connect) 권한이 아직이면 걸음수 한 줄
 * 을 띄운다. **둘 다 필요해도 한 번에 한 줄만**(pickNudge) — 화면 맨 위를 배너가
 * 차지하지 않게. 이미 허용됐으면 조용히 넘어간다.
 *
 * 닫기(✕) 버튼의 이름은 예전 문구('나중에' / '다시는 안 보기')를 그대로 쓴다 —
 * 동작이 달라서(세션 스누즈 vs 영구) 스크린리더에도 그 차이가 들려야 한다.
 */
export function PermissionNudge() {
  const [showPush, setShowPush] = useState(false);
  const [pushDenied, setPushDenied] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [busy, setBusy] = useState<null | "push" | "steps">(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const native = isNativeApp();
      // 앱 푸시 알림 — 모바일에서만 넛지.
      try {
        if (native) {
          const granted = await hasNativePushPermission();
          if (granted) {
            void registerNativePush();
          } else if (
            window.sessionStorage.getItem(PUSH_SNOOZE) !== "1" &&
            !cancelled
          ) {
            setShowPush(true);
          }
        } else if ("Notification" in window) {
          const perm = Notification.permission;
          if (perm === "granted") {
            void ensurePushSubscribed(); // 허용돼 있으면 구독만 갱신(배너 X)
          } else if (window.sessionStorage.getItem(PUSH_SNOOZE) !== "1") {
            // 권한이 없으면(기본/차단) 계속 요청 — 기기 종류 안 가림. 세션 스누즈만.
            if (!cancelled) {
              setPushDenied(perm === "denied");
              setShowPush(true);
            }
          }
        }
      } catch {
        /* 무시 */
      }
      // 걸음수(네이티브 앱에서만 의미)
      try {
        if (native && window.localStorage.getItem(STEPS_DISMISS) !== "1") {
          const steps = await getStepsState();
          if (!cancelled) setShowSteps(steps.status !== "granted");
        }
      } catch {
        /* 무시 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function allowPush() {
    setBusy("push");
    try {
      if (isNativeApp()) {
        await registerNativePush();
      } else {
        const p = await Notification.requestPermission();
        if (p === "granted") await ensurePushSubscribed();
      }
    } catch {
      /* 무시 */
    } finally {
      setBusy(null);
      // 허용/거부 상관없이 무조건 닫는다(안 닫히면 버그로 오해).
      setShowPush(false);
    }
  }
  function dismissPush() {
    // 이번 세션만 숨김 — 새로고침/재접속하면 권한 없을 때 다시 요청.
    try {
      window.sessionStorage.setItem(PUSH_SNOOZE, "1");
    } catch {
      /* 무시 */
    }
    setShowPush(false);
  }

  async function allowSteps() {
    setBusy("steps");
    try {
      const r = await connectSteps();
      if (r.ok) setShowSteps(false);
    } catch {
      /* 무시 */
    } finally {
      setBusy(null);
    }
  }
  function dismissSteps() {
    try {
      window.localStorage.setItem(STEPS_DISMISS, "1");
    } catch {
      /* 무시 */
    }
    setShowSteps(false);
  }

  const kind = pickNudge({ push: showPush, steps: showSteps });
  if (!kind) return null;

  const isPush = kind === "push";
  const Icon = isPush ? Bell : Footprints;
  const text = isPush
    ? pushDenied
      ? "알림이 차단돼 있어요. 기기 설정에서 허용해 주세요."
      : "알림을 켜면 운동 리마인더를 받아요"
    : "걸음수를 연동하면 캘린더에 자동으로 기록돼요";
  const dismissLabel = isPush ? "나중에" : "다시는 안 보기";

  return (
    <div
      data-testid="permission-nudge"
      data-kind={kind}
      className="app-card flex items-center gap-3 py-2 pl-3.5 pr-2"
    >
      <Icon aria-hidden="true" size={16} className="shrink-0 text-brand" />
      <p className="text-safe min-w-0 flex-1 text-sm leading-5 text-zinc-700 dark:text-zinc-300">
        {text}
      </p>
      <button
        type="button"
        onClick={isPush ? allowPush : allowSteps}
        disabled={busy !== null}
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[10px] px-2.5 text-sm font-semibold text-brand transition hover:bg-brand-soft disabled:opacity-50"
      >
        {busy ? (
          <Loader2 aria-hidden="true" size={14} className="animate-spin" />
        ) : null}
        {isPush ? "켜기" : "연동"}
      </button>
      <button
        type="button"
        onClick={isPush ? dismissPush : dismissSteps}
        disabled={busy !== null}
        aria-label={dismissLabel}
        title={dismissLabel}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200"
      >
        <X aria-hidden="true" size={16} />
      </button>
    </div>
  );
}
