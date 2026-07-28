import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 정적 파일/이미지/모델/폰트 등을 제외한 모든 경로에서 세션을 갱신합니다.
     * ⚠ public/ 의 정적 에셋(.glb 3D 모델, 폰트, 오디오 등)을 빠뜨리면, 관리자
     *   세션에서 그 에셋 요청이 "관리자는 /admin 으로" 규칙에 걸려 /admin 으로
     *   307 리다이렉트돼 버린다(런닝모드 3D 모델이 안 뜨던 원인). 정적 확장자는
     *   여기서 모두 제외해 미들웨어가 손대지 않게 한다.
     */
    "/((?!_next/static|_next/image|_vercel|sw\\.js|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|gltf|bin|wasm|mp4|webm|ogg|mp3|wav|woff|woff2|ttf|otf|ico|json|txt|xml)$).*)",
  ],
};
