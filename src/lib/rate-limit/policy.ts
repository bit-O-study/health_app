/**
 * 요청 폭주 제한(rate limit) 정책 — 순수 로직. 세는 일은 `consume.ts` 가 한다.
 *
 * ## 왜 필요한가
 * 이 앱에는 **한 번의 성공보다 여러 번의 시도가 문제인** 자리가 셋 있다.
 *
 * 1. **아이디 찾기** — 2026-09-04 사용자 결정으로 휴대폰 OTP 관문을 걷어냈다.
 *    이름+휴대폰만 맞으면 가입 이메일이 그대로 나온다. 한 번은 정상 사용이지만
 *    수천 번은 **가입자 명부를 긁는 일**이다. 관문을 다시 세우는 대신(사용자 결정을
 *    되돌리지 않는다) 속도만 묶는다 — 진짜 사용자는 두세 번이면 끝난다.
 * 2. **비밀번호 찾기 인증번호** — 메일 발송이라 남의 주소로 반복 요청하면 그 사람
 *    받은편지함을 우리가 채워 준다.
 * 3. **AI 호출** — 월 한도(`ai_usage`)는 이미 있지만 그건 *한 달*이다. NVIDIA 무료
 *    티어는 **분당 40요청**이라, 한 사람이 연타하면 자기 월 한도를 다 쓰기도 전에
 *    **모든 사용자의 AI 가 같이 죽는다.** 분 단위 제한은 그래서 따로 필요하다.
 *
 * ## 열쇠를 둘로 나눈다 — 신원 · 출처
 * 신원(이름+휴대폰 등)만 묶으면 값을 바꿔 가며 계속 두드릴 수 있고, 출처(IP)만 묶으면
 * 공용 와이파이·회사망에서 한 사람이 남들 것까지 태워 버린다. 그래서 **둘 다** 건다 —
 * 신원은 촘촘하게, 출처는 넉넉하게.
 */

/** 세는 단위. DB `rate_limits.bucket` 에 그대로 들어간다. */
export type RateBucket =
  | "find-id:identity"
  | "find-id:ip"
  | "pw-otp:identity"
  | "pw-otp:ip"
  | "pw-verify:ip"
  | "ai:user"
  | "food-db:user";

export type RatePolicy = {
  /** 창(window) 안에 허용할 횟수. */
  limit: number;
  /** 창 길이(초). */
  windowSeconds: number;
  /** 막혔을 때 사용자에게 보여줄 말. **언제 풀리는지**를 반드시 같이 말한다. */
  message: string;
};

const MINUTE = 60;
const TEN_MINUTES = 10 * MINUTE;
const HOUR = 60 * MINUTE;

/**
 * 한도 값. **정상 사용을 막지 않는 선**이 기준이다 — 아이디를 찾는 사람은 두세 번,
 * 오타가 나도 다섯 번이면 끝난다. 긁는 쪽은 수천 번이 필요하다. 그 사이에 선을 둔다.
 */
export const RATE_POLICIES: Record<RateBucket, RatePolicy> = {
  // 같은 이름+휴대폰으로 10분에 5번. 오타 몇 번은 통과한다.
  "find-id:identity": {
    limit: 5,
    windowSeconds: TEN_MINUTES,
    message: "같은 정보로 너무 많이 조회했어요. 10분 뒤에 다시 시도해 주세요.",
  },
  // 같은 곳에서 1시간에 60번. 공용 와이파이에서 여러 명이 써도 남는다.
  "find-id:ip": {
    limit: 60,
    windowSeconds: HOUR,
    message: "조회가 너무 잦아요. 잠시 뒤에 다시 시도해 주세요.",
  },
  // 메일이 나가는 요청이라 신원 쪽을 더 조인다 — 남의 받은편지함을 우리가 채우면 안 된다.
  "pw-otp:identity": {
    limit: 3,
    windowSeconds: TEN_MINUTES,
    message: "인증번호를 너무 자주 요청했어요. 10분 뒤에 다시 시도해 주세요.",
  },
  "pw-otp:ip": {
    limit: 30,
    windowSeconds: HOUR,
    message: "요청이 너무 잦아요. 잠시 뒤에 다시 시도해 주세요.",
  },
  // 인증번호 5회 실패 잠금은 DB(verify_otp_and_reset)가 이미 한다. 여기선 그 잠금을
  // 우회하려고 이메일을 바꿔 가며 두드리는 걸 막는다 — 그래서 출처 기준.
  "pw-verify:ip": {
    limit: 60,
    windowSeconds: HOUR,
    message: "시도가 너무 잦아요. 잠시 뒤에 다시 시도해 주세요.",
  },
  // 분당 6번. 사진을 다시 찍어 재시도하는 정상 흐름은 이보다 훨씬 느리다.
  "ai:user": {
    limit: 6,
    windowSeconds: MINUTE,
    message: "AI 요청이 너무 빨라요. 잠시 뒤에 다시 시도해 주세요.",
  },
  // 식약처 식품 DB 조회. 우리 비용은 아니지만 **키 하나를 모두가 나눠 쓰고** 일일 한도가
  // 있다 — 한 사람의 멈추지 않는 재시도가 그날 남은 조회를 통째로 태울 수 있다.
  // 검색은 디바운스가 걸려 있어 정상 타이핑은 분당 몇 번을 넘지 않는다.
  "food-db:user": {
    limit: 20,
    windowSeconds: MINUTE,
    message: "식품 검색이 너무 잦아요. 잠시 뒤에 다시 시도해 주세요.",
  },
};

/**
 * 창의 시작 시각(초 단위 정수). 같은 창에 든 요청은 같은 값을 얻어 한 행에 모인다.
 *
 * 미끄러지는(sliding) 창이 아니라 **고정 창**이다. 경계에서 최대 두 배까지 몰릴 수
 * 있지만(창 끝에 5번 + 새 창 처음에 5번), 우리가 막으려는 건 "수천 번 긁기" 라
 * 두 배는 문제가 안 된다. 대신 행 하나·정수 비교로 끝나 DB 가 싸다.
 */
export function windowStart(policy: RatePolicy, now: Date): number {
  const sec = Math.floor(now.getTime() / 1000);
  return sec - (sec % policy.windowSeconds);
}

/**
 * 열쇠 정규화 — 대소문자·공백·전화번호 표기가 달라도 같은 신원이면 같은 열쇠여야 한다.
 * 안 그러면 `hong` / `HONG ` 로 번갈아 넣는 것만으로 한도가 두 배가 된다.
 */
export function identityKey(...parts: (string | null | undefined)[]): string {
  return parts
    .map((p) => (p ?? "").toString().trim().toLowerCase().replace(/[\s-]+/g, ""))
    .join("|");
}

/** 안내 문구. 정책에 적어 둔 말을 그대로 쓴다(화면마다 다른 말이 나오면 안 된다). */
export function limitMessage(bucket: RateBucket): string {
  return RATE_POLICIES[bucket].message;
}
