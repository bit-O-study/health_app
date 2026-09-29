import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { getCurrentUser } from "@/lib/supabase/server";
import { getCurrentStreak, getMonthlyCalendar } from "@/features/calendar/data-access";
import { activityLevel, monthStats } from "@/features/calendar/month-stats";
import { BRAND_ICON_BG, BRAND_ICON_MINT, JimkkunMark } from "@/features/brand/mark";
import { BRAND_NAME, BRAND_TAGLINE } from "@/features/brand/logo";
import { seoulYmd } from "@/features/routine/data";

/**
 * 이달 기록 이미지(1080×1350 PNG) — 캘린더 3단계 공유용.
 *
 * 본인 기록만 그린다(쿠키 로그인 필수). 칸 색 진하기는 캘린더와 같은 `activityLevel`.
 * 한글은 기본 글꼴에 없어서 Pretendard Bold 를 읽어 넣는다(next.config 의
 * outputFileTracingIncludes 로 배포 번들에 포함).
 */
export const dynamic = "force-dynamic";

const W = 1080;
const H = 1350;
const pad = (n: number) => String(n).padStart(2, "0");
const LEVEL = ["#eef3f0", "#c9eadb", "#8fd6b6", "#3fb488"] as const;
const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("로그인이 필요해요", { status: 401 });

  const today = seoulYmd();
  const raw = new URL(req.url).searchParams.get("m") ?? today.slice(0, 7);
  const m = /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : today.slice(0, 7);
  const [year, month1] = m.split("-").map(Number);
  const dim = new Date(Date.UTC(year, month1, 0)).getUTCDate();
  const from = `${m}-01`;
  const to = `${m}-${pad(dim)}`;

  const [{ byDate }, streak, font] = await Promise.all([
    getMonthlyCalendar(from, to),
    getCurrentStreak(today),
    readFile(join(process.cwd(), "src/assets/fonts/Pretendard-Bold.otf")),
  ]);
  const stats = monthStats(byDate.entries());
  const max = Math.max(0, ...[...byDate.values()].map((v) => v.exerciseKcal));

  const lead = (new Date(Date.UTC(year, month1 - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
  const cell = 118;

  const stat = (label: string, value: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 220 }}>
      <div style={{ fontSize: 60, color: BRAND_ICON_BG }}>{value}</div>
      <div style={{ fontSize: 28, color: "#5b6a63", marginTop: 4 }}>{label}</div>
    </div>
  );

  const res = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: "#ffffff", padding: 64, fontFamily: "Pretendard" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", width: 84, height: 84, borderRadius: 22, background: BRAND_ICON_BG, overflow: "hidden" }}>
            {JimkkunMark({ size: 84 })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 22 }}>
            <div style={{ fontSize: 44, color: "#14201a" }}>{BRAND_NAME}</div>
            <div style={{ fontSize: 24, color: "#66746d" }}>{BRAND_TAGLINE}</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 44, color: "#14201a" }}>{`${year}년 ${month1}월`}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 60 }}>
          {stat("운동한 날", `${stats.activeDays}일`)}
          {stat("가장 긴 연속", `${stats.longestStreak}일`)}
          {stat("근력운동", `${stats.weightDays}일`)}
          {stat("런닝", `${stats.runKm}km`)}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 56, alignItems: "center" }}>
          <div style={{ display: "flex" }}>
            {WEEKDAYS.map((w, i) => (
              <div key={w} style={{ width: cell + 10, display: "flex", justifyContent: "center", fontSize: 26, color: i === 6 ? "#b4321f" : "#66746d" }}>{w}</div>
            ))}
          </div>
          {rows.map((row, r) => (
            <div key={r} style={{ display: "flex", marginTop: 10 }}>
              {row.map((d, c) => {
                if (d === null) return <div key={c} style={{ width: cell, height: cell, margin: "0 5px" }} />;
                const s = byDate.get(`${m}-${pad(d)}`);
                const lv = activityLevel(s?.exerciseKcal ?? 0, max);
                return (
                  <div key={c} style={{ width: cell, height: cell, margin: "0 5px", borderRadius: 20, background: LEVEL[lv], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 34, color: lv >= 3 ? "#ffffff" : "#14201a" }}>{String(d)}</div>
                    {s && s.runM > 0 ? (
                      <div style={{ fontSize: 20, color: lv >= 3 ? "#ffffff" : "#0a6bd6" }}>{`${(s.runM / 1000).toFixed(1)}km`}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: "auto", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 30, color: BRAND_ICON_BG }}>{streak > 0 ? `지금 ${streak}일 연속 운동 중` : " "}</div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 22, color: "#66746d" }}>
            <div style={{ display: "flex", width: 22, height: 22, borderRadius: 6, background: LEVEL[1], marginRight: 6 }} />
            <div style={{ display: "flex", width: 22, height: 22, borderRadius: 6, background: LEVEL[2], marginRight: 6 }} />
            <div style={{ display: "flex", width: 22, height: 22, borderRadius: 6, background: LEVEL[3], marginRight: 10 }} />
            진할수록 운동 많이
          </div>
        </div>
        <div style={{ display: "flex", height: 8, marginTop: 28, borderRadius: 4, background: BRAND_ICON_MINT }} />
      </div>
    ),
    { width: W, height: H, fonts: [{ name: "Pretendard", data: font, weight: 700, style: "normal" }] },
  );
  // 본인 기록 — 공유 캐시에 남지 않게.
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Content-Disposition", `inline; filename="jimkkun-${m}.png"`);
  return res;
}
