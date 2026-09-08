# 카카오 로그인 KOE205 및 앱 복귀

## 현재 수정

사용자 오류의 미설정 항목은 account_email이다. 이메일 권한을 활성화할 수 없어 카카오 로그인에서 이메일을 요청하지 않는다.

- Supabase Kakao 공급자의 Allow users without an email은 이미 활성화돼 있으며 유지한다.
- 앱의 signInWithOAuth 옵션에 카카오만 queryParams: { scope: "profile_nickname profile_image" }를 지정한다.
- 복수 scopes는 기본값에 항목을 추가하지만 단수 scope는 실제 공급자 요청값을 지정한다. 이전 조사에서 이 둘을 구분하지 않아 콘솔 수정만 가능하다고 안내한 내용은 정정한다.
- 2026-09-08 라이브 /authorize 응답에서 account_email 제외 확인. 인증 가드 5개, 모바일 브라우저 소셜 로그인 8개 통과.
- 이메일 없는 카카오 계정은 이메일로 다른 로그인 계정과 자동 연결되지 않을 수 있다. 카카오 사용자 식별자로 인증한다.

## 복귀 주소

Supabase Site URL: https://health-app-five-iota.vercel.app

Redirect URLs에는 기존 항목을 유지하며 다음 주소가 추가돼 있다.

- https://health-app-five-iota.vercel.app/auth/callback
- https://health-app-five-iota.vercel.app/auth/callback?**
- http://localhost:3000/auth/callback
- http://localhost:3000/auth/callback?**

Kakao의 Redirect URI는 https://hgfsfupazyjcrmophmzc.supabase.co/auth/v1/callback 이다.

## 앱 복귀

구글·카카오 공통으로 앱에서 시작한 요청에는 native=1과 next가 보존돼야 한다. 이미 앱 WebView로 돌아온 요청은 세션을 교환하고, 외부 브라우저는 helssu://auth/callback으로 자동 복귀를 시도하며 수동 복귀 버튼을 제공한다.

## 검증과 배포

- node node_modules/vitest/vitest.mjs run --config vitest.auth.config.ts: 공급자·복귀 주소·실제 Kakao scope 검사.
- tests/e2e/social-login.spec.ts: 웹 및 앱 시작 요청, PKCE 쿠키, 복귀 링크, 취소 오류 검사.
- 사용자 운영 배포 후 카카오 실제 인증 → 앱 복귀 → 재실행 로그인 유지를 확인한다. 자동 검사만으로 실계정 로그인 성공을 단정하지 않는다.

근거: [Supabase 카카오 설정](https://supabase.com/docs/guides/auth/social-login/auth-kakao), [카카오 오류 코드](https://developers.kakao.com/docs/ko/kakaologin/trouble-shooting).
