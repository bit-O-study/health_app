# Tests

Managed test suite for the app. Two layers:

| Layer | Runner | Location | What it covers |
|-------|--------|----------|----------------|
| **BE** | Vitest | `tests/be/` | Pure-logic unit tests + a live-DB **schema-sync guard** |
| **FE** | Playwright | `tests/e2e/` | Full user journeys against the running app |

## Quick start

```bash
# BE (fast, no app needed)
pnpm test                 # run all vitest (logic + schema-sync)
pnpm test:watch           # watch mode
pnpm test:schema          # only the schema drift guard

# FE (needs the dev server running)
pnpm dev                  # in one terminal
pnpm test:e2e             # in another
pnpm test:e2e:ui          # Playwright UI mode
```

## Secrets — `.env.test.local` (gitignored)

The schema-sync guard and the E2E cleanup connect to the live Supabase **DB**
(not via the app) for read-only introspection and test-account deletion. Put the
DB connection info in `.env.test.local` at the repo root:

```
SUPA_DB_REF=<project-ref>          # from NEXT_PUBLIC_SUPABASE_URL
SUPA_DB_HOST=aws-1-ap-southeast-1.pooler.supabase.com
SUPA_DB_PORT=5432
SUPA_DB_PW=<database password>

# (선택) 실계정 로그인 스모크 테스트(real-account-login.spec.ts)용 — 없으면 스킵
E2E_REAL_EMAIL=<실계정 이메일>
E2E_REAL_PW=<실계정 비밀번호>
```

Without it, the schema-sync test **skips** and E2E cleanup is a **no-op** (tests
still run; throwaway accounts just aren't deleted). `real-account-login.spec.ts`
는 `E2E_REAL_*` 가 없으면 스킵된다(소스에 비밀번호를 두지 않기 위함).

## BE: schema-sync guard — why it exists

Every production "빵꾸" we hit (7일 루틴 `splits` 제약, 피라미드 `set_details` 컬럼)
had the **same** root cause: a migration written into `supabase/schema.sql` but
never applied to the **live** DB. `tests/be/schema-sync.test.ts` parses
`schema.sql` and asserts the live DB has every declared table, column, and CHECK
constraint. **If it fails, a migration is pending** — apply `schema.sql` (or the
missing DDL) to the live DB via the Supabase SQL editor or the pooler.

## FE: E2E

- `helpers/auth.ts` — `signUpAndOnboard(page)` creates a throwaway account
  (email prefix `e2e_`) and finishes onboarding; `seedRecommendedExercises(page)`
  populates the plan via the real `/plan` action.
- Specs:
  - `smoke.spec.ts` — every major route renders error-free after signup.
  - `routine-and-plan.spec.ts` — 7일 루틴 저장(splits=7) + 세트별 다른 kg(피라미드) 영속성.
  - `workout-reorder.spec.ts` — 순서 변경 후 운동 시작 시 가이드가 바뀐 순서를 따른다.
  - `score-calendar.spec.ts` — 운동 완료 → 점수/캘린더 반영.
- `global-teardown.ts` deletes every `e2e_*` (and legacy `full_/vf_/verify_*`)
  account after the run; app tables cascade from `auth.users`, so their data
  goes too.

### Adding a journey

1. New `*.spec.ts` under `tests/e2e/`.
2. Start with `await signUpAndOnboard(page)` (+ `seedRecommendedExercises` if you
   need a populated workout).
3. Drive the real UI and assert on what the user sees. Keep accounts throwaway so
   teardown cleans them.
