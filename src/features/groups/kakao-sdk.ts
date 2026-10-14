/**
 * 카카오 JS SDK 로드 + init — 카카오톡 공유(그룹 초대 · 트레이너 초대)가 같이 쓴다.
 * 키(NEXT_PUBLIC_KAKAO_JS_KEY)가 없거나 SDK 를 못 받으면 null.
 */
export type KakaoLike = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share?: { sendDefault: (opts: unknown) => void };
};

export async function loadKakao(): Promise<KakaoLike | null> {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key || typeof window === "undefined") return null;
  const w = window as unknown as { Kakao?: KakaoLike };
  if (!w.Kakao) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("sdk load fail"));
      document.head.appendChild(s);
    }).catch(() => {});
  }
  const Kakao = w.Kakao;
  if (!Kakao) return null;
  if (!Kakao.isInitialized()) Kakao.init(key);
  return Kakao;
}
