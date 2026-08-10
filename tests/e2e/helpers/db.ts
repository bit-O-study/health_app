import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// E2E 전용 DB 헬퍼. import.meta 미사용(Playwright 로더 호환) — cwd 는 repo 루트.
function loadEnv(): Record<string, string> {
  try {
    const txt = readFileSync(resolve(process.cwd(), ".env.test.local"), "utf8");
    const out: Record<string, string> = {};
    for (const line of txt.split(/\r?\n/)) {
      if (line.trim().startsWith("#")) continue;
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2];
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...loadEnv(), ...process.env };
export const hasDb = Boolean(
  env.SUPA_DB_URL || (env.SUPA_DB_REF && env.SUPA_DB_HOST && env.SUPA_DB_PW),
);

/**
 * 실계정 스모크 테스트용 자격증명 — .env.test.local 의 E2E_REAL_EMAIL/E2E_REAL_PW.
 * (gitignore 되는 파일이라 소스에 비밀번호를 하드코딩하지 않는다.) 없으면 null → 스킵.
 */
export const realAccount =
  env.E2E_REAL_EMAIL && env.E2E_REAL_PW
    ? { email: env.E2E_REAL_EMAIL, pw: env.E2E_REAL_PW }
    : null;

export async function openDbClient(applicationName?: string) {
  const { default: pg } = await import("pg");
  const client = new pg.Client(
    env.SUPA_DB_URL
      ? {
          connectionString: env.SUPA_DB_URL,
          ssl: env.SUPA_DB_SSL === "false" ? false : { rejectUnauthorized: false },
          connectionTimeoutMillis: 10_000,
          application_name: applicationName,
        }
      : {
          host: env.SUPA_DB_HOST,
          port: Number(env.SUPA_DB_PORT ?? 5432),
          user: `postgres.${env.SUPA_DB_REF}`,
          password: env.SUPA_DB_PW,
          database: "postgres",
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 10_000,
          application_name: applicationName,
        },
  );
  await client.connect();
  return client;
}

export async function openAuthenticatedDbClient(
  email: string,
  applicationName?: string,
) {
  const client = await openDbClient(applicationName);
  const user = await client.query<{ id: string }>(
    `select id::text from auth.users where lower(email)=lower($1)`,
    [email],
  );
  const userId = user.rows[0]?.id;
  if (!userId) {
    await client.end();
    throw new Error(`test user not found: ${email}`);
  }
  await client.query("begin");
  await client.query(
    `select set_config('request.jwt.claim.sub', $1, true),
            set_config('request.jwt.claims', $2, true)`,
    [userId, JSON.stringify({ sub: userId, role: "authenticated", email })],
  );
  await client.query("set local role authenticated");
  return client;
}

export async function dbQuery<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = await openDbClient();
  try {
    const res = await client.query(sql, params);
    return res.rows as T[];
  } finally {
    await client.end();
  }
}
