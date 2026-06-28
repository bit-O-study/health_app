import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { JoinConfirm } from "@/features/groups/components/join-confirm";

export const dynamic = "force-dynamic";
export const metadata = { title: "그룹 초대" };

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

  // 가입 전, 토큰으로 그룹 이름만 미리 가져온다(보안 정의자 RPC).
  const supabase = await createSupabaseServerClient();
  const { data: name } = await supabase.rpc("group_name_by_token", {
    token: token.trim(),
  });

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-4 py-10">
      {name ? (
        <JoinConfirm token={token} groupName={name as string} />
      ) : (
        <div className="text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            유효하지 않거나 만료된 초대 링크예요.
          </p>
          <Link
            href="/groups"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"
          >
            <ChevronLeft size={16} /> 그룹 목록
          </Link>
        </div>
      )}
    </main>
  );
}
