# 고객센터 운영 연결

구현: 회원 `/support`, 관리자 `/admin/support`, 알림 `/admin/support/notifications`.
카카오톡은 운영자가 연결한 계정의 **나와의 채팅**으로 보낸다. 유료 알림톡/문자 API는 호출하지 않는다.

## 서버 환경

- 기존 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`: 서버 전용. 문의 화면의 회원 CRUD는 사용자 세션/RLS를 사용한다. 사진과 발송 작업만 서버 키를 사용한다.
- `KAKAO_REST_API_KEY`: 카카오 Developers 앱의 REST 키
- `KAKAO_CLIENT_SECRET`: 카카오 앱에서 client secret이 활성화되어 있다면 필수
- `SUPPORT_TOKEN_ENCRYPTION_KEY`: 무작위 32바이트의 64자리 hex. 서버 전용, DB와 별도 보관. 키를 잃으면 카카오 재연결 필요.
- `NEXT_PUBLIC_SITE_URL`: 메시지 링크에 사용할 정식 URL.
- `SUPPORT_KAKAO_CALLBACK_ORIGIN`: OAuth 연결을 실행하는 사이트 origin. 미설정 시 NEXT_PUBLIC_SITE_URL을 사용한다. 로컬은 http://127.0.0.1:3000으로 설정해 운영 메시지 링크와 분리한다.
- `SUPPORT_STORAGE_BUDGET_BYTES`: 확인한 무료 저장 여유 안에서 고객센터에 배정할 용량. 최대 104857600(100MiB), 미설정은 업로드 중지. 현재 로컬은 사용량 확인 후 100MiB로 설정.
- `SUPPORT_CONTACT_EMAIL`: 로그인 도움말·정지 화면에 공개할 실제 운영 이메일. 사용자 답변 대기 중이며 임의 주소를 공개하지 않는다.
- `CRON_SECRET`: 기존 일일 유지 작업 인증. 고객센터 유지 작업은 설정된 비밀과 요청 헤더가 일치할 때만 실행한다.
- 기존 Web Push VAPID 설정: 운영자가 별도 푸시 동의하고 브라우저 기기를 등록했을 때만 보조 알림.

로컬 환경값은 `.env.local`(Git 제외)에 저장되어 있다. 운영 배포에는 별도 서버 환경변수 설정이 필요하다. 운영 토큰이 있는 상태에서 암호화 키를 임의 교체하지 않는다.

## 카카오 최초 연결

1. Kakao Developers에서 해당 앱의 카카오 로그인을 활성화한다.
2. 동의항목 `talk_message`를 사용할 수 있게 설정한다. 운영자 본인만 동의하며 일반 회원 로그인 scope는 변경하지 않는다.
3. Redirect URI에 `{SUPPORT_KAKAO_CALLBACK_ORIGIN 또는 NEXT_PUBLIC_SITE_URL}/api/support/kakao/callback`을 정확히 등록한다. 기존 Supabase 로그인 콜백은 유지한다.
4. 제품 링크 웹 도메인에 같은 사이트의 origin을 등록한다. 앱 사용 제한이 있으면 운영자가 앱 팀 멤버인지도 확인한다.
5. 해당 사이트 관리자 → 고객센터 → 카카오톡·기기 알림 설정 → 카카오 계정 연결 → 동의.
6. 연결된 계정 끝자리를 확인하고 ‘테스트 보내기’. 카카오 나와의 채팅에 도착했는지와 휴대폰 알림음/배너 동작을 각각 확인한다.

2026-09-25 헬쑤 앱 콘솔에 기존 Supabase 콜백을 유지하고 로컬(127.0.0.1:3000)·운영 고객센터 콜백을 등록했다. talk_message는 이용 중 동의로 저장했다. 운영 웹 도메인은 이미 등록되어 있다. 로컬 서버 client secret은 Git 제외 파일에 저장했다. 2026-09-26 운영자 계정의 실제 카카오 동의와 OAuth 콜백 성공을 확인했다. 관리자 화면 새로고침 후에도 연결됨과 문의 알림 활성화 상태가 유지된다. 실제 테스트 메시지·휴대폰 수신 확인은 아직 수행하지 않았다.

## 무료 한도와 발송 상태

- 카카오 API 시도 예산은 운영자별 최근 24시간 15회. 테스트·재전송도 포함한다. 테스트 요청은 하루 3회로 추가 제한한다.
- 신규 문의는 저장 직후 발송을 시도하며 추가답변/누적분은 일일 복구 또는 ‘대기 알림 처리’에서 합쳐 보낸다. 공급자 한도 오류가 있으면 24시간 기다린다.
- `api_succeeded`는 API 응답 성공이다. 실제 휴대폰 도착·읽음 확인은 제공하지 않는다.
- `unknown`은 전송 여부 불명이다. 자동 재전송하지 않으며 관리자 확인 후 ‘이 알림 재전송’을 사용한다. 원래 기록과 새 재전송 요청을 모두 남긴다.
- 토큰 갱신은 발송 전에 수행한다. 문의가 없는 계정도 일일 유지 작업에서 refresh 만료가 7일 이내이면 갱신을 시도한다. 철회/만료 시 재연결이 필요하다.
- 일일 크론이 실행되지 않는 로컬에서는 자동 일일 복구를 보장하지 않는다. 수동 대기 처리 가능. 운영 크론 실행/카카오 실제 수신은 별도 검증 대상이다.

## 사진·보존

사진은 접수 후 상세 화면에 첨부한다. 최대 3장, 입력 5MB 이하, JPEG/PNG/WebP 정지 사진만 허용한다. 서버에서 재인코딩해 EXIF를 제거하고 긴 변 1600px, 저장 500KiB 이하로 제한한다. 비공개 저장소와 5분 서명 URL을 사용하며 회원은 자신의 사진, 관리자만 전체 문의 사진에 접근한다.

고객센터 상한 외 프로젝트 전체 저장량 약 900MB 안전 상한도 검사한다. 다른 프로젝트·조직 단위 요금이나 DB/트래픽 전체 사용량까지 무조건 무료라고 보장하지 않는다. 요금제 자동 변경/유료 발송 대체는 하지 않는다.

사진/진단 30일, 종료 문의 180일, 완료 발송 기록 30일 정리를 기존 일일 크론에 연결했다. 탈퇴로 메타데이터가 사라진 고아 사진은 24시간 이후 정리 대상이다.

## 검증 명령

- `pnpm exec vitest run tests/be/logic/customer-support.test.ts tests/be/logic/support-actions.test.ts tests/be/logic/support-messaging.test.ts`
- `pnpm exec vitest run tests/be/customer-support.test.ts` (DB 롤백 검증)
- `pnpm exec playwright test tests/e2e/customer-support.spec.ts --project=mobile-chromium` (실행 중인 앱·테스트 DB 필요)

개별 검사와 실제 수행 결과는 DEVELOPMENT-ROADMAP.md에 기록한다. Kakao 연결 동의와 실제 기기 테스트를 수행하지 않은 상태에서 실수신 완료로 표시하지 않는다.
