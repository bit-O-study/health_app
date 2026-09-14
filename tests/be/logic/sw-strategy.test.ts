import { readFileSync } from "node:fs";

import { beforeAll, describe, expect, it } from "vitest";

/**
 * service worker 의 요청 판정(`public/sw-strategy.js`).
 *
 * 🔴 왜 이걸 테스트로 못 박는가 — service worker 는 **한번 잘못 깔면 사용자
 * 브라우저에 남아** 배포해도 바로 안 고쳐진다. 그리고 "무엇을 캐시하면 안 되는지"는
 * 화면을 봐서는 알 수 없다. 여기 깨지면 운동 기록이 사라지거나(POST 를 건드림),
 * 어제 화면이 오늘 것처럼 뜬다(HTML 캐싱).
 */

type Decision = "immutable" | "navigate" | "media" | "bypass";
type Strategy = {
  CACHE_NAME: string;
  PRECACHE: string[];
  OFFLINE_URL: string;
  MAX_STATIC_ENTRIES: number;
  MEDIA_CACHE: string;
  MAX_MEDIA_BYTES: number;
  MEDIA_BUDGET_BYTES: number;
  decide: (req: FakeRequest) => Decision;
  parseRange: (
    header: string | null | undefined,
    size: number,
  ) => null | { ok: false } | { ok: true; start: number; end: number };
};

type FakeRequest = {
  url: string;
  method: string;
  mode?: string;
  headers: { get: (k: string) => string | null };
};

const ORIGIN = "https://helssu.example";

function req(
  url: string,
  opts: {
    method?: string;
    mode?: string;
    headers?: Record<string, string>;
  } = {},
): FakeRequest {
  const headers = opts.headers ?? {};
  return {
    url: url.startsWith("http") ? url : `${ORIGIN}${url}`,
    method: opts.method ?? "GET",
    mode: opts.mode ?? "no-cors",
    headers: { get: (k) => headers[k] ?? headers[k.toUpperCase()] ?? null },
  };
}

let strategy: Strategy;

beforeAll(() => {
  // `sw-strategy.js` 는 SW 가 `importScripts` 로 읽는 평범한 스크립트(모듈이 아니다).
  // 그래서 `import` 대신 **파일을 그대로 읽어 실행**한다 — 복사본을 테스트하면
  // 정작 배포되는 코드는 검증되지 않는다. (SW 는 잘못 깔리면 사용자 브라우저에
  // 남아 배포해도 바로 안 고쳐지므로, 여기서만큼은 진짜 파일이어야 한다.)
  (globalThis as unknown as { location: { origin: string } }).location = {
    origin: ORIGIN,
  };
  const src = readFileSync(
    new URL("../../../public/sw-strategy.js", import.meta.url),
    "utf8",
  );
  new Function(src)();
  strategy = (globalThis as unknown as { swStrategy: Strategy }).swStrategy;
});

describe("절대 손대면 안 되는 것", () => {
  it("POST 는 통과시킨다 — 서버 액션(운동 완료 저장)이 전부 POST 다", () => {
    // 여기 걸리면 기록이 조용히 사라지거나 두 번 저장된다.
    expect(strategy.decide(req("/routine", { method: "POST", mode: "navigate" })))
      .toBe("bypass");
    expect(strategy.decide(req("/", { method: "POST" }))).toBe("bypass");
  });

  it("POST 외의 쓰기 메서드도 통과", () => {
    for (const method of ["PUT", "PATCH", "DELETE", "HEAD"]) {
      expect(strategy.decide(req("/api/x", { method }))).toBe("bypass");
    }
  });

  it("외부 출처는 통과 — 남의 CDN 응답을 우리 캐시에 담지 않는다", () => {
    expect(
      strategy.decide(req("https://cdn.jsdelivr.net/npm/a.mjs")),
    ).toBe("bypass");
    expect(
      strategy.decide(
        req("https://storage.googleapis.com/m/face_landmarker.task"),
      ),
    ).toBe("bypass");
  });

  it("API·인증 콜백은 항상 서버에 묻는다", () => {
    expect(strategy.decide(req("/api/workout/end"))).toBe("bypass");
    expect(strategy.decide(req("/auth/callback?code=abc", { mode: "navigate" })))
      .toBe("bypass");
  });

  it("RSC 요청(소프트 내비게이션)은 캐시하지 않는다 — 화면 데이터가 들어 있다", () => {
    expect(strategy.decide(req("/routine?_rsc=1a2b3c"))).toBe("bypass");
    expect(strategy.decide(req("/routine", { headers: { RSC: "1" } }))).toBe(
      "bypass",
    );
  });
});

