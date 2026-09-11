import { randomBytes } from "node:crypto";

/** Missing/malformed ownership must never fall back to deleting all test users. */
export function runEmailPrefix(): string | null {
  const id = process.env.E2E_RUN_ID;
  return id && /^[a-f0-9]{32}$/.test(id) ? `e2e_${id}_` : null;
}

/** Unique throwaway email owned by this Playwright invocation. */
export function freshEmail(): string {
  const prefix = runEmailPrefix();
  if (!prefix) throw new Error("Missing/invalid E2E_RUN_ID — run Playwright global setup first");
  // 61-character local part stays within the email limit of 64.
  return `${prefix}${randomBytes(12).toString("hex")}@example.com`;
}

export const TEST_PASSWORD = "test123456";
