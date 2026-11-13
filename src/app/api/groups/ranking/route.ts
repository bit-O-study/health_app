import { NextResponse } from "next/server";
import { loadCompetition } from "@/features/groups/competition-data";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const groupId = new URL(request.url).searchParams.get("g");
  if (groupId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupId)) {
    return NextResponse.json({ error: "그룹을 확인해 주세요." }, { status: 400 });
  }
  try {
    const result = await loadCompetition(groupId);
    return NextResponse.json(result ?? { error: "로그인 또는 그룹 참여가 필요해요." }, { status: result ? 200 : 403, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "점수를 불러오지 못했어요. 다시 시도해 주세요." }, { status: 503 });
  }
}
