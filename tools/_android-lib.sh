#!/usr/bin/env bash
# 공통 라이브러리 — setup-android-linux.sh / setup-android-windows.sh 가 source 한다.
# 안드로이드(Capacitor) 빌드에 필요한 것 점검 → 없으면 설치 → 의존성 → cap sync → 디버그 APK.
# 멱등(여러 번 돌려도 안전). OS 차이(자바 설치·SDK zip)는 case 로 분기.
set -euo pipefail

# ── 로그 헬퍼 ───────────────────────────────────────────────────────────────
c_green='\033[0;32m'; c_yellow='\033[0;33m'; c_red='\033[0;31m'; c_reset='\033[0m'
log()  { printf "${c_green}▸ %s${c_reset}\n" "$*"; }
warn() { printf "${c_yellow}! %s${c_reset}\n" "$*"; }
err()  { printf "${c_red}✗ %s${c_reset}\n" "$*" >&2; }
have() { command -v "$1" >/dev/null 2>&1; }

# OS_KIND 는 엔트리포인트에서 설정(linux|mac|windows). 미설정 시 자동 감지.
detect_os() {
  if [ -n "${OS_KIND:-}" ]; then return; fi
  case "$(uname -s)" in
    Linux*)  OS_KIND=linux ;;
    Darwin*) OS_KIND=mac ;;
    MINGW*|MSYS*|CYGWIN*) OS_KIND=windows ;;
    *) OS_KIND=linux ;;
  esac
}

# 프로젝트 루트로 이동(스크립트 위치 기준 한 단계 위).
goto_root() {
  local here
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  cd "$here"
  log "프로젝트 루트: $here"
}

# ── 1) Node / pnpm ──────────────────────────────────────────────────────────
ensure_node() {
  if have node; then
    log "Node $(node -v) 확인"
  else
    err "Node.js 가 없습니다. https://nodejs.org 에서 LTS 설치 후 다시 실행하세요."
    exit 1
  fi
  if have corepack; then
    corepack enable >/dev/null 2>&1 || true
    log "corepack pnpm 사용"
  else
    warn "corepack 이 없습니다. 'npm i -g corepack' 후 다시 실행 권장."
  fi
}
PNPM() { corepack pnpm "$@"; }

# ── 2) JDK (Android 빌드용, 17 이상) ────────────────────────────────────────
jdk_ok() { java -version >/dev/null 2>&1; }
ensure_jdk() {
  if jdk_ok; then
    log "JDK 확인: $(java -version 2>&1 | head -1)"
    return
  fi
  warn "JDK 가 없습니다. 설치를 시도합니다($OS_KIND)…"
  case "$OS_KIND" in
    linux)
      if have apt-get; then sudo apt-get update -y && sudo apt-get install -y openjdk-17-jdk
      elif have dnf; then sudo dnf install -y java-17-openjdk-devel
      elif have pacman; then sudo pacman -S --noconfirm jdk17-openjdk
      else err "패키지매니저를 못 찾음. JDK 17 을 수동 설치하세요."; exit 1; fi ;;
    mac)
      if have brew; then brew install openjdk@17
      else err "Homebrew 가 없습니다. https://brew.sh 설치 후 'brew install openjdk@17'."; exit 1; fi ;;
    windows)
      if have winget; then winget install --silent --accept-source-agreements --accept-package-agreements EclipseAdoptium.Temurin.17.JDK
      elif have choco; then choco install -y temurin17
      else err "winget/choco 가 없습니다. Temurin 17 JDK 를 수동 설치하세요."; exit 1; fi ;;
  esac
  jdk_ok || { err "JDK 설치 후에도 java 를 못 찾습니다. 새 터미널에서 다시 실행하세요."; exit 1; }
  log "JDK 설치 완료"
}

