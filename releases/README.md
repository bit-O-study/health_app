# APK 저장소 (disk, 일자별)

빌드한 안드로이드 APK 를 **날짜별 폴더**로 여기(디스크)에 보관한다. git 에도 올라가므로
사용자가 GitHub 에서 그대로 내려받아 설치할 수 있다.

## 경로 규칙

```
releases/apk/<YYYY-MM-DD>/helssu-debug.apk
```

- 새 APK 를 빌드하면 **그날 날짜 폴더**를 만들어 그 안에 `helssu-debug.apk` 로 저장한다.
- 예: `releases/apk/2026-07-01/helssu-debug.apk`
- 빌드 방법·환경은 `tools/NATIVE-ANDROID.md` 참고(Claude 가 빌드).

## 설치

- USB(adb): 기존 앱 삭제 후 설치 권장(브리지/플러그인 변경 확실히 반영)
  ```
  "C:/Users/admin/android-sdk/platform-tools/adb.exe" uninstall app.helssu.twa
  "C:/Users/admin/android-sdk/platform-tools/adb.exe" install -r releases/apk/<날짜>/helssu-debug.apk
  ```
- 또는 APK 파일을 폰으로 옮겨 직접 설치(알 수 없는 앱 설치 허용). 기존 헬쑤 앱은 먼저 삭제.

## 설치 후 확인 (걸음수/네이티브 브리지)

앱 → 캘린더 탭 하단 진단칩 `🩺 브릿지O · 네이티브O · 플러그인O · HC=… · 권한=… · 레코드=… · 합계=…`.
`브릿지O` 면 Capacitor 브리지 정상. (안 뜨거나 `브릿지X` 면 `tools/NATIVE-ANDROID.md` 의
"브리지 미주입" 절 참고.)
