import Link from "next/link";
import { PageHeader } from "@/components/page-header";

// 박스(카드) 없이 구분선 + 제목 굵기로 묶고, 링크는 48px 높이 한 줄 행으로 둔다.
const rowCls = "flex min-h-12 items-center border-t border-line px-1 font-medium text-brand";

export default function HelpPage() {
  const email = process.env.SUPPORT_CONTACT_EMAIL;
  return (
    <div className="app-page">
      <PageHeader title="로그인 도움말" back />
      <main className="app-container">
        <section className="px-1">
          <h1 className="mb-2 text-base font-semibold tracking-tight text-zinc-950 dark:text-white">로그인이 어려우신가요?</h1>
          <p>
            가입할 때 사용한 로그인 방식과 이메일을 확인해 주세요.
            <br />
            이메일 로그인은 로그인 화면에서 비밀번호를 재설정할 수 있어요.
          </p>
        </section>
        <Link className={`${rowCls} mt-3`} href="/login">로그인 화면으로</Link>

        <section className="mt-6 px-1">
          <h2 className="mb-2 text-base font-semibold tracking-tight text-zinc-950 dark:text-white">문제 신고</h2>
          <p>로그인할 수 있다면 고객센터에서 버그·불편 신고와 답변을 확인해 주세요.</p>
        </section>
        <Link className={`${rowCls} mt-3`} href="/support">고객센터 열기</Link>
        {email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
          <a className={rowCls} href={`mailto:${email}`}>이메일 문의: {email}</a>
        )}
      </main>
    </div>
  );
}