# ── 3) Android SDK (cmdline-tools + platform/build-tools) ───────────────────
sdk_root() { echo "${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/android-sdk}}"; }
sdkmanager_bin() {
  local r; r="$(sdk_root)"
  # Windows(Git Bash)에선 실행 파일이 sdkmanager.bat 이다. 확장자 없는 이름을 찾으면
  # 이미 설치된 SDK를 "없다"고 오판해 재다운로드 → latest/bin 경로에서 실패한다.
  local ext=""; [ "${OS_KIND:-}" = "windows" ] && ext=".bat"
  # Git Bash 는 .bat 에 실행 비트를 안 주는 경우가 있어 -x 만으로는 못 찾는다 → -f 도 본다.
  local p="$r/cmdline-tools/latest/bin/sdkmanager$ext"
  if [ -f "$p" ]; then echo "$p"; return; fi
  # 표준 경로에 없으면 PATH 에 깔린 것을 쓴다(직접 설치·안드로이드 스튜디오 동봉분).
  if have sdkmanager; then command -v sdkmanager; return; fi
  # 아직 없음 — 호출부가 다운로드하도록 예상 경로를 그대로 돌려준다.
  echo "$p"
}
sdkmanager_ready() { local p="$1"; [ -f "$p" ] || [ -x "$p" ]; }
ensure_android_sdk() {
  local root; root="$(sdk_root)"
  local sm; sm="$(sdkmanager_bin)"
  # 예전엔 `[ -x "$sm" ] || have sdkmanager` 였다 — PATH 에만 sdkmanager 가 있으면
  # "확인" 으로 넘어간 뒤 아래에서 존재하지 않는 "$sm" 을 실행해 죽었다.
  # 이제 sdkmanager_bin 이 PATH 까지 훑어 실제 실행 가능한 경로를 돌려준다.
  if sdkmanager_ready "$sm"; then
    log "Android SDK 확인: $root (sdkmanager: $sm)"
  else
    warn "Android SDK 가 없습니다. cmdline-tools 를 받아 설치합니다 → $root"
    mkdir -p "$root/cmdline-tools"
    local url tmp
    case "$OS_KIND" in
      linux)   url="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" ;;
      mac)     url="https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip" ;;
      windows) url="https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" ;;
    esac
    tmp="$(mktemp -d)"
    log "cmdline-tools 다운로드…"
    if have curl; then curl -fsSL "$url" -o "$tmp/cmdline-tools.zip"
    elif have wget; then wget -q "$url" -O "$tmp/cmdline-tools.zip"
    else err "curl/wget 이 없습니다."; exit 1; fi
    ( cd "$tmp" && unzip -q cmdline-tools.zip )
    rm -rf "$root/cmdline-tools/latest"
    mv "$tmp/cmdline-tools" "$root/cmdline-tools/latest"
    rm -rf "$tmp"
    sm="$(sdkmanager_bin)"
    sdkmanager_ready "$sm" || { err "cmdline-tools 를 풀었는데도 sdkmanager 가 없습니다: $sm"; exit 1; }
  fi

  export ANDROID_SDK_ROOT="$root"
  export ANDROID_HOME="$root"
  export PATH="$root/platform-tools:$root/cmdline-tools/latest/bin:$PATH"

  # 설치 대상은 android/variables.gradle 의 compileSdk/targetSdk(=36)와 맞춘다.
  log "필수 SDK 패키지 설치(platform-tools, platforms;android-36, build-tools;36.0.0)…"
  yes | "$sm" --sdk_root="$root" --licenses >/dev/null 2>&1 || true
  # 프로젝트 compileSdk/targetSdk(변수: android/variables.gradle)와 맞춘다 — 현재 36.
  "$sm" --sdk_root="$root" "platform-tools" "platforms;android-36" "build-tools;36.0.0" >/dev/null
  log "Android SDK 준비 완료"
}

