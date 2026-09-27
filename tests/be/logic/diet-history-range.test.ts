import { beforeEach, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({range:vi.fn(),user:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("react",()=>({cache:(fn:unknown)=>fn}));
vi.mock("@/lib/supabase/server",()=>({getCurrentUser:mock.user,createSupabaseServerClient:async()=>({from:()=>{const query={select:()=>query,eq:()=>query,gte:()=>query,lt:()=>query,order:()=>query,range:mock.range};return query;}})}));
import { getRecentFoodLogs } from "@/features/diet/data-access";
const food={meal:"breakfast",name:"음식",kcal:100,protein_g:10,carbs_g:10,fat_g:2,amount:"1인분",category:null,eaten_at:null,for_date:"2026-09-27"};
beforeEach(()=>{vi.resetAllMocks();mock.user.mockResolvedValue({id:"me"});});
it("기간 집계는 1000개를 넘는 기록도 빠뜨리지 않는다",async()=>{
  mock.range.mockResolvedValueOnce({data:Array(500).fill(food)}).mockResolvedValueOnce({data:Array(500).fill(food)}).mockResolvedValueOnce({data:[food]});
  const rows=await getRecentFoodLogs("2026-07-01","2026-09-28",true);
  expect(rows).toHaveLength(1001); expect(rows.reduce((sum,row)=>sum+row.kcal,0)).toBe(100100);
});
it("통계 조회 실패를 기록 없는 기간으로 표시하지 않는다",async()=>{
  mock.range.mockResolvedValue({data:null,error:{message:"unavailable"}});
  await expect(getRecentFoodLogs("2026-09-01","2026-09-28",true)).rejects.toThrow("식단 기록을 불러오지 못했어요");
});
it("빠른 기록 기본 조회는 기존 300개 범위를 유지한다",async()=>{
  mock.range.mockResolvedValue({data:Array(300).fill(food)});
  expect(await getRecentFoodLogs("2026-09-01","2026-09-28")).toHaveLength(300);
  expect(mock.range).toHaveBeenCalledTimes(1);
});
