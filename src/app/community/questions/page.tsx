import CommunityPage from "../page";
export const dynamic = "force-dynamic";
/** 질문 글(커뮤니티 3단계). ?open=1 이면 답변 기다리는 질문만. */
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; open?: string }> }) { const { open, ...rest } = await searchParams; return CommunityPage({ searchParams: Promise.resolve({ ...rest, view: open === "1" ? "question_open" : "question" }) }); }
