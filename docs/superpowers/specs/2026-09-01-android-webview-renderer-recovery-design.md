# Android WebView 렌더러 종료 복구 설계

## 문제

Android 앱은 Capacitor `BridgeActivity` 안의 원격 WebView로 웹앱을 표시한다. 현재
`MainActivity`의 `BridgeWebViewClient`는 메인 프레임 네트워크 오류만 처리하고
`onRenderProcessGone`은 처리하지 않는다. 따라서 Android가 메모리 회수를 위해 WebView
렌더러를 종료하거나 렌더러가 자체 충돌하면 앱 프로세스까지 종료될 수 있다.

앱이 다시 시작되면 웹의 `RouteKeeper`는 30분 안에 저장한 마지막 경로를 복원한다. 마지막
경로 자체가 렌더러 종료를 유발했다면 같은 화면을 다시 열어 종료가 반복될 수 있지만,
`RouteKeeper`는 네이티브 종료 원인을 알 수 없어 이를 차단하지 못한다.

## 목표

- WebView 렌더러 종료를 앱 종료로 전파하지 않고 새 WebView로 복구한다.
- 첫 종료에서는 사용 흐름을 보존하기 위해 기존 경로 복원을 한 번 허용한다.
- 첫 종료 후 5분 안에 다시 종료되면 마지막 경로 복원을 차단하고 `/home`으로 이동한다.
- 복구 뒤 사용자에게 한 번만 짧은 안내를 보여준다.
- 종료 시각, 직전 pathname, 반복 횟수, `didCrash`, renderer priority를 Android 로그와
  `SharedPreferences`에 남긴다.

## 비목표

- 실제 기기가 없는 상태에서 메모리 부족과 WebView 내부 충돌 중 하나로 원인을 확정하지
  않는다.
- 이번 변경에서 개별 화면의 WebGL, 동영상, 카메라 메모리 사용량을 최적화하지 않는다.
- 일반 네트워크 실패와 Next.js 청크 복구 정책은 바꾸지 않는다.

## 검토한 접근

1. **네이티브 종료 감지 + 웹 복원 정책 연동 (선택)**
   `onRenderProcessGone`에서 WebView를 폐기하고 종료 상태를 영속화한다. 새 Activity의
   JavaScript 브리지가 상태를 한 번 전달하면 `RouteKeeper`가 복원 또는 안전 홈을 결정한다.
   Android가 제공하는 실제 종료 신호를 사용하므로 오탐이 가장 적다.
2. 웹의 `RouteKeeper`만 시간 제한한다.
   정상 앱 재실행과 렌더러 종료를 구분할 수 없어 정상 사용자를 홈으로 보내거나 실제 종료
   루프를 놓친다.
3. 모든 렌더러 종료에서 즉시 홈으로 이동한다.
   가장 단순하지만 일회성 OS 메모리 회수에도 사용 중이던 화면을 잃어 사용자 경험 손실이
   크다.

## 설계

### Android 종료 감지와 복구

`MainActivity`의 기존 `BridgeWebViewClient`에 `onRenderProcessGone`을 추가한다.

1. `RenderProcessGoneDetail.didCrash()`와 `rendererPriorityAtExit()`, 현재 URL의 pathname,
   현재 시각을 기록한다. query string과 사용자 데이터는 저장하지 않는다.
2. `RendererRecoveryPolicy`가 `SharedPreferences`의 직전 종료 시각과 횟수를 읽는다.
   - 이전 종료가 없거나 5분 이상 지났으면 횟수 1, 복구 모드 `restore_once`.
   - 5분 안의 두 번째 이상 종료면 횟수를 증가시키고 복구 모드 `safe_home`.
3. 구조화된 한 줄 로그를 `HelssuWebView` 태그로 남긴다.
4. 종료된 WebView를 부모에서 제거하고 `destroy()`한다. 이 인스턴스는 재사용하지 않는다.
5. 콜백에서 `true`를 반환하고 Activity를 재생성해 Capacitor가 새 WebView를 만들게 한다.

