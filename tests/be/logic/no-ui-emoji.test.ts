import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

/**
 * 화면 문구·알림 제목에 이모지를 넣지 않는다. 장식이 필요하면 `components/icons/app-icons.tsx` 의
 * 직접 그린 단색 아이콘을 쓴다(색은 글자색을 따른다). 주석 줄은 검사하지 않는다.
 */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2728}\u{2B50}\u{1F64F}]/u;
const FILES = [
  "src/features/workout-timer/rest-timer.tsx",
  "src/features/groups/group-actions.ts",
  "src/features/groups/weekly-mvp-message.ts",
  "src/features/notifications/daily-reminder.ts",
  "src/features/notifications/weekly-summary.ts",
  "src/features/groups/group-mode.ts",
  "src/features/profile/goal.ts",
  "src/features/routine/components/today-goal-card.tsx",
  "src/features/profile/components/body-log-button.tsx",
  "src/features/lite/components/goals-card.tsx",
  "src/features/account/components/withdraw-button.tsx",
  "src/features/community/components/report-button.tsx",
  "src/features/diet/components/water-card.tsx",
  "src/features/routine/components/exercise-finder.tsx",
  "src/features/community/components/teaching-reels.tsx",
  "src/features/health/components/steps-sync.tsx",
  "src/features/groups/components/gym-room.tsx",
  "src/features/groups/components/group-leaderboard.tsx",
  "src/features/groups/streak.ts",
  "src/features/groups/competition.ts",
  "src/features/routine-share/components/routine-share-board.tsx",
];

describe("화면 문구에 이모지를 쓰지 않는다", () => {
  for (const file of FILES) {
    it(file, () => {
      const hits = read(file)
        .split("\n")
        .filter((line) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line))
        .filter((line) => EMOJI.test(line));
      expect(hits).toEqual([]);
    });
  }

  it("직접 그린 아이콘은 색을 정하지 않는다(currentColor 만)", () => {
    const icons = read("src/components/icons/app-icons.tsx");
    expect(icons).toContain('stroke="currentColor"');
    expect(icons).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(icons).not.toMatch(/fill="(?!none)/);
  });
});
