# 릴리스 APK 보관 규칙

빌드한 안드로이드 APK는 **여기(`releases/apk/`)에 날짜별 폴더로 정리**해서 보관한다.

## 경로 규칙

```
releases/apk/<YYYY-MM-DD>/app-debug-<YYYY-MM-DD>-<git단축해시>.apk
```

- 폴더 = 빌드한 **날짜**(`YYYY-MM-DD`).
- 파일명 = `app-debug-<날짜>-<해시>.apk` — 어떤 커밋으로 빌드했는지 추적 가능.
- release(서명) 빌드면 `app-release-...` 로 접두어만 바꾼다.

예) `releases/apk/2026-07-06/app-debug-2026-07-06-8c070ea.apk`

## 빌드 방법

```bash
# 셋업(최초 1회, 또는 SDK/의존성 갱신 필요할 때)
corepack pnpm android:setup:win     # Git Bash

# 이미 셋업돼 있으면 gradle로 바로 디버그 APK
cd android && cmd //c "gradlew.bat --no-daemon assembleDebug"
# 산출물: android/app/build/outputs/apk/debug/app-debug.apk
```

빌드 후 위 산출물을 이 규칙대로 복사한다:

```bash
DATE=$(date +%F); HASH=$(git rev-parse --short HEAD)
mkdir -p "releases/apk/$DATE"
cp android/app/build/outputs/apk/debug/app-debug.apk \
   "releases/apk/$DATE/app-debug-$DATE-$HASH.apk"
```

## git 추적 정책

- **APK 도 git에 커밋한다**(추적한다). 여기 `releases/apk/<날짜>/` 에 넣은 `.apk` 를
  `git add` 해서 함께 올린다. (기존 `2026-07-01/helssu-debug.apk` 도 추적 중)

## 주의

- 앱은 원격 Vercel URL을 로드하므로, 웹 변경은 **APK 재빌드가 아니라 Vercel 배포**로 반영된다. APK 재빌드는 **네이티브(안드로이드) 변경**(AndroidManifest, 플러그인 등)일 때만 필요.
