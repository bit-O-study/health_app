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

// 운동 종료 알림(예/아니오) 클릭 → 열린 앱 창에 응답 전달. 없으면 /routine 을 연다.
self.addEventListener("notificationclick", (event) => {
  const action = event.action || ""; // 'yes' | 'no' | '' (본문 클릭)
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        client.postMessage({ type: "workout-end-response", action });
      }
      if (clients.length > 0) {
        await clients[0].focus();
      } else {
        await self.clients.openWindow("/routine");
      }
    })(),
  );
});
