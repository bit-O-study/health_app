import Link from "next/link";
import { Compass, House } from "lucide-react";

import { BackLink } from "@/components/back-link";

/**
 * 404 화면.
 *
 * 이게 없으면 Next 기본 화면("This page could not be found")이 뜬다 — 한국어 앱을
 * 쓰다가 갑자기 영어 흰 화면을 만나면 사용자는 '없는 주소'가 아니라 **앱이 고장 났다**고
 * 읽는다. 이 앱은 리모트 URL 을 WebView 로 띄우는 구조라, 옛 배포의 링크·오래된 알림·
 * 공유 링크로 사라진 주소에 들어오는 일이 실제로 생긴다.
 *
 * 나가는 길을 둘 준다 — **뒤로**(어디서 왔든 그 화면)와 **홈**(`/` 가 로그인 여부에 따라
 * /home·/login 으로 보낸다). 막다른 길로 두지 않는다.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        <Compass size={32} aria-hidden="true" />
      </span>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          페이지를 찾을 수 없어요
        </h1>
        <p className="max-w-sm text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          주소가 바뀌었거나 사라진 화면이에요. 앱에 문제가 생긴 건 아니니
          아래로 돌아가 주세요.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <BackLink className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:border-zinc-600 dark:text-zinc-200">
          뒤로
        </BackLink>
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <House size={16} aria-hidden="true" />
          홈으로
        </Link>
      </div>
    </main>
  );
}
