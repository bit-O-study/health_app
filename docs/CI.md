# CI와 정적 검사

> 로드맵 P2.2. 무엇이 어디서 돌고, 실패하면 어디를 보는지.

## 워크플로우

| 파일 | 언제 | 하는 일 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | 모든 푸시·PR | 단위 테스트 · 린트 게이트 · 타입 검사 · 스키마 동기화 · 빌드 |
| `.github/workflows/android-apk.yml` | 수동 / `v*` 태그 | 디버그 APK 빌드 → 아티팩트·Release 첨부 |
| `.github/workflows/workout-inactivity-cron.yml` | 10분마다 | 무활동 감지 엔드포인트 호출 |

`ci.yml` 은 각 단계를 `continue-on-error` 로 돌리고 **마지막에 한꺼번에 판정**한다.
첫 실패에서 멈추면 "린트도 깨졌는지" 를 다음 실행까지 기다려야 해서 느리다.

## 버전 고정

- **Node** — `.nvmrc` 한 곳에서만 관리한다. `ci.yml` · `android-apk.yml` 둘 다
  `node-version-file: .nvmrc` 를 쓴다. 로컬도 `nvm use` 로 같은 버전을 쓰면 된다.
- **pnpm** — `package.json` 의 `packageManager` 필드가 진짜 기준이고 corepack 이 강제한다.
  CI 는 `corepack enable` 만 하면 그 버전이 잡힌다.
- 설치는 항상 `--frozen-lockfile` — 락파일과 다르면 CI 가 실패해야 한다.

## 린트 게이트 — 기준선보다 늘어난 것만 막는다

```bash
corepack pnpm lint          # 전체 결과 보기(사람이 읽는 용도)
corepack pnpm lint:gate     # 기준선 대비 신규 에러만 확인 (CI 가 쓰는 것)
corepack pnpm lint:baseline # 고친 뒤 기준선 낮추기
```

### 왜 기준선인가

산출물을 무시 범위에서 빼기 전에는 `pnpm lint` 가 **11,367건(에러 444)** 을 뱉었다.
그중 11,286건이 `performance-report-site/`(gitignore 대상 산출물)·`android/app/build/`
같은 **생성 파일**이었다. 실제 소스 문제가 그 안에 묻혀 있어서 CI 게이트를 걸 수가 없었다.

무시 범위를 정리하니 **65건(에러 29)** 이 됐다. 남은 29건은 전부 실제 소스지만 지금
당장 다 고칠 수는 없어서(파일이 다른 작업과 겹친다) 현재 상태를 기준선으로 박고
**거기서 늘어난 것만** 막는다.

### 기준선 동작

- 키는 `<파일경로>::<규칙 id>`, 값은 그 조합의 **에러 개수**.
  줄 번호는 코드가 조금만 움직여도 바뀌므로 넣지 않는다.
- **차단**: 없던 (파일,규칙) 조합이 생김 / 있던 조합의 개수가 늘어남
- **통과 + 안내**: 개수가 줄거나 사라짐 → "기준선을 낮추세요" 를 출력
- 경고(warning)는 막지 않는다. 에러만 게이트 대상.
- 파일: `tools/lint/lint-baseline.json` (키 정렬 저장 — 동시 작업 중 diff 충돌 최소화)
- 비교 로직은 `tools/lint/lint-baseline.mjs` 의 순수 함수이고
  `tests/be/logic/lint-baseline.test.ts` 32개 테스트가 지킨다.

### 무시 범위

`eslint.config.mjs` 의 `globalIgnores`. 핵심은 **기본 목록이 레포 루트에만 걸린다**는 점이다.
하위 폴더의 `.next`/`dist`/`out`/`build` 는 `**/` 를 붙여야 걸러진다.

## 테스트 시간에 대해

`corepack pnpm exec vitest run <파일 1개>` 가 15초쯤 걸리는데, 대부분이 고정 기동 비용이다.

| 실행 방법 | 시간 |
| --- | ---: |
| `corepack pnpm exec vitest run <가벼운 테스트>` | 14.6s |
| `./node_modules/.bin/vitest run <같은 테스트>` | **8.9s** |
| `--pool=forks` 로 바꿔보면 | 23.0s (더 느림 — 쓰지 말 것) |

- `corepack pnpm exec` 래퍼가 약 5.6초를 더한다. 한 파일만 빨리 돌릴 땐 바이너리를 직접 부르는 게 낫다.
- 전체 스위트(117파일)는 약 220초. 이 시간의 대부분은 테스트 실행(9.7초)이 아니라
  거대 카탈로그 모듈의 transform/import 다 — 근본 해결은 로드맵 **1.2**(카탈로그를
  클라이언트 번들에서 빼기)이지 CI 설정이 아니다.
### worker 종료 문제 — 진단 결과

로드맵에는 "멈추는 `exercise-search.test.ts` 의 worker 종료 문제" 로 적혀 있었다.
실제로 확인한 것은 다음 세 가지이고, **지목된 파일은 원인이 아니었다.**

1. **`exercise-search.test.ts` 는 멈추지 않는다.** 단독 실행 시 8개 테스트가 약 4초에
   통과한다. 가벼운 테스트 파일(`phone.test.ts`)도 벽시계로 같은 만큼 걸리므로,
   그 파일 고유 문제가 아니라 위 표의 고정 기동 비용이었다.

2. **워커 종료 지연은 실재한다.** 전체 스위트를 돌리면 이런 줄이 뜬다:

   ```
   [vitest-pool]: Timeout terminating forks worker for test files …weather-cache.test.ts
   ```

   Vitest 4 의 기본 pool 은 `forks` 이고 `teardownTimeout` 기본값이 10초다. 무거운
   모듈 그래프를 물고 있던 자식 프로세스가 그 안에 안 죽으면 이 경고가 난다.
   결과는 통과지만 종료가 늘어지고 로그가 지저분해진다. **다른 빌드가 같이 도는 등
   CPU 가 붐빌 때만 재현**돼서 그동안 "가끔 멈춘다" 로 보였다.
   → `teardownTimeout: 30s` 로 해결.

3. **간헐 실패도 실재했다.** 워커가 여러 개 붙으면 `beforeEach` 의 동적 import 가
   기본 10초를 넘겨 `Hook timed out in 10000ms` 로 깨졌다(`workout-active-row.test.ts` 3건).
   → `hookTimeout: 30s` · `testTimeout: 20s` 로 해결.

세 가지 모두 **로딩 시간이 길어서** 생기는 증상이지 로직 문제가 아니다. 타임아웃을
올린 건 대증요법이고, 근본 해결은 로드맵 **1.2** 다.

## 실패하면 어디를 보나

- GitHub Actions 실행 페이지의 **요약(Summary)** — 단계별 결과와 소요 시간 표
- **`ci-logs` 아티팩트** — `unit.log` · `lint.log` · `tsc.log` · `schema.log` · `build.log`
  (14일 보존)

## 시크릿이 없으면 건너뛴다

포크 PR 등 시크릿이 없는 실행에서 스키마 검사와 빌드는 **실패가 아니라 건너뜀**이다.

| 시크릿 | 쓰는 곳 |
| --- | --- |
| `SUPABASE_DB_URL` | 스키마 동기화 검사 |
| `NEXT_PUBLIC_SUPABASE_URL` / `_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SITE_URL` | 빌드 |
| `CRON_URL` / `CRON_SECRET` | 무활동 cron |
