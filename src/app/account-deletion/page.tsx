import type { Metadata } from "next";

import { siteConfig } from "@/lib/seo";

// ⚠️ Play 콘솔 등록 전에 실제 문의 이메일로 교체하세요.
const CONTACT_EMAIL = "[문의 이메일]";

export const metadata: Metadata = {
  title: "계정 삭제 안내",
  description: `${siteConfig.name} 계정 및 데이터 삭제 방법 안내`,
  robots: { index: true, follow: true },
};

/**
 * 계정/데이터 삭제 안내 — Google Play '데이터 삭제' 정책상 앱 밖에서 접근 가능한 공개 URL 필요.
 * Play 콘솔의 '앱 콘텐츠 → 데이터 삭제' 에 이 URL(/account-deletion)을 등록.
 * ⚠️ CONTACT_EMAIL 플레이스홀더를 실제 값으로 교체.
 */
export default function AccountDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 text-zinc-800 dark:text-zinc-200">
      <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
        계정 및 데이터 삭제 안내
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        서비스명: {siteConfig.name}
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">
          앱에서 직접 삭제하기
        </h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-7">
          <li>{siteConfig.name} 앱에 로그인합니다.</li>
          <li>설정 → 계정 화면으로 이동합니다.</li>
          <li>
            “회원 탈퇴”를 눌러 안내에 따라 탈퇴를 완료합니다.
          </li>
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">
          이메일로 삭제 요청하기
        </h2>
        <p className="mt-2 text-sm leading-7">
          앱에 접근할 수 없는 경우, 가입한 이메일 주소로 {CONTACT_EMAIL} 에 “계정 삭제 요청”을
          보내주시면 본인 확인 후 처리해 드립니다.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">
          삭제되는 데이터
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-7">
          <li>계정 정보(이메일, 닉네임, 로그인 식별자).</li>
          <li>운동 루틴·기록, 식단 기록, 체성분(인바디) 기록.</li>
          <li>업로드한 이미지(식단·자세·인바디 사진).</li>
          <li>커뮤니티/티칭 게시물 등 이용자가 생성한 콘텐츠.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">
          처리 절차 및 보관 기간
        </h2>
        <p className="mt-2 text-sm leading-7">
          회원 탈퇴 시 계정은 <b>즉시 비활성화</b>되어 더 이상 로그인·이용할 수 없습니다. 개인정보
          및 이용자 콘텐츠의 <b>완전 삭제를 원하시면</b> 위 이메일로 요청해 주시면 본인 확인 후
          영구 삭제 처리해 드립니다. 부정 이용 방지·분쟁 대응 또는 관련 법령상 보관이 필요한
          정보는 해당 목적/기간에 한해 보관될 수 있습니다. 자세한 내용은{" "}
          <a href="/privacy" className="text-emerald-600 underline">
            개인정보처리방침
          </a>
          을 참고하세요.
        </p>
      </section>
    </main>
  );
}