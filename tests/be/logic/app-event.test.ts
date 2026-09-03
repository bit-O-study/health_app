import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  APP_EVENT_KINDS,
  APP_EVENT_LABEL,
  APP_EVENT_RETENTION_DAYS,
  APP_EVENT_SEVERITY,
  DEDUPE_WINDOW_MS,
  MAX_EVENTS_PER_REQUEST,
  MAX_QUEUED_EVENTS,
  QUEUE_TTL_MS,
  SLOW_ROUTE_MS,
  deviceLabelFrom,
  enqueueAppEvent,
  isAppEventKind,
  isSlowLoad,
  memoryWarningMb,
  normalizeAppEvent,
  normalizeRoute,
  planAppEventInsert,
  sanitizeMessage,
  summarizeAppEvents,
  type AppEvent,
  type AppEventRow,
} from "@/lib/observability/app-event";
import {
  appEventCutoff,
  purgeOldAppEvents,
} from "@/features/observability/purge";
import { fakeAdmin } from "../stubs/fake-supabase";

const NOW = Date.UTC(2026, 8, 1, 12, 0, 0);

function ev(over: Partial<AppEvent> = {}): AppEvent {
  return {
    kind: "save_failure",
    severity: "error",
    route: "/routine",
    message: "저장 실패",
    appVersion: "abc1234",
    platform: "web",
    device: "Android 14",
    value: null,
    occurredAt: NOW,
    count: 1,
    ...over,
  };
}

function row(over: Partial<AppEventRow> = {}): AppEventRow {
  return {
    kind: "save_failure",
    severity: "error",
    route: "/routine",
    message: "저장 실패",
    app_version: "abc1234",
    platform: "web",
    device: "Android 14",
    value: null,
    count: 1,
    occurred_at: "2026-09-01T12:00:00.000Z",
    ...over,
  };
}

describe("sanitizeMessage — 개인정보를 지운다", () => {
  it("이메일을 자리표시자로 바꾼다", () => {
    expect(sanitizeMessage("login failed for a.b+tag@example.co.kr")).toBe(
      "login failed for <email>",
    );
  });

  it("uuid 를 자리표시자로 바꾼다", () => {
    expect(
      sanitizeMessage("row 3f2504e0-4f89-11d3-9a0c-0305e82c3301 not found"),
    ).toBe("row <id> not found");
  });

  it("긴 토큰을 자리표시자로 바꾼다", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N";
    expect(sanitizeMessage(`bad token ${jwt}`)).toBe("bad token <token>");
  });

  it("주소의 쿼리스트링을 떼어낸다", () => {
    expect(
      sanitizeMessage("POST https://api.example.com/v1/x?token=secret&u=me 401"),
    ).toBe("POST https://api.example.com/v1/x 401");
  });

  it("긴 숫자열(전화번호·id)을 자리표시자로 바꾼다", () => {
    expect(sanitizeMessage("phone 01012345678 rejected")).toBe(
      "phone <num> rejected",
    );
  });

  it("짧은 숫자는 남긴다 — 상태코드·개수는 진단에 필요하다", () => {
    expect(sanitizeMessage("HTTP 500 after 3 retries")).toBe(
      "HTTP 500 after 3 retries",
    );
  });

  it("공백을 줄이고 길이를 자른다", () => {
    const long = sanitizeMessage("실패 ".repeat(200));
    expect(long.length).toBe(200);
    expect(long.endsWith("…")).toBe(true);
    expect(sanitizeMessage("  a \n  b  ")).toBe("a b");
  });

  it("공백 없이 긴 영숫자 덩어리는 토큰으로 본다 — 통째로 저장하지 않는다", () => {
    expect(sanitizeMessage("a".repeat(500))).toBe("<token>");
  });

  it("문자열이 아니면 빈 문자열", () => {
    expect(sanitizeMessage(null)).toBe("");
    expect(sanitizeMessage(42)).toBe("");
    expect(sanitizeMessage({ a: 1 })).toBe("");
  });
});

describe("normalizeRoute — 화면끼리 묶이게", () => {
  it("쿼리·해시를 뗀다", () => {
    expect(normalizeRoute("/plan/today?focus=chest#x")).toBe("/plan/today");
  });

  it("uuid·날짜·숫자·토큰 조각을 자리표시자로 바꾼다", () => {
    expect(normalizeRoute("/groups/3f2504e0-4f89-11d3-9a0c-0305e82c3301")).toBe(
      "/groups/:id",
    );
    expect(normalizeRoute("/calendar/2026-09-01")).toBe("/calendar/:date");
    expect(normalizeRoute("/community/12345")).toBe("/community/:n");
    expect(normalizeRoute("/groups/join/aBcDeFgHiJkLmNoPqRsTuVwXyZ01")).toBe(
      "/groups/join/:token",
    );
  });

  it("뜻이 있는 슬러그는 그대로 둔다 — 어떤 운동에서 났는지가 정보다", () => {
    expect(normalizeRoute("/exercises/bench-press")).toBe(
      "/exercises/bench-press",
    );
  });

  it("경로가 아니면 빈 문자열", () => {
    expect(normalizeRoute("routine")).toBe("");
    expect(normalizeRoute("")).toBe("");
    expect(normalizeRoute(null)).toBe("");
  });
});