describe("캐시 우선 — 내용해시가 박힌 빌드 산출물만", () => {
  it("/_next/static 아래는 캐시 우선", () => {
    expect(strategy.decide(req("/_next/static/chunks/main-abc123.js"))).toBe(
      "immutable",
    );
    expect(strategy.decide(req("/_next/static/css/a1b2.css"))).toBe("immutable");
  });

  it("/_next/image 같은 동적 경로는 캐시 우선이 아니다 — URL 이 같아도 내용이 바뀐다", () => {
    expect(strategy.decide(req("/_next/image?url=%2Fa.png&w=64"))).toBe("bypass");
  });

  it("운동 시연 영상은 전용 처리로 보낸다(Range 요청 때문에 일반 캐시로는 안 된다)", () => {
    expect(strategy.decide(req("/exercise-guides/ai-v3/squat.mp4"))).toBe("media");
    expect(strategy.decide(req("/exercise-guides/ai-v2/bench-press.mp4"))).toBe(
      "media",
    );
    expect(strategy.decide(req("/exercise-guides/previews/a.webm"))).toBe("media");
  });

  it("영상이 아닌 public 파일은 아직 캐시하지 않는다", () => {
    expect(strategy.decide(req("/exercise-guides/SOURCES.md"))).toBe("bypass");
    expect(strategy.decide(req("/icon-192-20260702b.png"))).toBe("bypass");
  });

  it("영상 캐시는 셸과 **다른 통**이다 — 영상 정리가 오프라인 안내 화면을 날리면 안 된다", () => {
    expect(strategy.MEDIA_CACHE).not.toBe(strategy.CACHE_NAME);
  });

  it("영상 상한·예산이 숫자다(undefined 면 NaN 비교로 정리가 조용히 멈춘다)", () => {
    expect(strategy.MAX_MEDIA_BYTES).toBeGreaterThan(0);
    expect(strategy.MEDIA_BUDGET_BYTES).toBeGreaterThan(strategy.MAX_MEDIA_BYTES);
  });
});

describe("화면 이동 — 네트워크 우선, 실패하면 안내 화면", () => {
  it("navigate 요청은 navigate 판정", () => {
    expect(strategy.decide(req("/", { mode: "navigate" }))).toBe("navigate");
    expect(strategy.decide(req("/routine", { mode: "navigate" }))).toBe(
      "navigate",
    );
  });

  it("navigate 가 아닌 일반 GET 은 통과", () => {
    expect(strategy.decide(req("/routine"))).toBe("bypass");
  });
});

describe("미리 받아 두는 것", () => {
  it("개인 데이터가 없는 안내 화면 하나뿐이다", () => {
    // 🔴 여기에 앱 페이지가 들어가기 시작하면 '어제 화면이 오늘처럼 뜨는' 문제가 시작된다.
    expect(strategy.PRECACHE).toEqual(["/offline.html"]);
    expect(strategy.OFFLINE_URL).toBe("/offline.html");
  });

  it("캐시 이름이 있다 — activate 에서 이 이름이 아닌 캐시는 전부 지운다", () => {
    expect(strategy.CACHE_NAME).toMatch(/^helssu-/);
  });

  it("정적 캐시 상한이 **숫자**로 있다", () => {
    // 🔴 여기가 undefined 가 되면 sw.js 의 `length - undefined` 가 NaN 이 되어
    //   정리 루프가 한 번도 안 돌고, 캐시가 **조용히** 무한히 커진다.
    //   저장공간을 많이 먹으면 브라우저가 캐시를 통째로 비워 오프라인 안내 화면까지
    //   날아간다 — 화면으로는 절대 못 알아채는 고장이라 여기서 막는다.
    expect(typeof strategy.MAX_STATIC_ENTRIES).toBe("number");
    expect(strategy.MAX_STATIC_ENTRIES).toBeGreaterThan(0);
    expect(Number.isFinite(strategy.MAX_STATIC_ENTRIES)).toBe(true);
  });
});

