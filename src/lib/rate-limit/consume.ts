import "server-only";

import { headers } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  RATE_POLICIES,
  windowStart,
  type RateBucket,
} from "@/lib/rate-limit/policy";

/**
 * 폭주 제한 집행 — 판단·한도는 `policy.ts`, 여기선 센다.
 *
 * ## 🔴 검사와 증가를 한 문장으로
 * `consume_rate_limit`(SECURITY DEFINER) 안에서 upsert 한 번으로 끝낸다. 읽고 나서
 * 올리면 그 사이에 다른 요청이 끼어든다 — 막으려는 대상이 바로 **동시에 쏟아지는
 * 요청**이라, 여기서 틈이 벌어지면 제한 자체가 무의미해진다.
 *
 * ## 🔴 세지 못하면 통과시킨다
 * DB 가 잠깐 안 될 때 아이디 찾기·AI 를 막으면, 우리 사정으로 사용자 기능이 죽는다.
 * 이 앱의 다른 집계(`ai_usage`·오류 관측)와 같은 원칙이다 — 관측 실패가 기능 실패가
 * 되면 안 된다. 폭주 제한은 **비용·남용을 늦추는 장치**지 인증이 아니다. 진짜 관문이
 * 필요한 자리(비번 5회 잠금 등)는 DB 함수가 따로 지키고 있다.
 */

/**
 * 요청 출처. Vercel 은 `x-forwarded-for` 맨 앞에 진짜 클라이언트 IP 를 넣는다.
 *
 * ⚠ 헤더가 없으면 `"unknown"` 하나로 **모두 뭉친다.** 그래서 출처 기준 한도는
 * 넉넉하게 잡혀 있다(`policy.ts`) — 로컬·프록시 뒤에서 여러 사람이 한 열쇠를
 * 나눠 쓰는 상황을 정상으로 취급해야 한다.
 */
export async function requestOrigin(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    return h.get("x-real-ip")?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * 한 칸 쓴다. 창 안에서 한도를 넘었으면 `false`.
 *
 * @param bucket 어떤 자리인가(한도·창 길이가 여기서 나온다)
 * @param key    누구인가(신원 또는 출처). `policy.identityKey` 로 정규화해 넘길 것
 */
export async function consumeRate(
  bucket: RateBucket,
  key: string,
  now: Date = new Date(),
): Promise<boolean> {
  const policy = RATE_POLICIES[bucket];
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_bucket: bucket,
      p_key: key.slice(0, 200),
      p_window_start: windowStart(policy, now),
      p_limit: policy.limit,
    });
    // 세지 못했다 → 통과(위 머리말 참조).
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

/**
 * 여러 열쇠를 한꺼번에 — 하나라도 걸리면 막힌다.
 *
 * 신원과 출처를 같이 거는 자리에서 쓴다. **먼저 걸린 데서 멈추지 않고 전부 센다** —
 * 신원 한도에 막혔다고 출처를 안 세면, 신원 값을 바꿔 가며 두드리는 쪽이
 * 출처 한도를 영영 못 채운다(그게 정확히 긁는 방법이다).
 */
export async function consumeAllRates(
  entries: [RateBucket, string][],
  now: Date = new Date(),
): Promise<boolean> {
  const results = await Promise.all(
    entries.map(([bucket, key]) => consumeRate(bucket, key, now)),
  );
  return results.every(Boolean);
}
