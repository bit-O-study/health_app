import type { JWK } from "@supabase/supabase-js";

/**
 * Supabase 비대칭 JWT 서명키(JWKS) 모듈 캐시.
 *
 * ⚡ 왜 필요한가 — `auth.getClaims()` 는 access 토큰을 **로컬(WebCrypto)에서 검증**해
 * `auth.getUser()` 의 원격 왕복(서울 → 싱가포르, 왕복당 70~90ms)을 없앤다. 다만 검증에
 * 쓸 공개키를 supabase 클라이언트가 **자기 인스턴스 메모리에** 캐시하는데, 이 앱은
 * 요청마다 새 클라이언트를 만들기 때문에(`createSupabaseServerClient` = React.cache,
 * 요청 단위) 그 캐시가 매 요청 비어 있다 → 결국 요청마다 JWKS 를 새로 받아오게 된다.
 *
 * 그래서 공개키를 **모듈 스코프**에 캐시해 `getClaims(undefined, { keys })` 로 직접
 * 넘긴다. 모듈 스코프는 같은 서버 인스턴스가 살아 있는 동안(Fluid Compute 는 인스턴스를
 * 재사용) 유지되므로, 워밍된 인스턴스에서는 인증에 네트워크 왕복이 **0회**가 된다.
 *
 * 키 로테이션: 넘긴 keys 에 토큰의 kid 가 없으면 supabase-js 가 스스로 JWKS 를
 * 받아와 검증한다(동작은 깨지지 않음). 우리 캐시도 TTL 이 지나면 새로 받는다.
 */

const JWKS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`;

/** 공개키 캐시 수명. 짧게 잡아도 왕복은 인스턴스당 이 주기로 1회뿐이다. */
const TTL_MS = 10 * 60 * 1000;

let cachedKeys: JWK[] = [];
let cachedAt = 0;
/** 동시에 여러 요청이 들어와도 JWKS 를 한 번만 받아오게 하는 in-flight 공유 */
let inflight: Promise<JWK[]> | null = null;

async function fetchKeys(): Promise<JWK[]> {
  const res = await fetch(JWKS_URL, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "" },
    // 공개 엔드포인트 — Next 의 fetch 캐시에도 얹어 인스턴스 최초 1회 비용도 줄인다.
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`JWKS ${res.status}`);
  const json = (await res.json()) as { keys?: JWK[] };
  return json.keys ?? [];
}

/**
 * 검증용 공개키 목록. 실패하면 **빈 배열**을 돌려준다 — 그러면 supabase-js 가
 * 스스로 JWKS 를 받아오거나 `getUser()` 로 폴백하므로 로그인이 깨지지 않는다.
 */
export async function getSigningKeys(): Promise<JWK[]> {
  const now = Date.now();
  if (cachedKeys.length > 0 && cachedAt + TTL_MS > now) return cachedKeys;
  if (inflight) return inflight;

  inflight = fetchKeys()
    .then((keys) => {
      // 빈 응답으로 캐시를 덮어쓰면 이후 모든 요청이 원격 폴백으로 떨어진다 —
      // 키가 실제로 왔을 때만 갱신하고, 아니면 옛 캐시를 그대로 쓴다.
      if (keys.length > 0) {
        cachedKeys = keys;
        cachedAt = Date.now();
      }
      return cachedKeys;
    })
    .catch(() => cachedKeys) // 실패 시 옛 캐시(없으면 빈 배열)로 폴백
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
