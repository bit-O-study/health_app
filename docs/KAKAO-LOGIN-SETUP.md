# 카카오 로그인 KOE205 및 콜백 설정 복구

최신 상태(2026-09-08 21:44 KST): 사용자 제공 Supabase 관리 토큰으로 Site URL과 운영·로컬·native 콜백 허용목록 반영 완료. 기존 주소는 보존했다. 라이브 인증 가드 4개 모두 통과 및 관리 API 재조회 확인. 아래 초기 실패/인증 부재 기록은 수정 전 조사 이력이다. 카카오 동의항목·실계정 로그인과 앱 복귀 웹 수정 배포는 계속 대기.

2026-09-08 확인: 로그인 공급자는 활성화돼 있지만, 사용자는 KOE205를 보고했다.
실제 Supabase → Kakao 요청 scope는 `account_email profile_image profile_nickname`이다.
운영·로컬·앱(native=1) 콜백 허용목록 검사도 3개 모두 실패했다.
현재 세션에는 Kakao Developers/Supabase 관리자 콘솔 로그인이나 관리 API 토큰이 없어 아래 설정을 변경하지 못했다.

## 1. Kakao Developers

[앱 관리](https://developers.kakao.com/console/app)에서 **Supabase Kakao 공급자의 REST API 키와 같은 앱**을 선택한다.
공유 SDK의 네이티브 키가 설정된 앱과 혼동하지 않는다.

카카오 로그인 → 동의항목에서 다음 요청 항목이 모두 사용 가능하도록 설정한다.

| 항목 | scope |
| --- | --- |
| 이메일 | `account_email` |
| 프로필 사진 | `profile_image` |
| 닉네임 | `profile_nickname` |

KOE205 화면에 표시된 ‘설정하지 않은 동의항목’이 직접적인 수정 대상이다.
이메일 항목을 사용할 수 없다면 비즈 앱 설정 또는 이메일 없는 로그인 구성이 필요하다.
이메일 없는 가입은 계정 정책에도 영향을 주므로 여기서는 임의로 바꾸지 않았다.
클라이언트 `scopes`만 줄이는 방식은 현재 Supabase 공급자가 기본 항목을 붙이므로 해결이 되지 않는다.

Kakao의 Redirect URI는 `https://hgfsfupazyjcrmophmzc.supabase.co/auth/v1/callback`이다.
이 주소와 다음 절의 앱 콜백 주소는 서로 다르다.

근거: [카카오 KOE205 설명](https://developers.kakao.com/docs/ko/kakaologin/trouble-shooting),
[Supabase 카카오 설정](https://supabase.com/docs/guides/auth/social-login/auth-kakao),
[Supabase 기본 요청 scope 구현](https://github.com/supabase/auth/blob/master/internal/api/provider/kakao.go).

## 2. Supabase URL Configuration

[프로젝트 인증 URL 설정](https://supabase.com/dashboard/project/hgfsfupazyjcrmophmzc/auth/url-configuration)에서 확인한다.

- Site URL: `https://health-app-five-iota.vercel.app`
- Redirect URLs: `https://health-app-five-iota.vercel.app/auth/callback`
- 개발용 Redirect URLs: `http://localhost:3000/auth/callback`
- `next`·`native` 쿼리를 포함한 실제 콜백도 허용되고 보존되는지 아래 검사로 확인한다.

다른 정상 주소를 지우거나 전체 도메인을 와일드카드로 개방하지 않는다.

## 3. 검증

1. `corepack pnpm test:auth` — 공급자·운영·로컬·native 콜백 4개 모두 통과해야 한다.
2. 웹에서 실제 카카오 인증 → 앱 로그인 상태 확인.
3. Android에서 카카오 인증 → 헬쑤 복귀 → 앱 종료·재실행 후 로그인 유지 확인.

`social-login.spec.ts`는 로그인 진입 요청을 가로채 검사하므로 실제 카카오 동의 설정을 증명하지 않는다.
`test:auth`도 KOE205를 확인하려면 실계정 동의 화면 검증이 추가로 필요하다.
인증 가드는 이제 `.env.local`·`.env`를 읽고 네트워크/환경변수 오류를 통과로 숨기지 않는다.
CI에 독립 단계로 연결했으며 Supabase 환경변수가 없으면 로그에 건너뜀을 표시한다.
## 4. 구글·카카오 앱 복귀 (2026-09-08)

두 공급자는 공통 콜백을 사용한다. 앱 로그인 요청의 `native=1`·`next` 쿼리가 Supabase에서 보존되어야 한다. HTTPS App Link로 이미 WebView에 돌아온 요청(`helssu-app` UA)은 바로 PKCE 세션을 교환하고, 외부 브라우저에는 자동 앱 열기와 수동 복귀 버튼을 제공한다. 전용 스킴 복귀는 기존 APK의 `helssu://auth/callback` 처리를 사용한다.

검증은 두 공급자 각각 앱에서 시작 → 인증 → 앱 복귀 → 재실행 후 로그인 유지까지 수행한다. 자동 앱 열기가 차단되면 복귀 버튼도 검사한다. 이 웹 수정은 운영 배포가 필요하며, 잘못된 Supabase URL 설정이나 카카오 동의항목을 대신 해결하지 않는다.
