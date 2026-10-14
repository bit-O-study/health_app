import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { BrowserContext } from "@playwright/test";

import { freshEmail, TEST_PASSWORD } from "./run-scope";

/**
 * Supabase keys for the test harness, read the way Next.js does: `.env.local`
 * overrides `.env`, and a real process env wins over both.
 *
 * 🔴 `.env.local` alone is not enough — this project keeps
 * NEXT_PUBLIC_SUPABASE_URL/PUBLISHABLE_KEY in `.env` (2026-09-15). Reading only
 * `.env.local` made every account-creating spec die with "supabaseUrl is
 * required" even though `pnpm dev` ran fine.
 */
function supabaseEnv(): Record<string, string | undefined> {
  const fromFile = (name: string) => {
    const path = resolve(process.cwd(), name);
    return existsSync(path)
      ? (parseEnv(readFileSync(path, "utf8")) as Record<string, string | undefined>)
      : {};
  };
  const env = { ...fromFile(".env"), ...fromFile(".env.local"), ...process.env };
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]) {
    if (!env[key]) throw new Error(`E2E: ${key} 가 없다 — .env / .env.local 을 확인하세요.`);
  }
  return env;
}

/** Fresh Auth account and UI-equivalent profile; never shares server state between tests. */
/**
 * @param opts.showCheckin 운동 탭에 들어가면 자동으로 뜨는 '오늘 컨디션' 팝업(2026-10-08 dev 병합)을 그대로 띄울지.
 *   기본은 '오늘 건너뜀' 표시를 남겨 안 띄운다 — 팝업이 뒤 버튼 클릭을 막아 운동 탭을 쓰는 다른 테스트가 전부 멈췄다.
 *   팝업 자체를 시험하는 테스트만 true.
 */
export async function createTestAccount(context: BrowserContext, baseURL: string, lockWeightReps = false, opts: { showCheckin?: boolean } = {}) {
  const email = freshEmail();
  const env = supabaseEnv();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      cookies: {
        getAll: () => context.cookies(baseURL),
        setAll: async (values) => {
          await context.addCookies(values.map(({ name, value, options }) => ({
            name, value, url: baseURL,
            sameSite: "Lax" as const,
            secure: new URL(baseURL).protocol === "https:",
            ...(options.maxAge === 0 ? { expires: 0 } : {}),
          })));
        },
      },
    },
  );
  const testEnvPath = resolve(process.cwd(), ".env.test.local");
  const secretKey = process.env.E2E_SUPABASE_SECRET_KEY ?? (
    existsSync(testEnvPath) ? parseEnv(readFileSync(testEnvPath, "utf8")).E2E_SUPABASE_SECRET_KEY : undefined
  );
  const metadata = { name: "검증유저", nickname: "", phone: "+821012345678" };
  if (secretKey) {
    // The privileged client creates only this run's new Auth account. Never use
    // it for profile/routine writes or install its credentials in the browser.
    const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const created = await admin.auth.admin.createUser({
      email, password: TEST_PASSWORD, email_confirm: true, user_metadata: metadata,
    });
    if (created.error) throw created.error;
  }
  const { data, error } = secretKey
    ? await supabase.auth.signInWithPassword({ email, password: TEST_PASSWORD })
    : await supabase.auth.signUp({
      email, password: TEST_PASSWORD, options: { data: metadata },
    });
  if (error) throw error;
  if (!data.user || !data.session) throw new Error("Test authentication did not return a session");
  const user_id = data.user.id;
  const profile = await supabase.from("profiles").insert({
    user_id, gender: "male", experience: "beginner", name: "검증유저", nickname: "검증유저",
    phone: "+821012345678", height_cm: 175, weight_kg: 75, body_type: "lean", goal: "maintain",
    lock_weight_reps: lockWeightReps,
  });
  if (profile.error) throw profile.error;
  if (!opts.showCheckin) await dismissDailyCheckin(context, user_id);
  return { email, supabase, user_id };
}

/** 오늘(서울)·내일 '컨디션 팝업 건너뜀' — 자정을 넘기는 테스트에서도 다시 안 뜨게. 앱이 쓰는 키 그대로. */
export async function dismissDailyCheckin(context: BrowserContext, userId: string) {
  const day = (offset: number) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(Date.now() + offset * 86_400_000));
  const keys = [day(0), day(1)].map((d) => `helssu.checkin-dismissed.${userId}.${d}`);
  await context.addInitScript((ks: string[]) => {
    try { for (const k of ks) window.localStorage.setItem(k, "1"); } catch { /* 저장소를 못 쓰면 팝업이 뜬다 */ }
  }, keys);
}

/** Same empty manual fullbody routine produced by the default UI onboarding. */
export async function prepareOnboardedAccount(context: BrowserContext, baseURL: string, opts: { showCheckin?: boolean } = {}): Promise<string> {
  const { email, supabase, user_id } = await createTestAccount(context, baseURL, false, opts);
  const routine = await supabase.from("user_routines").insert({
    user_id, splits: 3, variant_id: "fullbody-3", custom_week: null,
    baseline_routine: { splits: 3, variant_id: "fullbody-3", custom_week: null },
    day_index_migrated: true,
  });
  if (routine.error) throw routine.error;
  return email;
}
