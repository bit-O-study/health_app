/**
 * service worker — 오프라인 셸 캐싱 + 휴식 타이머 알림 + 웹푸시.
 *
 * ## 무엇을 캐시하고 무엇을 **안** 하는가 (판정은 `sw-strategy.js`)
 * - `/_next/static/**` : 파일명에 내용해시가 있어 같은 URL 이면 내용이 안 바뀐다.
 *   → 캐시 우선. 지하 와이파이에서 청크 로드가 실패해 화면이 죽던 것도 같이 줄어든다.
 * - 화면 이동(navigate) : **네트워크 우선.** 성공하면 항상 서버 응답을 쓴다.
 *   실패했을 때만 `/offline.html` 로 보낸다.
 * - 그 밖(POST·API·RSC·외부 출처) : SW 가 손대지 않는다.
 *
 * ## 🔴 방문한 화면의 HTML 은 캐시하지 않는다
 * 예전 이 파일의 주석은 "Next 자체 캐시와 충돌하면 디버깅이 어렵다"며 캐싱을 통째로
 * 비워 뒀다. 그 걱정의 실체가 바로 이것이다 — 화면 HTML 을 담아 두면 **어제의
 * 루틴·완료 기록·체중**이 오늘 값인 척 다시 뜬다. 빈 화면보다 나쁘다.
 * 그래서 화면은 네트워크가 유일한 출처이고, 캐시는 **개인 데이터가 없는 안내 화면**과
 * **해시 박힌 정적 파일**만 담는다. 이러면 배포 후 옛 화면이 남는 일이 구조적으로 없다.
 *
 * ## 새 배포
 * `install` 에서 `skipWaiting`, `activate` 에서 `clients.claim()` + **다른 이름의 캐시
 * 전부 삭제**. 규칙이 바뀌면 `sw-strategy.js` 의 `CACHE_NAME` 만 올리면 된다.
 */
importScripts("/sw-strategy.js");

const {
  CACHE_NAME,
  PRECACHE,
  OFFLINE_URL,
  MAX_STATIC_ENTRIES,
  MEDIA_CACHE,
  MAX_MEDIA_BYTES,
  MEDIA_BUDGET_BYTES,
  decide,
  parseRange,
} = self.swStrategy;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        // 🔴 `reload` — 브라우저 HTTP 캐시에 있던 옛 offline.html 을 그대로 담지 않게.
        await cache.addAll(
          PRECACHE.map((u) => new Request(u, { cache: "reload" })),
        );
      } catch (e) {
        // 안내 화면을 못 받아도 SW 설치 자체는 성공시킨다 — 알림·푸시는 계속 돌아야 한다.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 이름이 다른 옛 캐시는 전부 버린다(규칙이 바뀌면 옛 규칙으로 담긴 것도 같이 나간다).
      // 🔴 영상 캐시는 **남긴다.** 배포와 상관없이 같은 URL = 같은 파일이고,
      //    지우면 사용자가 다시 수십 MB 를 받아야 한다.
      const keep = [CACHE_NAME, MEDIA_CACHE];
      const names = await caches.keys();
      await Promise.all(
        names.map((n) => (keep.includes(n) ? null : caches.delete(n))),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const how = decide(event.request);
  if (how === "bypass") return; // respondWith 안 함 = 브라우저 기본 동작 그대로

  if (how === "immutable") {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  if (how === "media") {
    event.respondWith(mediaWithRange(event.request));
    return;
  }
  event.respondWith(networkFirstNavigate(event.request));
});

/** 해시 박힌 정적 파일 — 캐시에 있으면 네트워크에 가지 않는다. */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  // 200 만 담는다. opaque/에러 응답을 담으면 그 URL 이 영영 깨진 채로 굳는다.
  if (res && res.status === 200 && res.type === "basic") {
    await cache.put(request, res.clone()).catch(() => {});
    await trim(cache);
  }
  return res;
}

/**
 * 오래된 정적 항목부터 버려 캐시 크기를 묶어 둔다.
 * 배포마다 청크 해시가 바뀌어 옛 항목이 안 지워지고 쌓이는데, 저장공간을 많이 먹으면
 * 브라우저가 이 캐시를 **통째로** 비워 오프라인 안내 화면까지 같이 날아간다.
 * `cache.keys()` 는 넣은 순서대로 주므로 앞에서부터 지우면 오래된 것부터 나간다.
 */
