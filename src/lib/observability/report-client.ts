"use client";

import { isNativeApp } from "@/lib/platform/is-native-app";
import {
  deviceLabelFrom,
  enqueueAppEvent,
  normalizeAppEvent,
  type AppEvent,
  type AppEventKind,
} from "@/lib/observability/app-event";

/**
 * 기기 쪽 오류 보고 — 로드맵 1.3.
 *
 * 바로 보내지 않고 **localStorage 대기열에 넣었다가 나중에 보낸다.** 이유가 셋이다.
 *  1) 로그인 실패는 아직 로그인 전이라 보낼 수가 없다 → 로그인 뒤에 붙여 보낸다.
 *  2) WebView 가 죽는 순간의 사건은 요청이 끝나기 전에 같이 죽는다 → 다음 부팅에 보낸다.
 *  3) 오프라인·서버 오류여도 사라지지 않는다.
 *
 * **여기 함수는 절대 던지지 않는다.** localStorage 가 막혀 있든 서버가 죽어 있든
 * 호출부(로그인·저장·푸시 등록)는 그대로 진행해야 한다.
 *
 * 서버 액션은 `flushAppEvents` 안에서 **동적으로** 불러온다. 정적으로 import 하면
 * 이 파일을 쓰는 모든 모듈(걸음수 브리지·로그인 폼·운동모드…)의 의존 그래프에
 * 서버 모듈이 얹혀, 그 모듈만 쓰는 순수 단위 테스트까지 supabase 환경변수를
 * 요구하게 된다(실제로 steps-state·steps-diag 테스트가 그렇게 깨졌다).
 */

const QUEUE_KEY = "heltch.appEvents";

/** 네이티브 브리지가 앱 버전을 알려주면 그걸 쓴다(다음 APK 부터). */
type NativeVersionBridge = { appVersion?: () => string };

function readQueue(): AppEvent[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 저장돼 있던 값도 그대로 믿지 않는다(형식이 바뀌었을 수 있다).
    const now = Date.now();
    return parsed
      .map((v) => normalizeAppEvent(v as never, now))
      .filter((v): v is AppEvent => v !== null);
  } catch {
    return [];
  }
}

function writeQueue(queue: readonly AppEvent[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* 저장 공간이 없거나 막혀 있으면 이번 사건은 포기한다 — 기능이 우선. */
  }
}

/** 지금 환경(플랫폼·버전·기기) — 사건마다 같이 남긴다. */
function environment(): {
  platform: "android" | "web";
  appVersion: string;
  device: string;
} {
  let appVersion = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
  try {
    const bridge = (window as unknown as { HelssuNative?: NativeVersionBridge })
      .HelssuNative;
    const native = bridge?.appVersion?.();
    // 네이티브 앱은 원격 웹을 띄우므로 둘 다 의미가 있다 — 앱버전+웹빌드로 남긴다.
    if (typeof native === "string" && native !== "") {
      appVersion = appVersion === "" ? native : `${native}+${appVersion}`;
    }
  } catch {
    /* 브리지가 없거나 던지면 웹 빌드 아이디만 쓴다. */
  }
  return {
    platform: isNativeApp() ? "android" : "web",
    appVersion,
    device: deviceLabelFrom(
      typeof navigator === "undefined" ? "" : navigator.userAgent,
    ),
  };
}

/**
 * 사건을 대기열에 넣는다(전송은 `flushAppEvents`).
 * @param message 오류 문구. 세탁은 `app-event.ts` 가 하지만, 애초에 사용자가 입력한
 *   내용(메모·글 본문 등)을 넘기지 말 것 — 세탁은 마지막 방어선이지 허가가 아니다.
 */
export function reportAppEvent(
  kind: AppEventKind,
  opts: { message?: string; value?: number; route?: string } = {},
): void {
  try {
    if (typeof window === "undefined") return;
    const now = Date.now();
    const env = environment();
    const event = normalizeAppEvent(
      {
        kind,
        route: opts.route ?? window.location.pathname,
        message: opts.message ?? "",
        value: opts.value ?? null,
        occurredAt: now,
        count: 1,
        ...env,
      },
      now,
    );
    if (!event) return;
    writeQueue(enqueueAppEvent(readQueue(), event, now));
  } catch {
    /* noop — 관측이 기능을 막지 않는다. */
  }
}

/** 이미 전송이 돌고 있으면 겹쳐 부르지 않는다(부팅 직후 여러 곳에서 불린다). */
let flushing = false;

/**
 * 모아 둔 사건을 보낸다. 서버가 받아들였다고 답한 경우에만 대기열을 비운다
 * (로그인 전이거나 저장에 실패했으면 그대로 두고 다음 기회에 다시 보낸다).
 */
export async function flushAppEvents(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const queue = readQueue();
    if (queue.length === 0) return;
    const { reportAppEventsAction } = await import(
      "@/features/observability/report-actions"
    );
    const res = await reportAppEventsAction(
      queue.map((e) => ({
        kind: e.kind,
        route: e.route,
        message: e.message,
        appVersion: e.appVersion,
        platform: e.platform,
        device: e.device,
        value: e.value,
        occurredAt: e.occurredAt,
        count: e.count,
      })),
    );
    if (res.accepted) writeQueue([]);
  } catch {
    /* 다음 기회에 다시 보낸다. */
  } finally {
    flushing = false;
  }
}
