import { redirect } from "next/navigation";
import { supportConsoleUrl } from "@/features/support/model";
// 문의 관리는 통합 관리자 콘솔로 이전 — 옛 상세 링크도 같은 문의의 콘솔 화면으로 보낸다.
export default async function Page({params}:{params:Promise<{id:string}>}) { redirect(supportConsoleUrl((await params).id)); }