describe("normalizeAppEvent — 검증", () => {
  it("모르는 종류는 버린다", () => {
    expect(normalizeAppEvent({ kind: "쿠키훔치기" }, NOW)).toBeNull();
    expect(normalizeAppEvent(null, NOW)).toBeNull();
  });

  it("종류마다 심각도가 정해져 있다(클라이언트가 못 정한다)", () => {
    const e = normalizeAppEvent(
      { kind: "slow_route", route: "/home", value: 4200 },
      NOW,
    );
    expect(e?.severity).toBe("warn");
    const f = normalizeAppEvent({ kind: "webview_recovery" }, NOW);
    expect(f?.severity).toBe("error");
  });

  it("기기 시계가 미래거나 너무 과거면 지금으로 본다", () => {
    expect(
      normalizeAppEvent({ kind: "save_failure", occurredAt: NOW + 600_000 }, NOW)
        ?.occurredAt,
    ).toBe(NOW);
    expect(
      normalizeAppEvent(
        { kind: "save_failure", occurredAt: NOW - 400 * 24 * 3600_000 },
        NOW,
      )?.occurredAt,
    ).toBe(NOW);
    expect(
      normalizeAppEvent({ kind: "save_failure", occurredAt: NOW - 5000 }, NOW)
        ?.occurredAt,
    ).toBe(NOW - 5000);
  });

  it("platform 은 android/web 둘 뿐 — 아무 값이나 못 넣는다", () => {
    expect(normalizeAppEvent({ kind: "save_failure", platform: "ios" }, NOW)?.platform).toBe("web");
    expect(
      normalizeAppEvent({ kind: "save_failure", platform: "android" }, NOW)
        ?.platform,
    ).toBe("android");
  });

  it("value 는 음수·비정상이면 null", () => {
    expect(normalizeAppEvent({ kind: "slow_route", value: -5 }, NOW)?.value).toBeNull();
    expect(
      normalizeAppEvent({ kind: "slow_route", value: Number.NaN }, NOW)?.value,
    ).toBeNull();
    expect(normalizeAppEvent({ kind: "slow_route", value: 1234.6 }, NOW)?.value).toBe(1235);
  });

  it("count 는 1 이상 1000 이하", () => {
    expect(normalizeAppEvent({ kind: "save_failure", count: 0 }, NOW)?.count).toBe(1);
    expect(normalizeAppEvent({ kind: "save_failure", count: 99999 }, NOW)?.count).toBe(1000);
  });

  it("메시지·기기 문자열도 같은 세탁을 거친다", () => {
    const e = normalizeAppEvent(
      { kind: "auth_failure", message: "no user me@x.com", device: "me@x.com" },
      NOW,
    );
    expect(e?.message).toBe("no user <email>");
    expect(e?.device).toBe("<email>");
  });
});

describe("enqueueAppEvent — 기기 대기열", () => {
  it("같은 사건이 짧은 간격으로 나면 행을 늘리지 않고 합산한다", () => {
    const first = ev();
    const again = ev({ occurredAt: NOW + DEDUPE_WINDOW_MS - 1 });
    const q = enqueueAppEvent([first], again, NOW);
    expect(q).toHaveLength(1);
    expect(q[0].count).toBe(2);
  });

  it("간격이 벌어지면 따로 쌓는다", () => {
    const q = enqueueAppEvent(
      [ev()],
      ev({ occurredAt: NOW + DEDUPE_WINDOW_MS + 1 }),
      NOW,
    );
    expect(q).toHaveLength(2);
  });

  it("합산할 때 value 는 더 나쁜 쪽(최대)을 남긴다", () => {
    const q = enqueueAppEvent(
      [ev({ kind: "slow_route", severity: "warn", value: 3000 })],
      ev({ kind: "slow_route", severity: "warn", value: 9000 }),
      NOW,
    );
    expect(q[0].value).toBe(9000);
  });

  it("만료된 사건은 버린다", () => {
    const old = ev({ occurredAt: NOW - QUEUE_TTL_MS - 1, message: "옛것" });
    const q = enqueueAppEvent([old], ev({ message: "새것" }), NOW);
    expect(q.map((e) => e.message)).toEqual(["새것"]);
  });

  it("상한을 넘으면 오래된 것부터 버린다 — 사고 직전이 남아야 한다", () => {
    let q: AppEvent[] = [];
    for (let i = 0; i < MAX_QUEUED_EVENTS + 5; i++) {
      q = enqueueAppEvent(q, ev({ message: `m${i}`, occurredAt: NOW + i }), NOW);
    }
    expect(q).toHaveLength(MAX_QUEUED_EVENTS);
    expect(q[0].message).toBe("m5");
    expect(q[q.length - 1].message).toBe(`m${MAX_QUEUED_EVENTS + 4}`);
  });
});

