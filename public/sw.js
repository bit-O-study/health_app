/**
 * 최소 service worker.
 *
 * 안드로이드 Chrome / TWA / PWABuilder 의 PWA 인스톨 기준은
 * "fetch 핸들러를 가진 service worker 가 등록되어 있어야 한다" 이다.
 * 캐싱 전략은 의도적으로 두지 않는다 — Next.js 가 자체 캐시/리벨리데이션을
 * 하고 있고, SW 캐싱과 충돌하면 디버깅이 어려워진다.
 * 필요해지면 offline shell 캐싱은 그때 추가.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // 같은 출처(자기 사이트) 요청은 그냥 통과 (no respondWith).
  // 외부 출처(tesseract.js CDN 의 WASM·언어 데이터 등)는 SW 가 손 안 대게
  // 즉시 return — 브라우저 기본 fetch 가 100% 그대로 동작.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
});

// ── 휴식 타이머 예약 알림 ──────────────────────────────────────────────
// 페이지(rest-timer.tsx)가 휴식 시작 시 종료시각을 SW 에 등록한다. 페이지 JS 는
// 백그라운드에서 얼어붙어(특히 iOS) 종료 시각에 알림을 못 띄우지만, SW 는 여기서
// 자체 setTimeout 으로 만료를 감지해 showNotification 한다. 앱이 포그라운드(보이는
// 창)면 화면 카드/비프로 충분하니 알림은 생략한다.
let restTimerId = null;

function clearRestTimer() {
  if (restTimerId !== null) {
    clearTimeout(restTimerId);
    restTimerId = null;
  }
}

self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (data.type === "schedule-rest") {
    clearRestTimer();
    const endsAt = Number(data.endsAt) || 0;
    const delay = endsAt - Date.now();
    // 비정상(과거·1시간 초과)이면 예약 안 함.
    if (delay < 0 || delay > 60 * 60 * 1000) return;

    const title = data.title || "휴식 완료! 💪";
    const body = data.body || "다음 세트를 시작하세요.";

    const fire = async () => {
      clearRestTimer();
      // 보이는 창이 있으면(앱 사용 중) 시스템 알림 생략 — 화면 카드/비프가 처리.
      const wins = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const visible = wins.some(
        (c) => c.visibilityState === "visible" || c.focused,
      );
      if (visible) return;
      await self.registration.showNotification(title, {
        body,
        tag: "rest-timer",
        renotify: true,
        data: { type: "rest", url: "/routine" },
        vibrate: [180, 80, 180],
      });
    };

    // waitUntil 로 SW 를 만료 시각까지 살려두도록 힌트(짧은 휴식엔 유효).
    const keepAlive = new Promise((resolve) => {
      restTimerId = setTimeout(() => {
        fire().finally(resolve);
      }, Math.max(0, delay));
    });
    if (typeof event.waitUntil === "function") event.waitUntil(keepAlive);
    return;
  }

  if (data.type === "cancel-rest") {
    clearRestTimer();
    return;
  }
});

// 웹푸시 수신(앱이 닫혀 있어도) → 종료 확인 알림 표시(예/아니오 버튼).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "헬쑤";
  const body = data.body || "";
  const type = data.type || "workout-end";

  if (type === "workout-end") {
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        tag: "workout-end",
        requireInteraction: true,
        data: { type },
        actions: [
          { action: "yes", title: "예" },
          { action: "no", title: "아니오" },
        ],
      }),
    );
    return;
  }

  // 일반 알림(그룹 응원 등) — 예/아니오 없이 표시, 본문 클릭 시 url 로 이동.
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: type,
      data: { type, url: data.url || "/" },
    }),
  );
});

// 운동 종료 알림(예/아니오) 클릭 처리.
// - 앱이 열려 있으면: 클라이언트에 응답 전달(앱 내 로직이 처리).
// - 앱이 닫혀 있으면: SW 가 직접 서버(/api/workout/end)에 알림(쿠키 포함) 후 앱을 연다.
self.addEventListener("notificationclick", (event) => {
  const action = event.action || ""; // 'yes' | 'no' | '' (본문 클릭)
  const ndata = event.notification.data || {};
  const type = ndata.type || "workout-end";
  event.notification.close();

  // 일반 알림(그룹 응원 등) — 저장된 url 로 앱을 연다(있으면 기존 창 포커스).
  if (type !== "workout-end") {
    const url = ndata.url || "/";
    event.waitUntil(
      (async () => {
        const wins = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        const client = wins[0];
        if (client) {
          try {
            await client.navigate(url);
          } catch {
            /* navigate 미지원/실패 — 포커스만 */
          }
          return client.focus();
        }
        return self.clients.openWindow(url);
      })(),
    );
    return;
  }

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      if (clients.length > 0) {
        for (const client of clients) {
          client.postMessage({ type: "workout-end-response", action });
        }
        await clients[0].focus();
        return;
      }
      // 열린 창이 없으면 서버에 직접 반영(예: 휴식 처리+종료 / 아니오: 스누즈).
      if (action === "yes" || action === "no") {
        try {
          await fetch("/api/workout/end", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ action }),
          });
        } catch {
          /* 네트워크 실패 시 무시 — 앱 열어 사용자가 처리 */
        }
      }
      await self.clients.openWindow("/routine");
    })(),
  );
});
