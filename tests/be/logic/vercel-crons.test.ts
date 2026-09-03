import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type Cron = { path: string; schedule: string };

describe("Vercel cron 등록", () => {
  it("운동 무활동 감지를 10분마다 실행한다", () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as { crons?: Cron[] };

    expect(config.crons).toContainEqual({
      path: "/api/cron/workout-inactivity",
      schedule: "*/10 * * * *",
    });
  });
});