describe("summarizeAppEvents — 관리자 집계", () => {
  it("기록이 없으면 전부 비어 있다", () => {
    const s = summarizeAppEvents([]);
    expect(s.total).toBe(0);
    expect(s.errors).toBe(0);
    expect(s.byKind).toEqual([]);
    expect(s.byRoute).toEqual([]);
  });

  it("count 를 합산해 센다 — 반복을 1건으로 세면 안 된다", () => {
    const s = summarizeAppEvents([row({ count: 4 }), row({ count: 2 })]);
    expect(s.total).toBe(6);
    expect(s.errors).toBe(6);
    expect(s.byKind[0].total).toBe(6);
  });

  it("경고는 오류 수에 안 들어간다", () => {
    const s = summarizeAppEvents([
      row({ kind: "slow_route", severity: "warn", count: 3 }),
      row({ count: 1 }),
    ]);
    expect(s.total).toBe(4);
    expect(s.errors).toBe(1);
  });

  it("버전은 플랫폼과 묶어서 본다 — 웹 배포본과 APK 빌드는 다른 축이다", () => {
    const s = summarizeAppEvents([
      row({ platform: "android", app_version: "1.0.3" }),
      row({ platform: "web", app_version: "1.0.3" }),
    ]);
    expect(s.byVersion.map((g) => g.label).sort()).toEqual([
      "android · 1.0.3",
      "web · 1.0.3",
    ]);
  });

  it("많은 순으로 정렬하고 최근 발생 시각·대표 메시지를 남긴다", () => {
    const s = summarizeAppEvents([
      row({ route: "/plan", count: 1, occurred_at: "2026-09-01T01:00:00.000Z" }),
      row({ route: "/routine", count: 5, message: "대표", occurred_at: "2026-09-01T09:00:00.000Z" }),
      row({ route: "/routine", count: 1, message: "나중", occurred_at: "2026-09-02T09:00:00.000Z" }),
    ]);
    expect(s.byRoute[0].label).toBe("/routine");
    expect(s.byRoute[0].total).toBe(6);
    expect(s.byRoute[0].sample).toBe("대표");
    expect(s.byRoute[0].lastAt).toBe("2026-09-02T09:00:00.000Z");
  });

  it("빈 값은 (미상)으로 묶는다", () => {
    const s = summarizeAppEvents([row({ route: null, device: "", app_version: null })]);
    expect(s.byRoute[0].label).toBe("(미상)");
    expect(s.byDevice[0].label).toBe("(미상)");
    expect(s.byVersion[0].label).toBe("web · (미상)");
  });
});