describe("망가진 입력", () => {
  it("URL 이 파싱 안 되면 통과시킨다(SW 가 터지면 앱 전체가 멈춘다)", () => {
    expect(strategy.decide(req("not a url"))).toBe("bypass");
  });

  it("headers.get 이 없어도 터지지 않는다", () => {
    const bare = {
      url: `${ORIGIN}/_next/static/chunks/x.js`,
      method: "GET",
    } as unknown as FakeRequest;
    expect(strategy.decide(bare)).toBe("immutable");
  });
});

describe("Range 해석 — 여기가 틀리면 영상이 재생되다 멈춘다", () => {
  const SIZE = 1000;
  const pr = (h: string | null | undefined, size = SIZE) =>
    strategy.parseRange(h, size);

  it("Range 가 없으면 전체를 준다", () => {
    expect(pr(null)).toBeNull();
    expect(pr(undefined)).toBeNull();
    expect(pr("")).toBeNull();
  });

  it("bytes=0- (preload=metadata 가 실제로 보내는 형태) → 파일 끝까지", () => {
    expect(pr("bytes=0-")).toEqual({ ok: true, start: 0, end: 999 });
  });

  it("닫힌 구간", () => {
    expect(pr("bytes=0-99")).toEqual({ ok: true, start: 0, end: 99 });
    expect(pr("bytes=500-599")).toEqual({ ok: true, start: 500, end: 599 });
  });

  it("열린 끝 — 중간부터 끝까지(탐색 seek 이 이 형태다)", () => {
    expect(pr("bytes=500-")).toEqual({ ok: true, start: 500, end: 999 });
  });

  it("끝을 넘겨 달라고 하면 파일 끝까지만 준다", () => {
    expect(pr("bytes=900-99999")).toEqual({ ok: true, start: 900, end: 999 });
  });

  it("뒤에서 N바이트(bytes=-500) — moov atom 이 끝에 있는 mp4 가 이걸 쓴다", () => {
    expect(pr("bytes=-500")).toEqual({ ok: true, start: 500, end: 999 });
  });

  it("파일보다 큰 suffix 는 처음부터", () => {
    expect(pr("bytes=-99999")).toEqual({ ok: true, start: 0, end: 999 });
  });

  it("공백이 붙어도 읽는다", () => {
    expect(pr("  bytes=0-9  ")).toEqual({ ok: true, start: 0, end: 9 });
  });

  it("파일 밖이면 416 — 전체를 주면 브라우저가 이상한 데이터를 읽는다", () => {
    expect(pr("bytes=1000-")).toEqual({ ok: false });
    expect(pr("bytes=2000-3000")).toEqual({ ok: false });
    expect(pr("bytes=-0")).toEqual({ ok: false });
    expect(pr("bytes=500-499")).toEqual({ ok: false });
  });

  it("다중 범위는 다루지 않고 전체를 준다(multipart 응답이 필요 — 규격상 허용)", () => {
    expect(pr("bytes=0-9,20-29")).toBeNull();
  });

  it("모르는 단위·깨진 문자열은 전체를 준다", () => {
    expect(pr("items=0-9")).toBeNull();
    expect(pr("bytes=abc-def")).toBeNull();
    expect(pr("bytes=")).toBeNull();
    expect(pr("garbage")).toBeNull();
  });

  it("1바이트 파일에서도 깨지지 않는다", () => {
    expect(pr("bytes=0-", 1)).toEqual({ ok: true, start: 0, end: 0 });
    expect(pr("bytes=1-", 1)).toEqual({ ok: false });
  });
});
