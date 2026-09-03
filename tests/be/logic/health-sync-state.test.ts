import { describe, expect, it } from "vitest";

import {
  formatLastSync,
  parseSyncMap,
  serializeSyncMap,
} from "@/features/health/health-sync-state";

const NOW = Date.parse("2026-09-02T12:00:00+09:00");

describe("parseSyncMap — 깨진 저장값에도 화면이 죽지 않는다", () => {
  it("정상 값은 그대로", () => {
    const at = NOW - 60_000;
    expect(parseSyncMap(JSON.stringify({ steps: at }), NOW)).toEqual({
      steps: at,
    });
  });

  it("없거나 JSON 이 아니면 빈 맵", () => {
    expect(parseSyncMap(null, NOW)).toEqual({});
    expect(parseSyncMap("", NOW)).toEqual({});
    expect(parseSyncMap("{망가진", NOW)).toEqual({});
  });

  it("객체가 아니면 빈 맵 — 배열도 아니다", () => {
    expect(parseSyncMap("[1,2]", NOW)).toEqual({});
    expect(parseSyncMap('"문자열"', NOW)).toEqual({});
    expect(parseSyncMap("null", NOW)).toEqual({});
  });

  it("표에 없는 항목 id 는 버린다", () => {
    expect(parseSyncMap(JSON.stringify({ 없는항목: NOW - 1 }), NOW)).toEqual({});
  });

  it("숫자가 아니거나 0 이하인 시각은 버린다", () => {
    const raw = JSON.stringify({ steps: "어제", body: 0 });
    expect(parseSyncMap(raw, NOW)).toEqual({});
  });

  it("🔴 미래 시각은 안 믿는다 — 기기 시계가 앞서면 '뒤에 동기화됨'이 뜬다", () => {
    const raw = JSON.stringify({ steps: NOW + 60 * 60 * 1000 });
    expect(parseSyncMap(raw, NOW)).toEqual({});
  });

  it("몇 분 정도 앞선 것은 시계 오차로 보고 받아 준다", () => {
    const at = NOW + 60_000;
    expect(parseSyncMap(JSON.stringify({ steps: at }), NOW)).toEqual({
      steps: at,
    });
  });

  it("직렬화 → 파싱 왕복", () => {
    const map = { steps: NOW - 1000, body: NOW - 2000 };
    expect(parseSyncMap(serializeSyncMap(map), NOW)).toEqual(map);
  });
});

describe("formatLastSync — 사람이 읽는 상대 시각", () => {
  it("기록이 없으면 '아직 없음'", () => {
    expect(formatLastSync(undefined, NOW)).toBe("아직 없음");
    expect(formatLastSync(0, NOW)).toBe("아직 없음");
  });

  it("1분 미만은 '방금 전' — 초 단위를 보여줄 이유가 없다", () => {
    expect(formatLastSync(NOW - 5_000, NOW)).toBe("방금 전");
    expect(formatLastSync(NOW - 59_000, NOW)).toBe("방금 전");
  });

  it("분 · 시간 단위", () => {
    expect(formatLastSync(NOW - 60_000, NOW)).toBe("1분 전");
    expect(formatLastSync(NOW - 59 * 60_000, NOW)).toBe("59분 전");
    expect(formatLastSync(NOW - 60 * 60_000, NOW)).toBe("1시간 전");
    expect(formatLastSync(NOW - 23 * 3_600_000, NOW)).toBe("23시간 전");
  });

  it("하루가 넘으면 날짜로 — '3일 전'보다 날짜가 헷갈리지 않는다", () => {
    const out = formatLastSync(NOW - 30 * 3_600_000, NOW);
    expect(out).toMatch(/^\d{1,2}월 \d{1,2}일$/);
  });

  it("시계가 조금 앞선 기기도 '방금 전'으로 — 음수 시간을 보여주지 않는다", () => {
    expect(formatLastSync(NOW + 10_000, NOW)).toBe("방금 전");
  });
});
