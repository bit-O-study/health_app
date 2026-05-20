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

self.addEventListener("fetch", () => {
  // 네트워크 fetch 그대로 통과 (no-op handler — 인스톨 기준 충족)
});
