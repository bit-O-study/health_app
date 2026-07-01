import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { JoinConfirm } from "@/features/groups/components/join-confirm";

export const dynamic = "force-dynamic";

/** 실제 요청 호스트로 절대 URL 을 만든다(NEXT_PUBLIC_SITE_URL 미설정 시 localhost 로
 *  깨지는 것 방지 — 카카오 미리보기봇이 이미지·URL 을 가져올 수 있게 반드시 절대경로). */
async function originFromRequest(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

/** 토큰으로 그룹 이름을 미리 읽는다(보안 정의자 RPC — 로그인 불필요). */
async function groupNameByToken(token: string): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("group_name_by_token", {
      token: token.trim(),
    });
    return typeof data === "string" && data.trim() !== "" ? data : null;
  } catch {
    return null;
  }
}

/**
 * OG 메타 — 카카오톡 등에 초대 링크를 붙이면 '클릭 가능한 카드'로 펼쳐진다(이미지+제목+설명).
 * ⚠ 이 응답이 카톡 미리보기 봇에게 그대로 가야 하므로, 페이지에서 비로그인 리다이렉트를
 *   하지 않는다(리다이렉트하면 봇이 /login 을 긁어 카드가 안 뜬다). 로그인은 '확인' 클릭 시.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const [name, origin] = await Promise.all([
    groupNameByToken(token),
    originFromRequest(),
  ]);
  const title = name ? `${name} · 운동 그룹 초대` : "운동 그룹 초대";
  const description = "운동 랭킹대전에 함께 참여해요 💪 눌러서 그룹에 가입하세요.";
  const image = `${origin}/icon-512.png`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${origin}/groups/join/${token}`,
      images: [{ url: image, width: 512, height: 512, alt: title }],
      type: "website",
    },
    // 일부 앱은 트위터 카드 태그로 미리보기를 만든다 — 함께 넣어 호환성↑.
    twitter: {
      card: "summary",
      title,
      description,
      images: [image],
    },
  };
}

export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // 로그인 여부와 무관하게 카드를 그린다(비로그인이면 '확인' 시 로그인으로 보냄).
  const name = await groupNameByToken(token);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-4 py-10">
      {name ? (
        <JoinConfirm token={token} groupName={name} />
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
