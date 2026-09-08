import { searchFoodsAction } from "@/features/diet/food-search-actions";
import { searchCustomFoodsAction } from "@/features/diet/custom-foods";
import { searchFoodDbAction } from "@/features/diet/food-db-actions";
import { getCurrentUser } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const source = params.get("source");
  const q = (params.get("q") ?? "").trim().slice(0, 60);
  const headers = { "Cache-Control": "private, no-store" };
  if (source !== "local" && source !== "custom" && source !== "db") {
    return Response.json({ error: "올바르지 않은 검색 출처" }, { status: 400, headers });
  }
  if (!(await getCurrentUser())) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401, headers });
  }
  const rows = source === "local" ? await searchFoodsAction(q)
    : source === "custom" ? await searchCustomFoodsAction(q)
    : await searchFoodDbAction(q);
  return Response.json(rows, { headers });
}