async function trim(cache) {
  try {
    const keys = await cache.keys();
    // 미리 받아 둔 안내 화면은 세지도, 지우지도 않는다 — 그게 마지막 보루다.
    const statics = keys.filter((k) => !PRECACHE.includes(new URL(k.url).pathname));
    const over = statics.length - MAX_STATIC_ENTRIES;
    for (let i = 0; i < over; i++) await cache.delete(statics[i]);
  } catch (e) {
    /* 정리 실패는 치명적이지 않다 — 다음 요청에서 다시 시도된다 */
  }
}

/**
 * 화면 이동 — 네트워크가 유일한 출처. 실패했을 때만 안내 화면.
 * 🔴 성공 응답을 **캐시에 담지 않는다.** 담는 순간 옛 개인 데이터가 살아난다.
 */
async function networkFirstNavigate(request) {
  try {
    return await fetch(request);
  } catch (e) {
    const cache = await caches.open(CACHE_NAME);
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    // 안내 화면조차 없으면(설치 중 실패) 브라우저 기본 오류 화면으로 떨어진다.
    throw e;
  }
}

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

/**
 * 운동 시연 영상 — 본 것만 담고, 담은 건 오프라인에서도 재생된다.
 *
 * 🔴 **캐시에는 언제나 전체(200)만 담는다.** `<video preload="metadata">` 는
 * `bytes=0-` 같은 부분 요청을 보내는데, 그 206 응답을 캐시해 두면 다음에 전체를
 * 요청했을 때 잘린 조각이 나가 재생이 깨진다. 그래서 캐시 키는 Range 를 뗀 URL 이고,
 * 부분 요청은 담아 둔 전체를 잘라 206 으로 만들어 준다(`parseRange`).
 */
async function mediaWithRange(request) {
  const range = request.headers.get("range");
  // 캐시 키·받아올 요청 모두 Range 없는 '전체' 요청이다.
  // 브라우저의 부분 다운로드 캐시와 섞지 않는다. 전체 파일은 아래 CacheStorage에 보관한다.
  const key = new Request(request.url, { cache: "no-store" });
  const cache = await caches.open(MEDIA_CACHE);

  let full = await cache.match(key);
  if (!full) {
    let res;
    try {
      res = await fetch(key);
    } catch (e) {
      // 오프라인인데 담아 둔 것도 없다 — 화면의 '다시 불러오기'가 받아 준다.
      throw e;
    }
    if (!res || res.status !== 200) return range ? fetch(request) : res;

    const len = Number(res.headers.get("content-length") || 0);
    // 너무 큰 파일은 담지 않는다. 이땐 원래 요청(Range 포함)을 그대로 네트워크에
    // 넘겨 브라우저가 스트리밍하게 둔다 — 6MB 를 메모리에 통째로 들고 자르지 않으려고.
    if (!len || len > MAX_MEDIA_BYTES) return range ? fetch(request) : res;

    await cache.put(key, res.clone()).catch(() => {});
    await trimMedia(cache);
    full = res;
  }

  if (!range) return full;

  const buf = await full.arrayBuffer();
  const r = parseRange(range, buf.byteLength);
  // 못 다루는 형식이면 전체를 준다(Range 무시는 규격상 허용).
  if (!r) return new Response(buf, { status: 200, headers: full.headers });
  if (!r.ok) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${buf.byteLength}` },
    });
  }
  return new Response(buf.slice(r.start, r.end + 1), {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": full.headers.get("content-type") || "video/mp4",
      "Content-Length": String(r.end - r.start + 1),
      "Content-Range": `bytes ${r.start}-${r.end}/${buf.byteLength}`,
      "Accept-Ranges": "bytes",
    },
  });
}

/**
 * 영상 캐시를 예산(바이트) 안으로 줄인다 — 오래된 것부터.
 *
 * 🔴 개수가 아니라 바이트로 재는 이유: 평균 181KB 와 2MB 짜리가 같은 한 칸을 차지하면
 * 실제 저장량을 정할 수가 없다. 크기는 **헤더만** 읽어 재므로(본문을 안 읽는다) 싸다.
 */
async function trimMedia(cache) {
  try {
    const keys = await cache.keys(); // 넣은 순서 = 오래된 것이 앞
    let total = 0;
    const sizes = [];
    for (const k of keys) {
      const res = await cache.match(k);
      const n = Number(res?.headers.get("content-length") || 0);
      sizes.push(n);
      total += n;
    }
    for (let i = 0; i < keys.length && total > MEDIA_BUDGET_BYTES; i++) {
      await cache.delete(keys[i]);
      total -= sizes[i];
    }
  } catch (e) {
    /* 정리 실패는 치명적이지 않다 — 다음 영상에서 다시 시도된다 */
  }
}
