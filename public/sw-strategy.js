/**
 * service worker 가 **요청마다 무엇을 할지** 정하는 순수 판정 — `sw.js` 가
 * `importScripts` 로 불러 쓰고, 단위테스트가 같은 파일을 그대로 검증한다.
 *
 * 🔴 왜 sw.js 안에 안 쓰고 여기로 뺐나
 * service worker 는 **한번 잘못 깔면 사용자 브라우저에 남아** 배포해도 안 고쳐진다
 * (활성화 전까지 옛 SW 가 계속 응답한다). 화면으로 확인할 수 없는 코드라 더더욱
 * 테스트가 필요한데, `sw.js` 는 `self.addEventListener` 덩어리라 테스트가 못 부른다.
 * 판정만 떼어 두면 "무엇을 캐시하고 무엇을 절대 안 하는지" 를 못 박을 수 있다.
 *
 * ## 이 SW 가 하지 **않는** 것 — 개인 데이터가 담긴 화면 캐싱
 * 가장 흔한 실수는 방문한 페이지의 HTML 을 캐시해 두고 오프라인에 다시 보여주는 것이다.
 * 이 앱의 화면에는 **어제의 루틴·완료 기록·체중**이 서버 렌더로 박혀 있다. 그걸 다시
 * 띄우면 사용자는 그게 오늘 값인 줄 안다 — 빈 화면보다 나쁘다. 그래서 실패한 화면
 * 이동은 **개인 데이터가 하나도 없는 `/offline.html`** 로 보낸다.
 */

