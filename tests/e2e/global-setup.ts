import { randomUUID } from "node:crypto";

export default function globalSetup() {
  // Always replace inherited IDs: separate invocations/shards must not share ownership.
  // Playwright passes setup environment changes to every worker and global teardown.
  process.env.E2E_RUN_ID = randomUUID().replaceAll("-", "");
}
