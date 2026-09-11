import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { BrowserContext } from "@playwright/test";

import { freshEmail, TEST_PASSWORD } from "./run-scope";

/** Fresh Auth account and UI-equivalent profile; never shares server state between tests. */
export async function createTestAccount(context: BrowserContext, baseURL: string, lockWeightReps = false) {
  const email = freshEmail();
  const env = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ? process.env
    : { ...parseEnv(readFileSync(resolve(process.cwd(), ".env.local"), "utf8")), ...process.env };
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
  return { email, supabase, user_id };
}

/** Same empty manual fullbody routine produced by the default UI onboarding. */
export async function prepareOnboardedAccount(context: BrowserContext, baseURL: string): Promise<string> {
  const { email, supabase, user_id } = await createTestAccount(context, baseURL);
  const routine = await supabase.from("user_routines").insert({
    user_id, splits: 3, variant_id: "fullbody-3", custom_week: null,
    baseline_routine: { splits: 3, variant_id: "fullbody-3", custom_week: null },
    day_index_migrated: true,
  });
  if (routine.error) throw routine.error;
  return email;
}