(function (root) {
  /** 캐시 이름. 배포마다 올리지 않아도 되지만, 규칙이 바뀌면 올려 옛 캐시를 버린다. */
  var CACHE_NAME = "helssu-shell-v1";

  /**
   * 설치할 때 미리 받아 두는 것. **오프라인 안내 화면 하나뿐이다.**
   * 여기에 앱 페이지를 넣기 시작하면 위에서 말한 '옛 데이터' 문제가 시작된다.
   */
  var PRECACHE = ["/offline.html"];

  /**
   * 캐시에 담아 두는 정적 파일 최대 개수.
   *
   * 🔴 왜 상한이 필요한가: 배포할 때마다 청크 파일명(해시)이 바뀌므로 옛 항목이
   * 지워지지 않고 **계속 쌓인다.** 저장공간을 많이 먹는 PWA 는 브라우저가 통째로
   * 비워 버려서(eviction) 오프라인 안내 화면까지 같이 날아간다. 오래된 것부터 버린다.
   */
  var MAX_STATIC_ENTRIES = 120;

  /**
   * 운동 시연 영상 캐시. 🔴 **셸 캐시와 다른 통**이다.
   * 영상은 한 통에 섞기엔 위험하다 — 용량이 커서 정리·퇴출이 자주 일어나는데,
   * 셸 캐시에 같이 있으면 그 와중에 `offline.html`(마지막 보루)까지 날아간다.
   */
  var MEDIA_CACHE = "helssu-media-v1";

  /**
   * 영상 한 개의 상한. 넘으면 **캐시하지 않고 네트워크로 흘려보낸다**(재생은 정상).
   * 실측: 181개 중 175개가 0.5MB 미만, 1.5MB 초과는 4개뿐이다. 그 4개를 담겠다고
   * 예산을 다 쓰면 자주 보는 나머지가 밀려난다.
   */
  var MAX_MEDIA_BYTES = 2 * 1024 * 1024;

  /**
   * 영상 캐시 전체 예산. 개수가 아니라 **바이트**로 묶는다 —
   * 개수로 묶으면 평균 181KB 와 2MB 짜리가 같은 한 칸을 차지해 실제 용량을 못 정한다.
   * 24MB 면 자주 보는 100개 남짓이 들어간다(전체 카탈로그는 1,351종이라 다 담을 수 없고,
   * 담아서도 안 된다 — 저장공간을 많이 먹는 PWA 는 브라우저가 통째로 비워 버린다).
   */
  var MEDIA_BUDGET_BYTES = 24 * 1024 * 1024;

  /**
   * @returns {"immutable" | "navigate" | "bypass"}
   *  - `immutable` : 내용해시가 박힌 빌드 산출물 → 캐시 우선(있으면 네트워크 안 감).
   *  - `navigate`  : 화면 이동 → **네트워크 우선**, 실패하면 오프라인 안내.
   *  - `bypass`    : SW 가 손대지 않는다.
   */
  function decide(req) {
    // 🔴 GET 이 아니면 무조건 통과. 서버 액션(완료 저장)·로그인은 전부 POST 다.
    //   여기에 손대면 운동 기록이 조용히 사라지거나 두 번 저장된다.
    if (req.method !== "GET") return "bypass";

    var url;
    try {
      url = new URL(req.url);
    } catch (_e) {
      return "bypass";
    }

    // 외부 출처(MediaPipe WASM·운동 사진 CDN 등)는 건드리지 않는다 — 우리가 통제하는
    // 것만 캐시한다. 남의 CDN 응답을 우리 캐시에 담으면 만료를 우리가 못 관리한다.
    if (url.origin !== root.location.origin) return "bypass";

    // 인증 콜백·API·서버 액션 라우트는 항상 서버에 물어야 한다.
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/"))
      return "bypass";

    // 🔴 RSC 요청(App Router 소프트 내비게이션)은 캐시하지 않는다. 화면 데이터가
    //   그대로 들어 있어 '옛 데이터' 문제가 똑같이 생기고, 빌드가 바뀌면 모양도 바뀐다.
    if (url.searchParams.has("_rsc")) return "bypass";
    if (req.headers && req.headers.get && req.headers.get("RSC")) return "bypass";

    // 파일명에 내용해시가 들어가는 빌드 산출물 — 같은 URL 이면 내용이 절대 안 바뀐다.
    // 그래서 캐시 우선이 안전하고, 지하 와이파이에서 청크 로드 실패도 같이 줄어든다.
    if (url.pathname.startsWith("/_next/static/")) return "immutable";

    // 운동 시연 영상 — 본 것만 담는다(미리 받지 않는다). 1,351종을 다 받으면 200MB 다.
    // 🔴 Range 요청이 오므로 전용 처리로 보낸다. 그냥 캐시하면 재생이 깨진다.
    if (
      url.pathname.startsWith("/exercise-guides/") &&
      /\.(mp4|webm)$/.test(url.pathname)
    )
      return "media";

    if (req.mode === "navigate") return "navigate";

    return "bypass";
  }

  /**
   * `Range: bytes=...` 헤더를 캐시된 전체 응답에 맞춰 해석한다.
   *
   * 🔴 이게 왜 필요한가 — `<video preload="metadata">` 는 파일 전체가 아니라
   * **앞부분만** 달라고 한다(`bytes=0-`). 캐시된 200 응답을 그대로 돌려주면 브라우저가
   * "Range 를 요청했는데 전체가 왔다" 로 보고 탐색(seek)이 망가지거나 재생이 멈춘다.
   * 그래서 캐시에는 **전체만** 담고, 요청이 오면 여기서 잘라 206 으로 만들어 준다.
   *
   * @returns `null` = Range 가 없거나 우리가 못 다루는 형식(전체를 200 으로 준다)
   *          `{ok:false}` = 범위가 파일 밖(416 을 줘야 한다)
   *          `{ok:true, start, end}` = 이 구간을 206 으로
   */
  function parseRange(header, size) {
    if (!header || typeof header !== "string") return null;
    // 다중 범위(`bytes=0-9,20-29`)는 multipart 응답이 필요해 다루지 않는다.
    // Range 를 무시하고 전체를 주는 것도 규격상 허용이라 그쪽이 안전하다.
    var m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
    if (!m) return null;
    var start;
    var end;
    if (m[1] === "") {
      // `bytes=-500` = 끝에서 500바이트.
      var suffix = Number(m[2]);
      if (!m[2] || suffix <= 0) return { ok: false };
      start = Math.max(0, size - suffix);
      end = size - 1;
    } else {
      start = Number(m[1]);
      end = m[2] === "" ? size - 1 : Number(m[2]);
      if (end > size - 1) end = size - 1; // 끝을 넘겨 달라고 해도 파일 끝까지만
    }
    if (!(start >= 0) || start > end || start >= size) return { ok: false };
    return { ok: true, start: start, end: end };
  }

  root.swStrategy = {
    CACHE_NAME: CACHE_NAME,
    PRECACHE: PRECACHE,
    MAX_STATIC_ENTRIES: MAX_STATIC_ENTRIES,
    MEDIA_CACHE: MEDIA_CACHE,
    MAX_MEDIA_BYTES: MAX_MEDIA_BYTES,
    MEDIA_BUDGET_BYTES: MEDIA_BUDGET_BYTES,
    parseRange: parseRange,
    OFFLINE_URL: "/offline.html",
    decide: decide,
  };
})(typeof self !== "undefined" ? self : globalThis);
