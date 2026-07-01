# 안드로이드 네이티브 앱 (Capacitor) — 걸음수 연동

웹앱(Next.js, Vercel 배포)을 **그대로** 안드로이드 앱으로 감싼다(Capacitor remote URL 방식).
WebView 가 배포된 사이트를 로드하므로 로그인·서버액션·API 가 웹과 100% 동일하게 동작하고,
**걸음수만 네이티브 브리지**(Health Connect)로 추가한다. 삼성헬스는 Health Connect 에 걸음수를
기록하므로 거기서 읽는다.

## 🔴 APK 빌드 — Claude 가 만든다. 여기 그대로 따라 하면 됨 (이 PC 에서 검증됨)

> 사용자는 Claude(내)가 APK 를 만들어 주기를 기대한다. 매번 잊지 말 것.
> 이 저장소 PC(Windows, admin) 에서 **실제로 되는** 환경/명령은 아래와 같다.

**검증된 환경 (이 PC):**
- JDK: `C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot` (JDK 21, 이미 설치됨)
- Android SDK: `C:/Users/admin/android-sdk` (`android/local.properties` 의 `sdk.dir` 이 이걸 가리켜야 함)

**한 줄 빌드 (권장, 멱등):**
```bash
corepack pnpm android:setup:win     # = bash tools/setup-android-windows.sh
```
스크립트가 하는 일: JDK/SDK 점검 → `pnpm install` → `cap sync android` →
`android/local.properties` 작성 → `gradlew.bat --no-daemon assembleDebug` →
APK 를 `android/app/build/outputs/apk/debug/app-debug.apk` 에 생성.

**수동 빌드 (스크립트가 막힐 때, Git Bash):**
```bash
export ANDROID_SDK_ROOT="C:/Users/admin/android-sdk"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
corepack pnpm exec cap sync android                 # 웹자산·플러그인·설정 동기화
echo "sdk.dir=C:/Users/admin/android-sdk" > android/local.properties
( cd android && cmd //c "gradlew.bat --no-daemon assembleDebug" )
```

**결과물 / 설치:**
- 빌드 산출물: `android/app/build/outputs/apk/debug/app-debug.apk` (gitignore 됨)
- 🔴 **빌드하면 반드시 disk 일자별 폴더에 저장한다** (사용자 규칙):
  ```
  releases/apk/<YYYY-MM-DD>/helssu-debug.apk
  ```
  예) `cp android/app/build/outputs/apk/debug/app-debug.apk releases/apk/$(date +%F)/helssu-debug.apk`
  (폴더 없으면 `mkdir -p`). 이 폴더는 git 에 올라가 사용자가 GitHub 에서 받아 설치한다.
  자세한 규칙은 `releases/README.md`.
- 설치: `adb install -r releases/apk/<날짜>/helssu-debug.apk`
  (USB 디버깅 켠 기기 연결. 기존 앱은 먼저 완전 삭제 후 설치 권장 — 브리지/플러그인
  변경은 clean 재설치라야 확실히 반영된다.)

리눅스/macOS 는 `corepack pnpm android:setup`(= `tools/setup-android-linux.sh`).

## ⚠️ 앱인데 걸음수/버튼/진단칩이 하나도 안 뜰 때 = Capacitor 브리지 미주입

앱(설치 APK) 안에서 `window.Capacitor` 가 없으면 `isNativePlatform()` 이 false 라
**모든 네이티브 플러그인(걸음수 포함)이 동작 안 한다.**

🔴 **가장 흔한 진짜 원인(이 앱에서 실제로 이거였음):** 안드로이드에서 `server.url` 로
**외부 도메인**(우리 Vercel 주소)을 로드하면 Capacitor 가 `window.Capacitor` 를 주입 안 하는
알려진 버그([ionic-team/capacitor#7269](https://github.com/ionic-team/capacitor/issues/7269)).
**해결: `capacitor.config.ts` 에 `appendUserAgent: "helssu-app"`(아무 문자열) 추가.**
이 값이 있어야 브리지가 주입된다 — 지우지 말 것. (변경 후 `cap sync` + APK 재빌드 필요.)

그 외 원인: **APK 가 구버전/불완전 빌드**.
1. 위 "한 줄 빌드" 로 **clean 재빌드** → 기존 앱 삭제 후 새 APK 설치.
2. 확인(배포 불필요): PC 에 폰 USB 연결 → 크롬 `chrome://inspect` → 헬쑤 WebView `inspect`
   → 콘솔에 `window.Capacitor` / `Capacitor?.isNativePlatform?.()` 입력.
3. 배포 후: 앱에서 `/calendar?stepsdebug=1` 로 열면 브리지가 없어도 진단칩(🩺)이 강제로
   떠서 `브릿지X` 여부가 눈에 보인다.
4. 앱은 `capacitor.config.ts` 의 `server.url`(운영 Vercel) 을 로드하므로, **웹 코드 수정은
   배포(push→Vercel)해야 앱에 반영**된다. 네이티브(브리지/플러그인) 수정은 APK 재빌드 필요.

## 설정

- 로드할 사이트: `capacitor.config.ts` 의 `server.url` (기본 = 운영 Vercel URL).
  - 로컬 dev 서버를 폰에서 보려면: 같은 와이파이에서
    `CAP_SERVER_URL=http://<PC-IP>:3000 bash tools/setup-android-windows.sh`
    그리고 `capacitor.config.ts` 의 `cleartext` 를 잠시 `true` 로.
- 걸음수 플러그인: 기본 `@kiwi-health/capacitor-health-connect`.
  다른 패키지를 쓰려면 `HEALTH_PLUGIN=<패키지명> bash tools/...sh` 로 지정하고,
  `src/features/health/steps-native.ts` 의 `HC_PLUGIN` 도 맞춘다.

## 동작 흐름(걸음수)

`StepsSync`(**캘린더 상단**) 마운트 → 네이티브면 최근 7일 걸음수를 서울 날짜별로 읽어
(`readStepsByDay`, Health Connect) → `saveStepsDaysAction()` → `daily_steps` upsert →
캘린더 "오늘 N걸음" 표시. **웹에선 전부 no-op**(칩·버튼 숨김).

## 안 되는 것 / 다음 단계

- **iOS**: macOS + Xcode 필요(여기선 못 만듦). 같은 구조에 HealthKit 플러그인만 추가하면 됨.
- **실제 걸음수 검증**: 에뮬레이터엔 실데이터가 없어, 삼성/안드 실기기 + Health Connect 앱에서 확인.
- 스토어 출시: Google Play 개발자 등록($25), 서명 키, Health Connect 권한 사유 기재 필요.