describe("deviceLabelFrom — 모델·OS 만 남긴다", () => {
  it("안드로이드 WebView UA 에서 버전과 모델을 뽑는다", () => {
    expect(
      deviceLabelFrom(
        "Mozilla/5.0 (Linux; Android 14; SM-S911N Build/UP1A.231005.007; wv) AppleWebKit/537.36 helssu-app",
      ),
    ).toBe("Android 14 · SM-S911N");
  });

  it("모델이 익명화(K)되거나 wv 표식뿐이면 버전만 남긴다", () => {
    expect(deviceLabelFrom("Mozilla/5.0 (Linux; Android 13; K) AppleWebKit")).toBe(
      "Android 13",
    );
  });

  it("iOS·데스크톱은 대략적인 플랫폼만", () => {
    expect(
      deviceLabelFrom("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)"),
    ).toBe("iOS 17.5");
    expect(deviceLabelFrom("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(
      "Windows",
    );
  });

  it("모르는 UA 는 빈 문자열 — UA 전체를 저장하지 않는다", () => {
    expect(deviceLabelFrom("아무거나")).toBe("");
    expect(deviceLabelFrom(null)).toBe("");
  });
});

describe("느린 화면·메모리 임계", () => {
  it("임계를 넘어야 느린 것으로 본다", () => {
    expect(isSlowLoad(SLOW_ROUTE_MS - 1)).toBe(false);
    expect(isSlowLoad(SLOW_ROUTE_MS + 1)).toBe(true);
  });

  it("탭을 오래 열어둔 뒤의 말도 안 되는 값은 로딩이 아니다", () => {
    expect(isSlowLoad(60 * 60 * 1000)).toBe(false);
    expect(isSlowLoad(Number.NaN)).toBe(false);
    expect(isSlowLoad(null)).toBe(false);
  });

  it("힙이 한계의 85% 를 넘으면 사용량(MB)을 돌려준다", () => {
    const limit = 1000 * 1024 * 1024;
    expect(memoryWarningMb(0.9 * limit, limit)).toBe(900);
    expect(memoryWarningMb(0.5 * limit, limit)).toBeNull();
  });

  it("performance.memory 가 없거나 0 이면 null", () => {
    expect(memoryWarningMb(undefined, undefined)).toBeNull();
    expect(memoryWarningMb(0, 0)).toBeNull();
  });
});

describe("planAppEventInsert — 서버가 받을 것/버릴 것", () => {
  const raw = (over: Record<string, unknown> = {}) => ({
    kind: "save_failure",
    ...over,
  });

  it("빈 묶음은 받아들인 것으로 본다(기기가 비우면 된다)", () => {
    expect(planAppEventInsert([], NOW, 0, 200)).toEqual({
      events: [],
      accepted: true,
    });
    expect(planAppEventInsert(null, NOW, 0, 200).accepted).toBe(true);
  });

  it("모르는 종류만 왔으면 버리라고 알려준다", () => {
    const plan = planAppEventInsert([raw({ kind: "훔치기" })], NOW, 0, 200);
    expect(plan.events).toEqual([]);
    expect(plan.accepted).toBe(true);
  });

  it("한 번에 받는 개수를 제한한다", () => {
    const many = Array.from({ length: 100 }, () => raw());
    expect(planAppEventInsert(many, NOW, 0, 200).events).toHaveLength(
      MAX_EVENTS_PER_REQUEST,
    );
  });

  it("시간당 상한 남은 만큼만 넣는다", () => {
    const five = Array.from({ length: 5 }, () => raw());
    expect(planAppEventInsert(five, NOW, 198, 200).events).toHaveLength(2);
  });

  it("상한을 이미 채웠으면 버린다 — 들고 있어도 다음에 또 막힌다", () => {
    const plan = planAppEventInsert([raw()], NOW, 200, 200);
    expect(plan.events).toEqual([]);
    expect(plan.accepted).toBe(true);
  });

  it("클라이언트가 보낸 심각도는 무시하고 종류로 다시 정한다", () => {
    const plan = planAppEventInsert(
      [raw({ kind: "slow_route", severity: "error" })],
      NOW,
      0,
      200,
    );
    expect(plan.events[0].severity).toBe("warn");
  });
});

describe("보존 기간 정리", () => {
  it("컷오프는 보존 기간만큼 과거다", () => {
    const cutoff = Date.parse(appEventCutoff(NOW));
    expect(NOW - cutoff).toBe(APP_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  });

  it("보존 기간이 지난 행만 지운다", async () => {
    const old = new Date(NOW - 40 * 24 * 3600_000).toISOString();
    const fresh = new Date(NOW - 3 * 24 * 3600_000).toISOString();
    const store = {
      app_events: [
        { id: "a", occurred_at: old },
        { id: "b", occurred_at: fresh },
      ],
    };
    await purgeOldAppEvents(fakeAdmin(store) as never, NOW);
    expect(store.app_events.map((r) => r.id)).toEqual(["b"]);
  });

  it("정리가 터져도 던지지 않는다 — 크론 본업이 죽으면 안 된다", async () => {
    const store = { app_events: [] };
    await expect(
      purgeOldAppEvents(fakeAdmin(store, "app_events") as never, NOW),
    ).resolves.toBeUndefined();
  });
});

describe("의존 경계", () => {
  it("보고 모듈은 서버 액션을 정적으로 import 하지 않는다", () => {
    // 정적으로 물면 이 파일을 쓰는 모든 모듈(걸음수 브리지·로그인 폼·운동모드)의
    // 그래프에 서버 모듈이 얹혀, 그 모듈만 보는 순수 단위 테스트까지 supabase
    // 환경변수를 요구한다(실제로 steps-state·steps-diag 가 그렇게 깨졌다).
    const src = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "../../../src/lib/observability/report-client.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/^import .*report-actions/m);
    expect(src).toMatch(/await import\(/);
  });
});

describe("레지스트리 정합성", () => {
  it("모든 종류에 라벨과 심각도가 있다 — 새 종류를 넣고 빠뜨리면 여기서 걸린다", () => {
    for (const kind of APP_EVENT_KINDS) {
      expect(APP_EVENT_LABEL[kind]).toBeTruthy();
      expect(["error", "warn"]).toContain(APP_EVENT_SEVERITY[kind]);
      expect(isAppEventKind(kind)).toBe(true);
    }
  });
});
