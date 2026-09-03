# APK 저장소 (disk, 일자별)

빌드한 안드로이드 APK 를 **날짜별 폴더**로 여기(디스크)에 보관한다. git 에도 올라가므로
사용자가 GitHub 에서 그대로 내려받아 설치할 수 있다.

## 경로·이름 규칙

```
releases/apk/<YYYY-MM-DD>/helssu-v<versionName>-<versionCode>-<커밋7자>-<YYYYMMDD-HHmm>.apk
```

예: `releases/apk/2026-08-31/helssu-v1.0.3-4-d4717df-20260831-1612.apk`

- 날짜·시각은 **한국(KST) 기준** — 빌드 머신 시간대와 무관하게 같은 이름이 나온다.
- 커밋 안 된 변경이 있는 상태로 구우면 `-dirty` 가 붙는다(그 APK 는 재현 불가라는 뜻).
- `RELEASE_NOTE=tab-crash-fix` 를 주면 뒤에 짧은 메모가 붙는다.
- release 빌드는 `helssu-release-...` 로 타입이 이름에 들어간다(debug 는 생략).

> 2026-08-31 이전 파일은 `helssu-debug.apk` / `app-debug-<날짜>-<해시>.apk` /
> `helssu-debug-v3-tab-crash-fix.apk` 세 가지가 섞여 있다. 어느 커밋인지 이름만으로
> 알 수 없어 규칙을 통일했다. 옛 파일은 그대로 두고 `history.json` 에 채워 넣었다(backfill).

## 보관은 빌드가 자동으로 한다

`corepack pnpm android:setup:win` 이 끝나면 `archive_apk` 가 규칙대로 복사하고 이력을 갱신한다.
따로 돌리려면:

```bash
node tools/release/release-apk.mjs                  # 방금 빌드한 debug APK 보관
node tools/release/release-apk.mjs --note oauth-fix
node tools/release/release-apk.mjs rollback         # 검증된 롤백 후보 보기
node tools/release/release-apk.mjs sync             # HISTORY.md 다시 생성
node tools/release/release-apk.mjs backfill         # 이력에 없는 기존 APK 채우기
```

## 같은 내용 APK 는 두 번 만들지 않는다

보관 전에 sha256 을 비교해서, **내용이 완전히 같은 APK 가 이미 있으면 새 파일을 만들지 않는다.**
대신 "이 커밋에서도 같은 결과가 나왔다"는 기록만 기존 항목에 붙인다.
(14MB 짜리가 git 에 계속 쌓이던 문제 — 실제로 기존 18개 중 5개가 내용 동일이었다.)

## 배포 이력

- `releases/apk/history.json` — 원본(빌드 시각·버전·커밋·sha256·크기·검증여부·logcat 경로)
- `releases/apk/HISTORY.md` — 사람이 읽는 표. **자동 생성이므로 직접 고치지 말 것**

## 설치

```bash
ADB="C:/Users/admin/android-sdk/platform-tools/adb.exe"
"$ADB" uninstall app.helssu.twa      # 브리지/플러그인 변경을 확실히 반영하려면 삭제 후 설치
"$ADB" install -r releases/apk/<날짜>/<파일명>.apk
```

또는 APK 파일을 폰으로 옮겨 직접 설치(알 수 없는 앱 설치 허용). 기존 헬쑤 앱은 먼저 삭제.

## 설치 후 확인

**전체 절차는 `tools/RELEASE-CHECKLIST.md`** — 로그인·탭 순회·Health Connect·푸시를
실기기에서 확인하고, 그 결과를 `verify` 로 이력에 남긴다. 통과 기록이 있어야 롤백 후보가 된다.

빠른 확인: 앱 → 캘린더 탭 하단 진단칩
`🩺 브릿지O · 네이티브O · 플러그인O · HC=… · 권한=… · 레코드=… · 합계=…`.
`브릿지O` 면 Capacitor 브리지 정상. (안 뜨거나 `브릿지X` 면 `tools/NATIVE-ANDROID.md` 의
"브리지 미주입" 절 참고.)
