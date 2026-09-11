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
pnpm test:e2e             # in another (1 worker)
pnpm test:e2e:parallel    # 4 workers; files run concurrently, tests within each file stay ordered
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

- `helpers/auth.ts` — `createOnboardedAccount(page)` creates an independent account
  without navigation; use it when the test opens its own first page or seeds a workout.
  `signUpAndOnboard(page)` creates an independent account and
  UI-equivalent profile/empty default routine through Supabase Auth and authenticated
  data APIs, installs SDK session cookies, then opens `/routine`.
  `seedRecommendedExercises(page)` prepares recommended data directly with DB credentials,
  then opens `/routine`; without DB credentials it retains the UI fallback.
  `seedRecommendedExercisesViaUI(page)` covers the actual `/plan` recommendation action.
- `signUpAndOnboardViaUI(page)` keeps the actual signup/onboarding journey for the
  broad signup smoke and UI/API fixture parity test. Inline signup and onboarding
  scenarios also retain their UI steps.
- Specs:
  - `smoke.spec.ts` — every major route renders error-free after signup.
  - `routine-and-plan.spec.ts` — 7일 루틴 저장(splits=7) + 세트별 다른 kg(피라미드) 영속성.
  - `workout-reorder.spec.ts` — 순서 변경 후 운동 시작 시 가이드가 바뀐 순서를 따른다.
  - `score-calendar.spec.ts` — 운동 완료 → 점수/캘린더 반영.
- `global-setup.ts` generates a fresh `E2E_RUN_ID` per invocation (including each
  shard) and passes it to all workers. Any inherited ID is replaced.
- `global-teardown.ts` deletes only accounts with that run's literal email prefix,
  plus their admin entries; app data cascades from `auth.users`. Other runs and
  legacy `e2e_/full_/vf_/verify_` accounts are left alone. Missing/invalid run IDs
  skip cleanup; `freshEmail()` refuses account creation without setup.

### Parallel execution status

`pnpm test:e2e:parallel -- <spec paths>` runs files on four workers; each file keeps
its test order. The default command remains single-worker. On 2026-09-11, the same
16-test sample passed in 118.085 seconds with one worker and 64.807 seconds with
four workers on the warmed local server. Public signup hit the shared Auth rate
limit during the first full run. With admin account preparation configured, the
full 231-test run completed in 21.638 minutes (214 passed, 14 failed, 3 skipped),
compared with the earlier single-worker 44.553 minutes (218 passed, 10 failed,
3 skipped). No Auth rate-limit errors occurred; all 210 run accounts were cleaned
up. This is a 51.4% elapsed-time reduction, but includes additional failures and
is not evidence that four-worker execution is stable. Keep the default single
worker while investigating concurrency-sensitive failures. Five additional failures
(append order, workout memo, GPU draw calls, running-session storage and score
calendar) all passed a subsequent single-worker check in 117.515 seconds; this
comparison does not establish a root cause or make the full parallel run pass.

### Admin account preparation

Set `E2E_SUPABASE_SECRET_KEY` in the gitignored `.env.test.local` or the test
process environment to create fixture accounts through the Supabase Admin API.
Only Auth account creation uses that key; login, profile/routine writes and browser
session cookies still use the public client and the authenticated test user.
Without a key, the existing public signup preparation remains available. An admin
API error fails immediately instead of falling back to signup or retrying.
Actual UI signup/onboarding tests are unchanged. Never use a `NEXT_PUBLIC_` variable
for this key or commit it. Live admin preparation, UI parity, authenticated writes
and account lookup passed a 13-test, four-worker check on 2026-09-11.

### Direct preparation

`helpers/account-fixture.ts` provides independent accounts with the same profile and
empty manual `fullbody-3` routine as UI onboarding. `account-fixture.spec.ts` compares
those persisted defaults against an actual UI-created account to catch drift.
Public Supabase settings come from the process environment or `.env.local`; existing
DB credentials remain necessary for run-scoped cleanup.

`sets-edit-reflects-in-workout.spec.ts` additionally uses `helpers/workout-fixture.ts`
to seed only its 4-set squat. Its UI assertions remain unchanged.

`helpers/recommended-fixture.ts` reuses the recommendation/prescription functions and
existing write RPC in an authenticated transaction scoped to the current run account.
It preserves matching exercise IDs and prepares warmup/cooldown together.
`recommended-fixture.spec.ts` compares the persisted result with actual UI registration
for default and custom side-muscle routines. Recommendation-specific specs keep the UI helper.

### DB query connections

`helpers/db.ts` reuses one connection per worker for ordinary `dbQuery` calls.
Idle connections expire after 30 seconds and do not keep the worker alive.
Use `openDbClient` / `openAuthenticatedDbClient` for transactions, locks, or session
settings: those clients remain independent and must be closed by the caller.
Query errors propagate without retrying writes.

### Adding a journey

1. New `*.spec.ts` under `tests/e2e/`.
2. Start with `await signUpAndOnboard(page)` (+ `seedRecommendedExercises` if you
   need a populated workout).
3. Drive the real UI and assert on what the user sees. Keep accounts throwaway so
   teardown cleans them.

### 소셜 로그인 설정 회귀

- `corepack pnpm test:auth`: 라이브 공급자·운영/로컬/native 콜백 검사. 기본 단위 스위트와 별도로 CI에서 실행한다.
- 네트워크·환경변수 오류는 통과로 숨기지 않는다. 로컬은 `.env.local`·`.env`를 읽는다.
- 브라우저 진입 E2E만으로 카카오 KOE205나 Android 복귀 성공을 판단하지 않는다. `docs/KAKAO-LOGIN-SETUP.md`의 실제 로그인 검증이 필요하다.
