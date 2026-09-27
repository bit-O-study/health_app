import { beforeEach, afterEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const query = vi.fn(async (_sql: string, params: unknown[] = []) => ({ rows: params }));
  const dedicated = { connect: vi.fn(), end: vi.fn(), query: vi.fn(async (sql: string, params: unknown[] = []) => ({ rows: sql.includes("from auth.users") ? [{ id: "test-user" }] : params })) };
  const pool = { query, on: vi.fn() };
  return { pool, dedicated, Pool: vi.fn(function () { return pool; }), Client: vi.fn(function () { return dedicated; }) };
});


beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("SUPA_DB_URL", "postgres://test:test@localhost/test");
  vi.doMock("pg", () => ({ default: { Pool: db.Pool, Client: db.Client } }));
});
afterEach(() => vi.unstubAllEnvs());

it("shares one pool across repeated calls and preserves each query's parameters/results", async () => {
  const { dbQuery } = await import("../../e2e/helpers/db");
  const results = [await dbQuery("select $1", ["first"]), await dbQuery("select $1", ["second"])];
  expect(results).toEqual([["first"], ["second"]]);
  expect(db.Pool).toHaveBeenCalledTimes(1);
  expect(db.Pool).toHaveBeenCalledWith(expect.objectContaining({ max: 1, allowExitOnIdle: true }));
  expect(db.Client).not.toHaveBeenCalled();
});

it("keeps authenticated transactions on a separate client", async () => {
  const { dbQuery, openAuthenticatedDbClient } = await import("../../e2e/helpers/db");
  await dbQuery("select $1", ["before"]);
  const client = await openAuthenticatedDbClient("test@example.com");
  expect(client).toBe(db.dedicated);
  expect(db.dedicated.query).toHaveBeenCalledWith("set local role authenticated");
  expect(db.pool.query).not.toHaveBeenCalledWith("set local role authenticated");
  expect(await dbQuery("select $1", ["after"])).toEqual(["after"]);
  await client.end();
  expect(db.Pool).toHaveBeenCalledTimes(1);
  expect(db.Client).toHaveBeenCalledTimes(1);
});

it("propagates query failure without retrying writes and allows the next query", async () => {
  const { dbQuery } = await import("../../e2e/helpers/db");
  const failure = new Error("query failed");
  db.pool.query.mockRejectedValueOnce(failure);
  await expect(dbQuery("insert example", ["value"])).rejects.toBe(failure);
  expect(db.pool.query).toHaveBeenCalledTimes(1);
  expect(await dbQuery("select $1", ["next"])).toEqual(["next"]);
});

it("initializes a single pool when first queries arrive together", async () => {
  const { dbQuery } = await import("../../e2e/helpers/db");
  expect(await Promise.all([dbQuery("select $1", [1]), dbQuery("select $1", [2])])).toEqual([[1], [2]]);
  expect(db.Pool).toHaveBeenCalledTimes(1);
});
