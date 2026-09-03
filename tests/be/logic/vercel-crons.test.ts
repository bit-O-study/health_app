import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type Cron = { path: string; schedule: string };

describe("Vercel cron 등록", () => {
  it("Hobby 제한을 위해 운동 무활동 Cron을 등록하지 않는다", () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as { crons?: Cron[] };

    expect(config.crons).toHaveLength(2);
    expect(config.crons).not.toContainEqual(
      expect.objectContaining({ path: "/api/cron/workout-inactivity" }),
    );
  });
});
