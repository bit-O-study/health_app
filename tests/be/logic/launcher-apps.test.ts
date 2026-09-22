import { describe, expect, it } from "vitest";
import { launcherApps } from "@/features/launcher/apps";
import { calendarWeek } from "@/features/launcher/calendar-range";
import { forBoard } from "@/features/community/feed";

describe("런처 탐색", () => {
  it("코치 사용 권한 없으면 런처에 노출하지 않음", () => {
    expect(launcherApps(false).some(app => app.id === "coach")).toBe(false);
    expect(launcherApps(true).some(app => app.id === "coach")).toBe(true);
  });
});
describe("주간 캘린더", () => {
  it("일요일은 같은 주에 포함", () => expect(calendarWeek("2026-09-20", "2026-09-20")).toMatchObject({from:"2026-09-14",to:"2026-09-20"}));
  it("연도를 넘는 7일", () => {
    const week = calendarWeek("2027-01-01", "2026-09-20");
    expect(week.dates).toHaveLength(7);
    expect(week).toMatchObject({from:"2026-12-28",to:"2027-01-03",previous:"2026-12-21",next:"2027-01-04"});
  });
  it("윤일 포함", () => expect(calendarWeek("2028-02-29", "2026-09-20").dates).toContain("2028-02-29"));
  it.each(["bad","2026-02-29","2026-13-01"])("잘못된 날짜는 오늘로 %s", date => expect(calendarWeek(date,"2026-09-20").from).toBe("2026-09-14"));
});
describe("인기 피드", () => {
  it("허용된 입력 게시물만 좋아요순, 동점은 최신순, 원본은 보존", () => {
    const base = {kind:"photo" as const,visibility:"public" as const,groupId:null,exerciseTag:null,isMine:false};
    const posts = [{...base,id:"a",likeCount:2,createdAt:"2026-09-20"}, {...base,id:"b",likeCount:8,createdAt:"2026-09-18"}, {...base,id:"c",likeCount:8,createdAt:"2026-09-19"}];
    expect(forBoard(posts,"popular").map(post => post.id)).toEqual(["c","b","a"]);
    expect(posts.map(post => post.id)).toEqual(["a","b","c"]);
    expect(forBoard([],"popular")).toEqual([]);
  });
});
