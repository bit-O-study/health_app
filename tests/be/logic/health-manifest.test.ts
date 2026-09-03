import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const manifest = fs.readFileSync(
  path.join(process.cwd(), "android/app/src/main/AndroidManifest.xml"),
  "utf8",
);

describe("Health Connect Android 권한 선언", () => {
  it.each([
    "READ_STEPS",
    "READ_WEIGHT",
    "READ_BODY_FAT",
    "READ_LEAN_BODY_MASS",
    "WRITE_EXERCISE",
    "WRITE_DISTANCE",
    "WRITE_TOTAL_CALORIES_BURNED",
    "READ_HEART_RATE",
    "READ_SLEEP",
  ])("ready 기능의 %s 권한을 Manifest에 선언한다", (permission) => {
    expect(manifest).toContain(`android.permission.health.${permission}`);
  });
});
