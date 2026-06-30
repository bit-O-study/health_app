import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor 설정 — 네이티브 앱(안드로이드)이 '배포된 웹앱'을 그대로 WebView 로 로드한다
 * (remote URL 방식). 같은 출처라 쿠키·로그인·서버액션·API 가 웹과 100% 동일하게 동작.
 *
 * 서버 URL 은 CAP_SERVER_URL 로 덮어쓸 수 있다(스테이징/로컬 디바이스 테스트용).
 * 로컬 디바이스에서 dev 서버를 보려면 같은 와이파이의 PC IP 로:
 *   CAP_SERVER_URL=http://192.168.x.x:3000  (이때만 server.cleartext=true 로 임시 변경)
 */
const SERVER_URL =
  process.env.CAP_SERVER_URL || "https://health-app-five-iota.vercel.app";

const config: CapacitorConfig = {
  appId: "app.helssu.twa",
  appName: "헬쑤",
  // remote URL 방식이라 실제로 안 쓰이지만 Capacitor 가 webDir 를 요구한다(오프라인 폴백 셸).
  webDir: "native-shell",
  server: {
    url: SERVER_URL,
    androidScheme: "https",
    // 운영 URL 은 https 라 cleartext 불필요. 로컬 IP(http) 테스트 시에만 true 로.
    cleartext: false,
  },
};

export default config;
