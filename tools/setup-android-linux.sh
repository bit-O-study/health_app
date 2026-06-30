#!/usr/bin/env bash
# 리눅스/macOS용 — 안드로이드(Capacitor) 빌드 준비 + 디버그 APK까지.
# 사용: bash scripts/setup-android-linux.sh
#
# 하는 일: Node/JDK/Android SDK 점검 → 없으면 설치 → 의존성 → cap add/sync → 디버그 APK 빌드.
# (JDK/SDK 설치엔 sudo·네트워크가 필요할 수 있습니다.)
set -euo pipefail

case "$(uname -s)" in
  Darwin*) OS_KIND=mac ;;
  *)       OS_KIND=linux ;;
esac
export OS_KIND

# shellcheck source=scripts/_android-lib.sh
source "$(dirname "$0")/_android-lib.sh"
run_all
