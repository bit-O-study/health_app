# CLAUDE.md

This file is read automatically at the start of every session. Follow it.

## 🔴 테스트는 필수 (Tests are mandatory)

**기능을 만들거나 고치면 항상 테스트 코드를 같이 작성/갱신한다.** 예외 없음.

When you add or change a feature, you MUST add or update tests in the same change:

- **로직(순수 함수)** → Vitest 단위테스트 `tests/be/logic/*.test.ts`
- **사용자 플로우(UI/페이지/액션)** → Playwright E2E `tests/e2e/*.spec.ts`
  (회원가입은 `signUpAndOnboard()`, 운동 시드는 `seedRecommendedExercises()` 헬퍼 사용)
- **DB 스키마 변경(`supabase/schema.sql` 수정)** → 반드시 라이브 DB에도 적용하고
  `pnpm test:schema`로 동기화를 확인한다. (스키마만 고치고 DB에 안 올리면 prod에서 "빵꾸"가 난다 — 과거 버그 전부 이 원인이었다.)

작업을 "끝났다"고 말하기 전에 `pnpm test`가 green인지 확인한다. UI 변경이면 관련 E2E도 돌린다.

## 테스트 실행 (Test commands)

```bash
pnpm test          # BE 전체 (로직 단위 + 스키마 동기화 가드) — 앱 불필요
pnpm test:unit     # 로직 단위테스트만 (빠름, 오프라인)
pnpm test:schema   # schema.sql ↔ 라이브 DB 드리프트만 검사
pnpm test:e2e      # FE E2E (먼저 `pnpm dev` 필요)
```

자세한 구조·가이드는 `tests/README.md` 참고.

## 빌드/런 전 자동 테스트 (Test gates)

`.npmrc`의 `enable-pre-post-scripts=true` + package.json pre-스크립트로 자동 실행됨:

- `pnpm dev`   → 먼저 `pnpm test:unit` (빠른 로직 테스트)
- `pnpm build` → 먼저 `pnpm test` (로직 + 스키마 가드)
- `pnpm start` → 먼저 `pnpm test`

테스트가 실패하면 빌드/실행이 중단된다. 이건 의도된 동작 — 깨진 채로 배포/실행하지 않기 위함.

## 프로젝트 메모

- 패키지 매니저는 `corepack pnpm <cmd>` (pnpm이 PATH에 없음).
- `middleware.ts`는 `src/middleware.ts`에 있어야 한다(이 프로젝트는 src 디렉터리 사용).
- DB DDL은 수동 적용. 비밀번호는 `.env.test.local`(gitignore)에 있고, 테스트 스위트가
  pooler(`aws-1-ap-southeast-1`)로 스키마 검사·정리에 사용한다.
- E2E는 라이브 Supabase에 `e2e_*` 임시 계정을 만들고 끝나면 자동 삭제(global-teardown).
