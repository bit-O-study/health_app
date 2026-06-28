import { redirect } from "next/navigation";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "그룹 참여" };

export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getCurrentUser();
  // 비로그인(예: 카카오톡 인앱 브라우저)이면 로그인 후 다시 이 초대 링크로 돌아오게 한다.
  if (!user)
    redirect(`/login?redirect=${encodeURIComponent(`/groups/join/${token}`)}`);

  // 서버 컴포넌트 렌더 중이라 revalidatePath를 쓰는 서버 액션 대신 RPC를 직접 호출한다.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("join_group_by_token", {
    token: token.trim(),
  });

  redirect(!error && data ? `/groups/${data as string}` : "/groups");
}
