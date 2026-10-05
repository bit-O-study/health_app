import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * 앱의 AI 오픈 스위치(`src/features/billing/plans.ts` 의 `AI_OPEN`) — E2E 는 src 를 import 하지 않아 글자로 읽는다.
 * 2026-10-01 사용자 결정으로 지금은 false: AI 흐름을 확인하는 E2E 는 열릴 때까지 건너뛴다.
 */
export const AI_OPEN = /export const AI_OPEN = true;/.test(
  readFileSync(path.join(process.cwd(), "src/features/billing/plans.ts"), "utf8"),
);
