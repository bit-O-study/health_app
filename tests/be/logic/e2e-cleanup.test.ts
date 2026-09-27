import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  connect: vi.fn(),
  query: vi.fn(),
  end: vi.fn(),
}));
// Teardown must be tested without connecting to the live Supabase.
vi.mock("pg", () => ({ default: { Client: class {
  connect = db.connect;
  query = db.query;
  end = db.end;
} } }));
vi.mock("node:fs", () => ({ readFileSync: () => { throw new Error("no env file"); } }));

import globalSetup from "../../e2e/global-setup";
import globalTeardown from "../../e2e/global-teardown";
import { freshEmail } from "../../e2e/helpers/auth";

const runA = "a".repeat(32);
const runB = "b".repeat(32);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPA_DB_REF", "test");
  vi.stubEnv("SUPA_DB_HOST", "test.invalid");
  vi.stubEnv("SUPA_DB_PW", "test");
  db.query.mockResolvedValue({ rowCount: 1 });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("E2E account ownership", () => {
  it("replaces inherited run IDs on every invocation", () => {
    vi.stubEnv("E2E_RUN_ID", runA);
    globalSetup();
    const first = process.env.E2E_RUN_ID;
    expect(first).toMatch(/^[a-f0-9]{32}$/);
    expect(first).not.toBe(runA);
    globalSetup();
    expect(process.env.E2E_RUN_ID).not.toBe(first);
  });

  it("gives accounts distinct run namespaces and unique email addresses", () => {
    vi.stubEnv("E2E_RUN_ID", runA);
    const first = freshEmail();
    const second = freshEmail();
    vi.stubEnv("E2E_RUN_ID", runB);
    const other = freshEmail();
    expect(first).toMatch(/^e2e_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_/);
    expect(other).toMatch(/^e2e_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb_/);
    expect(first).not.toBe(second);
    expect(first.split("@")[0].length).toBeLessThanOrEqual(64);
    expect(first.endsWith("@example.com")).toBe(true);
  });

  it.each([undefined, "", "e2e_", "%"])("refuses account creation without a valid run ID: %s", (id) => {
    vi.stubEnv("E2E_RUN_ID", id);
    expect(() => freshEmail()).toThrow();
  });

  it.each([undefined, "", "e2e_", "%"])("does not connect or delete with an invalid run ID: %s", async (id) => {
    vi.stubEnv("E2E_RUN_ID", id);
    await globalTeardown();
    expect(db.connect).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });

  it("restricts both admin and account deletion to a literal run prefix, never SQL LIKE wildcards", async () => {
    vi.stubEnv("E2E_RUN_ID", runA);
    await globalTeardown();
    expect(db.query.mock.calls).toEqual([
      ["delete from public.admins where starts_with(email, $1)", ["e2e_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_"]],
      ["delete from auth.users where starts_with(email, $1)", ["e2e_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_"]],
    ]);
    expect(db.end).toHaveBeenCalledOnce();
  });
});
