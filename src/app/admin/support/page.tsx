import { redirect } from "next/navigation";
import { supportConsoleUrl } from "@/features/support/model";
// 문의 관리는 통합 관리자 콘솔로 이전 — 옛 링크(이미 받은 카카오 알림 등)는 콘솔로 보낸다.
export default function Page() { redirect(supportConsoleUrl()); }