정책 계산은 Android 프레임워크와 분리한 순수 Java 클래스로 두어 로컬 JUnit에서 검증한다.

### 네이티브-웹 전달

기존 `window.HelssuNative` 브리지에 `consumeRendererRecovery()`를 추가한다. JSON 문자열로
다음 최신 이벤트를 한 번 반환하고 pending 표시만 소비한다.

- `mode`: `restore_once` 또는 `safe_home`
- `occurredAt`: 종료 시각
- `count`: 5분 창 안의 종료 횟수
- `didCrash`: WebView 내부 충돌 여부

원인 분석용 전체 최신 진단은 `SharedPreferences`에 유지한다. 브리지가 없거나 JSON이
손상되면 웹은 기존 `RouteKeeper` 동작으로 폴백한다.

### RouteKeeper와 사용자 안내

`RouteKeeper`는 마운트 직후 네이티브 복구 이벤트를 먼저 읽고 이후 기존 경로 복원 여부를
판단한다.

- 이벤트 없음: 기존 30분 경로 복원 정책 유지.
- `restore_once`: 기존 경로를 한 번 복원하고 `앱 화면을 복구했어요.` 안내 표시.
- `safe_home`: `heltch.lastRoute`를 삭제하고 `/home`으로 `replace`한다. 이후
  `화면 오류가 반복되어 홈으로 안전하게 이동했어요.` 안내 표시.

안내는 `role="status"`인 작은 고정 배너로 한 번만 렌더링하고 6초 뒤 사라진다. 별도 전역
알림 시스템이나 새 의존성은 추가하지 않는다.

## 오류 처리

- `SharedPreferences`, 브리지 JSON, `localStorage` 접근 실패는 복구를 중단시키지 않는다.
- `onRenderProcessGone`에서는 종료된 WebView에 `reload()`를 호출하지 않는다.
- 기존 네트워크 `scheduleReload`의 pending callback을 취소해 폐기된 WebView 접근을 막는다.
- 안전 홈 모드가 반복되더라도 마지막 문제 경로는 다시 저장하거나 복원하지 않는다.

## 진단과 실제 기기 확인

실제 기기가 연결되면 다음 로그를 같은 타임라인에서 수집한다.

```text
adb logcat -v threadtime HelssuWebView:V chromium:V AndroidRuntime:E *:S
```

`didCrash=false`이면 Android가 메모리 회수를 위해 renderer를 종료했을 가능성이 높고,
`didCrash=true`이면 WebView renderer 내부 충돌이다. 실제 탭 이동 재현 로그가 확보되기
전에는 어느 쪽도 확정 원인이라고 보고하지 않는다.

## 테스트

- Java 단위 테스트: 최초 종료, 5분 내 반복 종료, 정확히 5분 경계, 오래된 이벤트 초기화.
- TypeScript 단위 테스트: native 이벤트 파싱, 첫 종료 복원 허용, 반복 종료 홈 폴백,
  손상되거나 없는 브리지 데이터의 기존 동작 유지.
- 기존 `route-restore` 테스트로 웹/딥링크 복원 회귀 방지.
- 전체 Vitest, TypeScript/Next.js 빌드, Android `testDebugUnitTest`와
  `compileDebugJavaWithJavac` 실행.
- 실제 기기 검증은 기기가 준비될 때 탭 이동 재현과 logcat 수집으로 별도 완료한다.

## 근거

- Android 공식 문서는 renderer 종료 시 해당 WebView를 제거·파괴하고 새 인스턴스를 만든
  뒤 `true`를 반환해야 한다고 명시한다.
- 같은 페이지를 즉시 다시 로드하면 새 WebView에서도 같은 renderer 종료가 반복될 수 있다고
  경고한다.

참고:

- https://developer.android.com/develop/ui/views/layout/webapps/handle-termination
- https://developer.android.com/reference/android/webkit/WebViewClient#onRenderProcessGone(android.webkit.WebView,android.webkit.RenderProcessGoneDetail)
