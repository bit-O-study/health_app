import { describe, expect, it } from "vitest";

import {
  RATE_POLICIES,
  identityKey,
  limitMessage,
  windowStart,
  type RateBucket,
} from "@/lib/rate-limit/policy";

const BUCKETS = Object.keys(RATE_POLICIES) as RateBucket[];

describe("폭주 제한 정책", () => {
  it("모든 자리에 한도·창·안내문이 있다", () => {
    expect(BUCKETS.length).toBeGreaterThan(0);
    for (const b of BUCKETS) {
      const p = RATE_POLICIES[b];
      expect(p.limit, b).toBeGreaterThan(0);
      expect(p.windowSeconds, b).toBeGreaterThan(0);
      expect(p.message.length, b).toBeGreaterThan(0);
    }
  });

  it("안내문은 **언제 풀리는지**를 말한다 — 영영 막힌 줄 알면 고장으로 읽힌다", () => {
    for (const b of BUCKETS) {
      expect(limitMessage(b), b).toMatch(/뒤에|잠시/);
    }
  });

  it("정상 사용을 막지 않는 선이다 — 아이디 찾기는 오타 몇 번이 통과한다", () => {
    // 두세 번이면 끝나는 일이라 5회. 1~2회면 오타 한 번에 막힌다.
    expect(RATE_POLICIES["find-id:identity"].limit).toBeGreaterThanOrEqual(3);
    // 긁는 쪽은 수천 번이 필요하다 — 창당 두 자릿수를 넘기면 제한 의미가 옅어진다.
    expect(RATE_POLICIES["find-id:identity"].limit).toBeLessThanOrEqual(10);
  });

  it("출처 한도는 신원 한도보다 넉넉하다 — 공용 와이파이에서 남들 것까지 태우면 안 된다", () => {
    expect(RATE_POLICIES["find-id:ip"].limit).toBeGreaterThan(
      RATE_POLICIES["find-id:identity"].limit,
    );
    expect(RATE_POLICIES["pw-otp:ip"].limit).toBeGreaterThan(
      RATE_POLICIES["pw-otp:identity"].limit,
    );
  });

  it("AI 는 분 단위다 — 월 한도(ai_usage)와 막는 대상이 다르다", () => {
    // NVIDIA 무료 티어가 분당 40요청이라, 한 사람이 그걸 다 먹으면 전원이 죽는다.
    expect(RATE_POLICIES["ai:user"].windowSeconds).toBe(60);
    expect(RATE_POLICIES["ai:user"].limit).toBeLessThan(40);
  });
});

describe("windowStart", () => {
  const policy = { limit: 5, windowSeconds: 600, message: "" };

  it("같은 창에 든 요청은 같은 값을 얻는다(한 행에 모인다)", () => {
    const a = windowStart(policy, new Date("2026-09-07T10:00:00Z"));
    const b = windowStart(policy, new Date("2026-09-07T10:09:59Z"));
    expect(a).toBe(b);
  });

  it("창이 넘어가면 값이 바뀐다(카운트가 새로 시작한다)", () => {
    const a = windowStart(policy, new Date("2026-09-07T10:09:59Z"));
    const b = windowStart(policy, new Date("2026-09-07T10:10:00Z"));
    expect(b).toBe(a + 600);
  });

  it("창 길이의 배수에 정렬된다", () => {
    const w = windowStart(policy, new Date("2026-09-07T10:07:33Z"));
    expect(w % 600).toBe(0);
  });
});

describe("identityKey", () => {
  it("대소문자·공백·하이픈이 달라도 같은 신원이면 같은 열쇠다", () => {
    // 안 그러면 표기만 바꿔 가며 넣는 것으로 한도가 몇 배가 된다.
    expect(identityKey("Hong Gildong", "010-1234-5678")).toBe(
      identityKey(" hong gildong ", "01012345678"),
    );
  });

  it("다른 신원은 다른 열쇠다", () => {
    expect(identityKey("hong", "01011112222")).not.toBe(
      identityKey("hong", "01033334444"),
    );
  });

  it("빈 값·null 이 섞여도 터지지 않는다", () => {
    expect(identityKey(null, undefined, "")).toBe("||");
  });

  it("구분자가 있어 이어붙이기 충돌이 안 난다", () => {
    // 'ab'+'c' 와 'a'+'bc' 가 같은 열쇠가 되면 서로의 한도를 갉아먹는다.
    expect(identityKey("ab", "c")).not.toBe(identityKey("a", "bc"));
  });
});
