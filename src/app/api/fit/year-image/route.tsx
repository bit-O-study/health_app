import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { getCurrentUser } from "@/lib/supabase/server";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { loadYearReview } from "@/features/lite/year-review-data";
import { BRAND_ICON_BG, BRAND_ICON_MINT, HelssuMark } from "@/features/brand/mark";
import { BRAND_NAME, BRAND_TAGLINE } from "@/features/brand/logo";

/**
 * 1년 기록 이미지(1080×1350 PNG) — 라이트 2단계 혜택 4(2026-10-02). 이달 기록 이미지와 같은 틀.
 * 본인 기록만(쿠키 로그인) · 라이트만 · 캐시하지 않는다.
 */
export const dynamic = "force-dynamic";

const W = 1080;
const H = 1350;
const LEVEL = ["#eef3f0", "#c9eadb", "#8fd6b6", "#3fb488", "#087f5b"] as const;
const name = (id: string) => getCatalogExercise(id)?.name ?? id;

export async function GET() {
  if (!(await getCurrentUser())) return new Response("로그인이 필요해요", { status: 401 });
  const [r, font] = await Promise.all([
    loadYearReview(),
    readFile(join(process.cwd(), "src/assets/fonts/Pretendard-Bold.otf")),
  ]);
  if (!r) return new Response("로그인이 필요해요", { status: 401 });
  if (!r.full) return new Response("라이트에서 만들 수 있어요", { status: 403 });

  const cell = 14;
  const gap = 4;
  const stat = (label: string, value: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 300 }}>
      <div style={{ fontSize: 56, color: BRAND_ICON_BG }}>{value}</div>
      <div style={{ fontSize: 26, color: "#5b6a63", marginTop: 4 }}>{label}</div>
    </div>
  );
  const line = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 32, color: "#14201a", marginTop: 18 }}>
      <div style={{ display: "flex", color: "#5b6a63" }}>{label}</div>
      <div style={{ display: "flex" }}>{value}</div>
    </div>
  );

  const res = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: "#ffffff", padding: 64, fontFamily: "Pretendard" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", width: 84, height: 84, borderRadius: 22, background: BRAND_ICON_BG, overflow: "hidden" }}>
            {HelssuMark({ size: 84 })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 22 }}>
            <div style={{ fontSize: 44, color: "#14201a" }}>{BRAND_NAME}</div>
            <div style={{ fontSize: 24, color: "#66746d" }}>{BRAND_TAGLINE}</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 44, color: "#14201a" }}>1년 돌아보기</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 56 }}>
          {stat("운동한 날", `${r.days}일`)}
          {stat("총 볼륨", `${Math.round(r.volumeKg / 1000).toLocaleString("ko-KR")}톤`)}
          {stat("가장 긴 연속", `${r.longestWeekStreak}주`)}
        </div>

        <div style={{ display: "flex", marginTop: 56, justifyContent: "center" }}>
          {r.weeks.map((col) => (
            <div key={col[0].date} style={{ display: "flex", flexDirection: "column", marginRight: gap }}>
              {col.map((c) => (
                <div
                  key={c.date}
                  style={{ width: cell, height: cell, marginBottom: gap, borderRadius: 3, background: c.future ? "#ffffff" : LEVEL[c.level] }}
                />
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
          {line("가장 많이 한 운동", r.topExercise ? `${name(r.topExercise.exerciseId)} ${r.topExercise.days}일` : "—")}
          {line("가장 크게 오른 신기록", r.bestPr ? `${name(r.bestPr.exerciseId)} +${r.bestPr.gainKg}kg` : "—")}
        </div>

        <div style={{ display: "flex", marginTop: "auto", fontSize: 26, color: "#66746d" }}>
          {`${r.from.replaceAll("-", ".")} ~ ${r.to.replaceAll("-", ".")}`}
        </div>
        <div style={{ display: "flex", height: 8, marginTop: 28, borderRadius: 4, background: BRAND_ICON_MINT }} />
      </div>
    ),
    { width: W, height: H, fonts: [{ name: "Pretendard", data: font, weight: 700, style: "normal" }] },
  );
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Content-Disposition", `inline; filename="helssu-year.png"`);
  return res;
}
