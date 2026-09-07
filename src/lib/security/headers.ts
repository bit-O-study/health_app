/**
 * 응답 보안 헤더 — `next.config.ts` 의 `headers()` 가 이 표를 그대로 내보낸다.
 *
 * 별도 모듈인 이유: 헤더가 빠지거나 값이 뒤집혀도 화면은 멀쩡해서 **아무도 모른다.**
 * 여기 순수 함수로 두면 단위테스트가 "카메라는 self 만, 마이크는 아무도" 같은
 * 의도를 못 박을 수 있다(`tests/be/logic/security-headers.test.ts`).
 *
 * ## 왜 이 앱에 필요한가
 * 카메라(자세·식단·기구 스캔, 그룹 인증샷)·위치(러닝)·모션 센서를 쓰는 앱이다.
 * 프레임에 끼워지면 그 권한이 **끼운 쪽 화면 위에서** 동작하고, 사용자는 우리 화면인 줄
 * 안다. 계정 삭제·구독 버튼도 같은 방법으로 눌리게 만들 수 있다(클릭재킹).
 *
 * ## 여기 없는 것 — CSP
 * `Content-Security-Policy` 는 뺐다. Next 는 하이드레이션 부트스트랩을 인라인
 * `<script>` 로 심고 이 앱은 테마 깜빡임 방지 스크립트(`ThemeScript`)도 인라인이라,
 * nonce 를 흘려 넣기 전에는 `script-src` 를 조이는 순간 **앱이 통째로 하얗게 뜬다.**
 * 반쯤 조인 CSP(`unsafe-inline` 허용)는 지키는 게 거의 없으면서 지킨다는 착각만 준다 →
 * nonce 미들웨어를 따로 세울 때 한 번에 넣는다.
 */

export type HeaderEntry = { key: string; value: string };

/**
 * 권한 정책. 쓰는 것만 **자기 출처에** 열고 나머지는 전부 닫는다.
 * - `camera`·`geolocation`·`accelerometer`·`gyroscope` → 실제로 쓴다(self)
 * - `microphone` → 모든 `getUserMedia` 가 `audio:false` 다. 쓸 일이 없으니 닫는다
 * - `payment` → 결제는 네이티브 Play Billing 이라 웹 Payment Request 를 안 쓴다
 */
const PERMISSIONS_POLICY = [
  "accelerometer=(self)",
  "camera=(self)",
  "geolocation=(self)",
  "gyroscope=(self)",
  "microphone=()",
  "payment=()",
  "usb=()",
].join(", ");

/** 2년. `preload` 는 넣지 않는다 — 한번 등재되면 되돌리는 데 몇 달 걸린다. */
const HSTS = "max-age=63072000; includeSubDomains";

/**
 * 모든 응답에 붙일 헤더.
 *
 * @param secure https 로 서비스되는 환경인가. **HSTS 만** 이 값을 본다 —
 *   로컬 dev 는 `http://localhost:3000` 인데 여기에 HSTS 가 걸리면 브라우저가
 *   그 뒤로 localhost 를 https 로만 열려 해서 **개발 서버가 안 열린다.**
 *   (한 번 걸리면 브라우저 설정에서 지워야 풀린다.)
 */
export function securityHeaders(secure: boolean): HeaderEntry[] {
  const base: HeaderEntry[] = [
    // 프레임 삽입 차단(클릭재킹). 우리 화면을 우리가 끼우는 건 허용.
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    // 선언한 Content-Type 을 브라우저가 제멋대로 추측하지 않게. 업로드한 이미지가
    // HTML 로 해석되면 그 자리가 곧 스크립트 실행 지점이 된다.
    { key: "X-Content-Type-Options", value: "nosniff" },
    // 외부로 나갈 때 경로를 흘리지 않는다 — 우리 URL 에는 글 id·그룹 id 가 들어간다.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  ];
  if (secure) base.push({ key: "Strict-Transport-Security", value: HSTS });
  return base;
}