# ── 4) 의존성 + Capacitor 안드로이드 프로젝트 + 동기화 ──────────────────────
HEALTH_PLUGIN="${HEALTH_PLUGIN:-@kiwi-health/capacitor-health-connect}"
setup_capacitor() {
  log "의존성 설치(pnpm install)…"
  PNPM install

  # 걸음수(Health Connect) 플러그인 — 패키지명이 다르면 HEALTH_PLUGIN 환경변수로 교체.
  if ! PNPM ls "$HEALTH_PLUGIN" >/dev/null 2>&1; then
    log "걸음수 플러그인 설치: $HEALTH_PLUGIN"
    PNPM add "$HEALTH_PLUGIN" || warn "플러그인 설치 실패 — 패키지명을 확인하거나 HEALTH_PLUGIN 으로 지정하세요(걸음수 외 빌드는 계속 가능)."
  fi

  if [ ! -d android ]; then
    log "안드로이드 프로젝트 생성(cap add android)…"
    PNPM exec cap add android
  else
    log "기존 android/ 프로젝트 사용"
  fi
  log "웹 자산/플러그인 동기화(cap sync android)…"
  PNPM exec cap sync android

  # local.properties — Java properties 는 백슬래시가 이스케이프라 forward-slash 경로로 써야
  # 'java.io.IOException: 파일 이름…구문이 잘못' 을 피한다. (Windows 경로는 cygpath -m 로 변환)
  local sdkpath="$ANDROID_SDK_ROOT"
  if have cygpath; then sdkpath="$(cygpath -m "$ANDROID_SDK_ROOT")"; fi
  echo "sdk.dir=$sdkpath" > android/local.properties
  log "android/local.properties → sdk.dir=$sdkpath"
}

# ── 5) 디버그 APK 빌드 ──────────────────────────────────────────────────────
build_apk() {
  log "디버그 APK 빌드(gradlew assembleDebug)…"
  if [ "$OS_KIND" = "windows" ]; then
    ( cd android && cmd //c "gradlew.bat --no-daemon assembleDebug" )
  else
    ( cd android && chmod +x gradlew && ./gradlew --no-daemon assembleDebug )
  fi
  local apk="android/app/build/outputs/apk/debug/app-debug.apk"
  if [ -f "$apk" ]; then
    log "빌드 성공 → $apk"
    warn "휴대폰에 설치: adb install -r \"$apk\"  (USB 디버깅 + 기기 연결 필요)"
  else
    err "APK 를 찾지 못했습니다. 로그를 확인하세요."
    exit 1
  fi
}

# ── 6) 릴리스 보관 — 이름 규칙·중복판정·이력을 release-apk.mjs 가 담당 ──────
# RELEASE_NOTE 로 파일명에 짧은 메모를 붙일 수 있다(예: RELEASE_NOTE=tab-crash-fix).
# SKIP_RELEASE=1 이면 건너뛴다(빌드만 확인하고 싶을 때).
archive_apk() {
  if [ "${SKIP_RELEASE:-0}" = "1" ]; then
    warn "SKIP_RELEASE=1 — releases/ 보관을 건너뜁니다."
    return
  fi
  local args=()
  [ -n "${RELEASE_NOTE:-}" ] && args+=(--note "$RELEASE_NOTE")
  log "릴리스 보관(releases/apk/<날짜>/)…"
  node tools/release/release-apk.mjs "${args[@]+"${args[@]}"}" || {
    warn "릴리스 보관에 실패했습니다 — APK 자체는 정상입니다. 수동: node tools/release/release-apk.mjs"
  }
}

# ── 메인 ────────────────────────────────────────────────────────────────────
run_all() {
  detect_os
  log "OS: $OS_KIND"
  goto_root
  ensure_node
  ensure_jdk
  ensure_android_sdk
  setup_capacitor
  build_apk
  archive_apk
  log "완료 ✅  (걸음수 실제 동작은 삼성/안드 폰 + Health Connect 에서 확인하세요)"
  warn "실기기 검증 절차는 tools/RELEASE-CHECKLIST.md — 통과하면 verify 로 기록해야 롤백 후보가 됩니다."
}
