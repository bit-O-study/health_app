"use client";

import { useEffect, useState } from "react";
import { Bell, Footprints, Loader2 } from "lucide-react";

import { ensurePushSubscribed } from "@/features/notifications/push-client";
import {
  hasNativePushPermission,
  registerNativePush,
} from "@/features/notifications/native-push";
import { connectSteps, getStepsState } from "@/features/health/steps-native";
import { isNativeApp } from "@/lib/platform/is-native-app";

// 알림 권한은 받을 때까지 계속 요청한다 → '나중에'는 이번 세션만 숨김(sessionStorage).
// 새로고침/재접속하면 권한이 아직 없으면 다시 뜬다.
const PUSH_SNOOZE = "heltch.nudge.push.snooze";
// 걸음수 넛지는 '다시는 안 보기'가 영구(설치/브라우저당).
const STEPS_DISMISS = "heltch.nudge.steps.dismissed";

/**
 * 권한 넛지 — 접속할 때마다(세션마다) 확인해서:
 * - 앱 푸시 알림 권한이 아직이면 '알림 켜기' 배너
 * - (네이티브) 걸음수(삼성헬스/Health Connect) 권한이 아직이면 '걸음수 연동' 배너
 * 를 띄운다. 이미 허용됐으면 조용히 넘어가고, '다시는 안 보기'를 누르면 영구히 숨긴다.
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
      // 허용/거부 상관없이 무조건 배너를 닫는다(안 닫히면 버그로 오해).
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

  if (!showPush && !showSteps) return null;

  return (
    <div className="space-y-2">
      {showPush ? (
        <NudgeCard
          icon={<Bell aria-hidden="true" size={18} />}
          title="알림 켜기"
          desc={
            pushDenied
              ? "알림이 차단돼 있어요. 브라우저/앱 설정에서 알림을 허용해 주세요."
              : "그룹 응원·운동 리마인더를 알림으로 받아보세요."
          }
          busy={busy === "push"}
          onAllow={allowPush}
          onDismiss={dismissPush}
          dismissLabel="나중에"
        />
      ) : null}
      {showSteps ? (
        <NudgeCard
          icon={<Footprints aria-hidden="true" size={18} />}
          title="걸음수 연동"
          desc="삼성헬스(Health Connect) 걸음수를 연동하면 캘린더에 자동 반영돼요."
          busy={busy === "steps"}
          onAllow={allowSteps}
          onDismiss={dismissSteps}
        />
      ) : null}
    </div>
  );
}

function NudgeCard({
  icon,
  title,
  desc,
  busy,
  onAllow,
  onDismiss,
  dismissLabel = "다시는 안 보기",
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  busy: boolean;
  onAllow: () => void;
  onDismiss: () => void;
  dismissLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
          {title}
        </p>
        <p className="text-[11px] leading-4 text-emerald-700/80 dark:text-emerald-300/80">
          {desc}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <button
          type="button"
          onClick={onAllow}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 aria-hidden="true" size={13} className="animate-spin" />
          ) : null}
          허용
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={busy}
          className="text-[10px] font-semibold text-emerald-700/70 underline-offset-2 hover:underline dark:text-emerald-300/70"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}
