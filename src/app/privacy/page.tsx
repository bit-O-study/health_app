import type { Metadata } from "next";

import { siteConfig } from "@/lib/seo";

// ⚠️ 사용자(운영자)가 채워야 하는 값 — Play 콘솔 등록 전에 실제 정보로 교체하세요.
const OPERATOR = "[회사/운영자명]";
const CONTACT_EMAIL = "[문의 이메일]";
const EFFECTIVE_DATE = "2026-07-13";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: `${siteConfig.name} 개인정보처리방침`,
  robots: { index: true, follow: true },
};

/**
 * 개인정보처리방침 — Google Play(특히 Health Connect 건강데이터 사용) 제출에 필수.
 * 로그인 없이 접근 가능한 공개 URL(/privacy). Play 콘솔 '개인정보처리방침 URL' 에 등록.
 * ⚠️ 상단 OPERATOR/CONTACT_EMAIL 플레이스홀더를 실제 값으로 반드시 교체.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 text-zinc-800 dark:text-zinc-200">
      <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
        개인정보처리방침
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        시행일: {EFFECTIVE_DATE} · 서비스명: {siteConfig.name}
      </p>

      <p className="mt-6 leading-7">
        {OPERATOR}(이하 “운영자”)은(는) 「개인정보 보호법」 등 관련 법령을 준수하며,
        {siteConfig.name}(이하 “서비스”) 이용자의 개인정보를 보호하기 위해 다음과 같은
        처리방침을 둡니다.
      </p>

      <Section title="1. 수집하는 개인정보 항목">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>계정 정보</b>: 이메일 주소, 닉네임, (카카오 로그인 시) 카카오 계정 식별자.
          </li>
          <li>
            <b>건강·운동 데이터</b>: 걸음 수·체중·체성분(Android Health Connect 를 통해
            사용자가 허용한 경우에만 읽음), 운동 기록·루틴, 식단 기록, 체성분(인바디)
            기록 및 사용자가 허용한 경우 Health Connect 로 내보내는 운동 세션.
          </li>
          <li>
            <b>이미지</b>: 이용자가 촬영/업로드한 식단 사진, 운동 자세 영상, 인바디 결과지
            사진(AI 분석 목적).
          </li>
          <li>
            <b>서비스 이용 정보</b>: 접속 로그, 기기·브라우저 정보, 오류 로그 등 서비스
            운영 과정에서 자동 생성되는 정보.
          </li>
        </ul>
      </Section>

      <Section title="2. 개인정보의 이용 목적">
        <ul className="list-disc space-y-1 pl-5">
          <li>회원 식별 및 로그인, 서비스 제공(운동 루틴 추천·기록·통계).</li>
          <li>걸음 수·운동·식단·체성분 데이터 기반의 개인 맞춤 기록/분석 제공.</li>
          <li>업로드한 이미지의 AI 분석(식단 인식, 자세 코칭, 인바디 인식).</li>
          <li>서비스 개선, 오류 대응, 문의 응대, 부정 이용 방지.</li>
        </ul>
      </Section>

      <Section title="3. Health Connect(건강 데이터) 처리">
        <p className="leading-7">
          서비스는 Android Health Connect 로부터 <b>걸음 수·체중·체성분</b>을 읽고,
          이용자가 별도로 허용하면 완료한 <b>운동 세션</b>을 Health Connect 로 내보냅니다.
          각 데이터는 이용자가 기기에서 해당 항목의 권한을 명시적으로 허용한 경우에만
          접근하며, 다음을 준수합니다.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>건강 데이터는 오직 이용자에게 서비스를 제공하기 위한 목적으로만 사용합니다.</li>
          <li>건강 데이터를 광고·마케팅 목적으로 사용하거나 제3자에게 판매하지 않습니다.</li>
          <li>
            이용자는 언제든 기기의 Health Connect 설정에서 권한을 철회할 수 있으며, 철회 시
            해당 건강 데이터를 더 이상 읽거나 쓰지 않습니다.
          </li>
        </ul>
      </Section>

      <Section title="4. 제3자 처리 위탁 및 제공">
        <p className="leading-7">
          서비스는 운영을 위해 아래 사업자에 개인정보 처리를 위탁할 수 있으며, 위탁 범위 내에서만
          처리됩니다.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <b>Supabase</b> — 데이터베이스·인증·파일 저장(회원/기록/이미지 저장).
          </li>
          <li>
            <b>Vercel</b> — 애플리케이션 호스팅 및 로그.
          </li>
          <li>
            <b>Kakao</b> — 카카오 로그인 및 공유 기능(이용 시).
          </li>
          <li>
            <b>NVIDIA / Anthropic</b> — 업로드 이미지의 AI 분석(식단·자세·인바디). 분석에
            필요한 이미지가 해당 AI 처리 서버로 전송될 수 있습니다.
          </li>
        </ul>
      </Section>

      <Section title="5. 보유 및 이용 기간, 파기">
        <p className="leading-7">
          회원 탈퇴 시 계정은 즉시 비활성화됩니다. 이용자가 개인정보의 완전 삭제를 요청하면 본인
          확인 후 지체 없이 복구 불가능한 방식으로 파기합니다. 다만 부정 이용 방지·분쟁 대응 또는
          관련 법령상 보관이 필요한 정보는 해당 목적/기간에 한해 보관될 수 있습니다. 삭제 요청
          방법은{" "}
          <a href="/account-deletion" className="text-emerald-600 underline">
            계정 삭제 안내
          </a>
          를 참고하세요.
        </p>
      </Section>

      <Section title="6. 이용자의 권리와 계정 삭제">
        <p className="leading-7">
          이용자는 언제든 자신의 개인정보를 조회·수정할 수 있고, 회원 탈퇴(계정 삭제)를 요청할 수
          있습니다.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <b>앱 내 삭제</b>: 설정 → 계정 → “회원 탈퇴”에서 직접 탈퇴할 수 있습니다.
          </li>
          <li>
            <b>웹/이메일 요청</b>: 계정 삭제 안내는{" "}
            <a href="/account-deletion" className="text-emerald-600 underline">
              계정 삭제 페이지
            </a>
            를 참고하거나 {CONTACT_EMAIL} 로 요청할 수 있습니다.
          </li>
        </ul>
      </Section>

      <Section title="7. 개인정보 보호책임자 및 문의">
        <p className="leading-7">
          개인정보 처리에 관한 문의·불만은 아래로 연락해 주세요.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>운영자: {OPERATOR}</li>
          <li>문의: {CONTACT_EMAIL}</li>
        </ul>
      </Section>

      <Section title="8. 고지의 의무">
        <p className="leading-7">
          본 방침은 관련 법령·서비스 변경에 따라 개정될 수 있으며, 개정 시 서비스 내 공지 또는 본
          페이지를 통해 사전 고지합니다.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">
        {title}
      </h2>
      <div className="mt-2 text-sm leading-7">{children}</div>
    </section>
  );
}
