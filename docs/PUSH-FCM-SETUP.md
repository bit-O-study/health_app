# 상태표시줄 푸시 알림(네이티브 FCM) 연동 가이드

## 왜 지금은 안 되나
폰 앱은 **Capacitor WebView**(원격 Vercel URL 로드)라 브라우저의 Web Push(서비스워커 푸시)를
지원하지 않는다. 웹 푸시 코드(`src/features/notifications/*`, `public/sw.js`)는 정상이지만
**WebView 에는 PushManager 가 없어 구독조차 안 된다.** 상태표시줄 알림을 받으려면
**네이티브 FCM(Firebase Cloud Messaging)** 을 붙여야 한다.

현재 준비 완료(빌드 안전한 것):
- `AndroidManifest.xml` 에 `POST_NOTIFICATIONS` 권한 추가(Android 13+ 필수).

## 🔴 사용자가 준비해야 할 것 (이게 있어야 나머지 연결 가능)
아래 3개는 외부(Firebase 콘솔)에서 만들어야 하며, 없으면 gradle 에 google-services 를
넣는 순간 **APK 빌드가 깨진다**(그래서 아직 안 넣음).

1. **Firebase 프로젝트 생성** → Android 앱 추가
   - 패키지명: `app.helssu.twa` (정확히 이 값)
   - `google-services.json` 다운로드 → `android/app/google-services.json` 에 배치
2. **서버 전송용 서비스 계정 키**
   - Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성" → JSON 다운로드
   - 이 JSON 을 Vercel 환경변수로 넣을 것(아래 4번에서 내가 연결):
     `FIREBASE_SERVICE_ACCOUNT`(JSON 전체 문자열) 또는 분리형(project_id/client_email/private_key)
3. (선택) Firebase 콘솔에서 **Cloud Messaging API(V1)** 활성화 확인

## 내가 연결할 것 (위 아티팩트를 받으면)
1. `@capacitor/push-notifications` 설치 + `android/app/build.gradle` 에 google-services 플러그인,
   `build.gradle`(project) 에 classpath 추가.
2. **클라이언트**: 네이티브 환경에서 `PushNotifications.register()` → FCM 토큰 수신 →
   서버에 저장(`push_subscriptions` 를 확장하거나 `fcm_tokens` 테이블 신설). 권한요청 흐름 연결.
   웹(브라우저)에서는 기존 Web Push 경로 유지(플랫폼 분기).
3. **서버 전송**: 기존 `sendPush()` 에 FCM 경로 추가 — FCM 토큰이면 `firebase-admin`(또는 HTTP v1 API)
   로 전송, Web Push 구독이면 기존 `web-push` 로 전송. 트리거(응원·주간MVP·리마인더)는 그대로 재사용.
4. env 설정 안내 + APK 재빌드 + 실기기 테스트.

## 참고: 현재 푸시 파이프라인(웹)
- 구독: `src/features/notifications/push-client.ts` (`ensurePushSubscribed`, VAPID `NEXT_PUBLIC_VAPID_PUBLIC_KEY`)
- 저장: `push-actions.ts` → `push_subscriptions` 테이블
- 전송: `src/features/notifications/push.ts` (`sendPush`, `web-push`, `VAPID_PRIVATE_KEY`)
- SW 핸들러: `public/sw.js` (`push` 이벤트 → `showNotification`) — 정상 구현됨
- 트리거: 그룹 응원(`group-actions.ts`), 주간 MVP(`weekly-mvp.ts`), 일일 리마인더 cron

## 보너스(발견된 별개 이슈)
- `workout-inactivity` cron 이 `vercel.json` 에 등록 안 됨 → 자동 실행 안 됨(원하면 등록).
- 웹 PWA 경로가 프로덕션에서 동작하려면 Vercel 에 `NEXT_PUBLIC_VAPID_PUBLIC_KEY` /
  `VAPID_PRIVATE_KEY` 가 설정돼 있어야 함(확인 필요).
