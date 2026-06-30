#!/usr/bin/env bash
# 윈도우용(Git Bash에서 실행) — 안드로이드(Capacitor) 빌드 준비 + 디버그 APK까지.
# 사용: "Git Bash" 를 열고  ->  bash scripts/setup-android-windows.sh
#
# 하는 일: Node/JDK/Android SDK 점검 → 없으면 설치(winget/choco) → 의존성 → cap add/sync → 디버그 APK.
# 주의:
#  - Git Bash 에서 돌립니다(PowerShell/CMD 아님).
#  - JDK 설치는 winget 또는 choco 를 씁니다. 둘 다 없으면 Temurin 17 을 수동 설치하세요.
#  - 설치 직후엔 PATH 반영을 위해 새 Git Bash 창에서 다시 실행해야 할 수 있습니다.
set -euo pipefail

export OS_KIND=windows

# shellcheck source=scripts/_android-lib.sh
source "$(dirname "$0")/_android-lib.sh"
run_all
