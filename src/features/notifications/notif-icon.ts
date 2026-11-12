/**
 * 상태표시줄 알림에 쓰는 로고 아이콘 — 서버(FCM)와 앱(로컬 알림)이 같은 값을 쓴다.
 *
 * 안드로이드는 알림 작은 아이콘을 "이름"으로 찾는다(android/app/src/main/res/drawable/ic_stat_helssu.xml).
 * 이름이 없거나 그 이름의 파일이 앱에 없으면 시스템이 동그라미 안에 "i" 가 있는 기본 아이콘을 보여 준다.
 * 파일을 바꾸면 APK 를 다시 빌드해야 반영된다(이 이름은 서버가 보내지만 그림은 앱 안에 있다).
 */
export const NOTIF_SMALL_ICON = "ic_stat_helssu";

/** 작은 아이콘을 칠하는 강조색 — 로고 바탕 초록. res/values/colors.xml 의 notification_accent 와 같다. */
export const NOTIF_ACCENT_COLOR = "#0A6B4E";
