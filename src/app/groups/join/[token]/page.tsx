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
  if (!user) redirect(`/login?next=${encodeURIComponent(`/groups/join/${token}`)}`);

  // 서버 컴포넌트 렌더 중이라 revalidatePath를 쓰는 서버 액션 대신 RPC를 직접 호출한다.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("join_group_by_token", {
    token: token.trim(),
  });

  redirect(!error && data ? `/groups/${data as string}` : "/groups");
}
