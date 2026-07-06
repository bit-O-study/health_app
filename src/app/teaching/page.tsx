import { redirect } from "next/navigation";

// 운동 티칭은 커뮤니티(전체/그룹)에 통합됐다. 옛 링크는 커뮤니티로 보낸다.
export const dynamic = "force-dynamic";

export default function TeachingPage() {
  redirect("/community");
}
