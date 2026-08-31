# Android 릴리스 체크리스트

> APK 를 굽고 → 실기기에서 확인하고 → 그 결과를 이력에 남기는 절차.
> **여기 있는 실기기 항목을 통과하고 `verify` 로 기록해야만 롤백 후보가 된다.**
> 배포 이력은 `releases/apk/HISTORY.md`(자동 생성), 원본은 `releases/apk/history.json`.

## 1. 빌드

```bash
corepack pnpm android:setup:win     # 또는 android:setup (linux/mac)
```

빌드가 끝나면 `archive_apk` 가 자동으로:

- `releases/apk/<YYYY-MM-DD>/helssu-v<버전>-<versionCode>-<커밋7>-<YYYYMMDD-HHmm>.apk` 로 복사
- 커밋 안 된 변경이 있으면 파일명에 `-dirty` 를 붙임 (재현 불가 빌드라는 표시)
- **내용(sha256)이 같은 APK 가 이미 있으면 새로 만들지 않고** 기존 파일을 알려줌
- `history.json` · `HISTORY.md` 갱신

메모를 파일명에 넣고 싶으면:

```bash
RELEASE_NOTE=tab-crash-fix corepack pnpm android:setup:win
```

보관만 다시 하려면: `node tools/release/release-apk.mjs`
(`SKIP_RELEASE=1` 이면 빌드만 하고 보관은 건너뜀.)

## 2. 설치

```bash
ADB="C:/Users/admin/android-sdk/platform-tools/adb.exe"
"$ADB" devices                       # 기기가 보이는지 먼저 확인
"$ADB" uninstall app.helssu.twa      # 브리지·플러그인 변경을 확실히 반영하려면 삭제 후 설치
"$ADB" install -r releases/apk/<날짜>/<파일명>.apk
```

## 3. logcat 을 켠 채로 확인한다

검증은 **반드시 logcat 을 파일로 받으면서** 한다. 나중에 "그때 뭐가 죽었는지" 를
되짚을 수 있는 유일한 근거다.

```bash
"$ADB" logcat -c
"$ADB" logcat > logcat-$(date +%Y%m%d-%H%M).txt
# 확인이 끝나면 Ctrl+C
```

크래시·렌더러 사망을 빨리 보려면 다른 창에서:

```bash
"$ADB" logcat | grep -Ei "helssu|WebViewRender|chromium|FATAL|lowmemorykiller|am_kill|DEAD_OBJECT"
```

- `Render process (pid …) kill(true)` / `WebViewRenderProcessGone` → 렌더러 OOM
- `FATAL EXCEPTION` → 네이티브 크래시

## 4. 실기기 검증 항목

전부 통과해야 `verify` 로 기록한다. 하나라도 실패하면 `--fail` 로 남긴다.

### 4.1 로그인

- [ ] 이메일+비밀번호 로그인
- [ ] 카카오 로그인 (OAuth 콜백이 앱으로 되돌아오는지)
- [ ] 앱을 완전히 종료했다가 다시 열었을 때 로그인 유지
- [ ] 로그아웃 → 재로그인

### 4.2 탭 순회 (팅김 회귀 확인)

- [ ] 하단 탭 전체를 **왕복 3회 이상** 천천히 순회 — 홈·루틴·운동·식단·커뮤니티·설정
- [ ] 같은 순회를 **빠르게** 한 번 더 (렌더러 메모리 압박)
- [ ] 순회 중 화면이 번쩍이며 처음 화면으로 돌아가지 않는지
- [ ] logcat 에 `WebViewRenderProcessGone` 이 찍혔다면, **복구 후 `/home` 으로 갔는지**
      (문제를 일으킨 그 화면으로 되돌아가면 복구 로직 회귀 — 실패로 기록)
- [ ] 복구 안내 메시지가 1회만 뜨는지

### 4.3 Health Connect (걸음수)

- [ ] 캘린더 탭 하단 진단칩에 `브릿지O · 네이티브O · 플러그인O` 표시
- [ ] 권한 요청이 **버튼을 눌렀을 때만** 뜨는지 (자동·반복 요청이면 회귀)
- [ ] 이미 허용한 뒤 다시 들어갔을 때 권한 안내가 또 뜨지 않는지
- [ ] 걸음수 합계가 실제 기기 값과 맞는지

### 4.4 푸시 알림

- [ ] 알림 권한 요청 → 허용
- [ ] FCM 토큰이 등록되는지 (`fcm_tokens` 에 행 생성)
- [ ] 테스트 발송 수신 (관리자 화면 또는 cron 수동 호출)
- [ ] 알림 탭했을 때 앱이 올바른 화면으로 열리는지

### 4.5 운동 흐름 (핵심 동선 1회)

- [ ] 루틴 → 운동 시작 → 세트 완료 → 운동 종료까지 끊김 없이
- [ ] 앱을 백그라운드로 보냈다 돌아왔을 때 진행 상태 유지
- [ ] 런닝 모드 진입 → 30초 이상 유지 (3D 씬 메모리)

## 5. 결과를 이력에 남긴다

```bash
# 통과
node tools/release/release-apk.mjs verify <파일명>.apk \
  --logcat logcat-20260831-1612.txt \
  --device "갤럭시 S21 / Android 14"

# 실패
node tools/release/release-apk.mjs verify <파일명>.apk \
  --fail --logcat logcat-20260831-1612.txt --note "탭 3회차에서 렌더러 사망"
```

`--logcat` 으로 넘긴 파일은 APK 와 같은 날짜 폴더로 복사되어 함께 보관된다.

## 6. 롤백

```bash
node tools/release/release-apk.mjs rollback
```

**실기기 검증을 통과한 빌드만** 최신순으로 나온다. 검증 안 된 APK 로 되돌리면
롤백이 또 다른 사고가 되기 때문에 일부러 후보에서 뺀다.

```bash
"$ADB" install -r releases/apk/<날짜>/<검증된 파일>.apk
```

## 참고

- 빌드 환경·트러블슈팅: `tools/NATIVE-ANDROID.md`
- APK 보관 규칙: `releases/README.md`
- 배포 이력: `releases/apk/HISTORY.md`
