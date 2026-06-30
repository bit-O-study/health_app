# 안드로이드 네이티브 앱 (Capacitor) — 걸음수 연동

웹앱(Next.js, Vercel 배포)을 **그대로** 안드로이드 앱으로 감싼다(Capacitor remote URL 방식).
WebView 가 배포된 사이트를 로드하므로 로그인·서버액션·API 가 웹과 100% 동일하게 동작하고,
**걸음수만 네이티브 브리지**(Health Connect)로 추가한다. 삼성헬스는 Health Connect 에 걸음수를
기록하므로 거기서 읽는다.

## 빌드/실행 (한 줄)

- 윈도우(**Git Bash** 에서): `bash tools/setup-android-windows.sh`  ( = `pnpm android:setup:win` )
- 리눅스/macOS: `bash tools/setup-android-linux.sh`  ( = `pnpm android:setup` )

스크립트가 하는 일(멱등, 여러 번 실행 안전):
1. Node / JDK(17+) / Android SDK 점검 → 없으면 설치(JDK·SDK 설치엔 네트워크/권한 필요)
2. `pnpm install` + 걸음수 플러그인 설치
3. `cap add android`(최초 1회) + `cap sync android`
4. 디버그 APK 빌드 → `android/app/build/outputs/apk/debug/app-debug.apk`

휴대폰에 설치: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`
(USB 디버깅 켠 안드로이드 기기 연결 필요)

## 설정

- 로드할 사이트: `capacitor.config.ts` 의 `server.url` (기본 = 운영 Vercel URL).
  - 로컬 dev 서버를 폰에서 보려면: 같은 와이파이에서
    `CAP_SERVER_URL=http://<PC-IP>:3000 bash tools/setup-android-windows.sh`
    그리고 `capacitor.config.ts` 의 `cleartext` 를 잠시 `true` 로.
- 걸음수 플러그인: 기본 `@kiwi-health/capacitor-health-connect`.
  다른 패키지를 쓰려면 `HEALTH_PLUGIN=<패키지명> bash tools/...sh` 로 지정하고,
  `src/features/health/steps-native.ts` 의 `HC_PLUGIN` 도 맞춘다.

## 동작 흐름(걸음수)

`StepsSync`(마이페이지) 마운트 → 네이티브면 `readTodaySteps()`(Health Connect) → `saveStepsAction()` →
`daily_steps` 테이블 upsert → 마이페이지 "오늘 걸음수" 표시. **웹에선 전부 no-op**(걸음수 "—").

## 안 되는 것 / 다음 단계

- **iOS**: macOS + Xcode 필요(여기선 못 만듦). 같은 구조에 HealthKit 플러그인만 추가하면 됨.
- **실제 걸음수 검증**: 에뮬레이터엔 실데이터가 없어, 삼성/안드 실기기 + Health Connect 앱에서 확인.
- 스토어 출시: Google Play 개발자 등록($25), 서명 키, Health Connect 권한 사유 기재 필요.
