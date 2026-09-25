import Link from "next/link";
import { PageHeader } from "@/components/page-header";
export default function HelpPage(){
 const email=process.env.SUPPORT_CONTACT_EMAIL;
 return <div className="app-page"><PageHeader title="로그인 도움말" back/><main className="app-container space-y-5"><section className="app-card space-y-3 p-5"><h1 className="font-semibold">로그인이 어려우신가요?</h1><p>가입할 때 사용한 로그인 방식과 이메일을 확인해 주세요. 이메일 로그인은 로그인 화면에서 비밀번호를 재설정할 수 있어요.</p><Link className="block underline" href="/login">로그인 화면으로</Link></section><section className="app-card space-y-3 p-5"><h2 className="font-semibold">문제 신고</h2><p>로그인할 수 있다면 고객센터에서 버그·불편 신고와 답변을 확인해 주세요.</p><Link className="block underline" href="/support">고객센터 열기</Link>{email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&<a className="block underline" href={`mailto:${email}`}>이메일 문의: {email}</a>}</section></main></div>;
}
