# 헬쑤 개발·검증 필수 규칙

> 모든 작업자는 개발 전에 `docs/원칙.md` 다음으로 이 문서를 읽는다. 기능 구현과 테스트,
> 커밋 전 검증은 선택 사항이 아니다.

## 1. 테스트 구성

| 종류 | 위치 | 실행 |
|---|---|---|
| 로직 단위 테스트(Vitest) | `tests/be/logic/*.test.ts` (현재 약 115개 파일) | `corepack pnpm test:unit` |
| 스키마 동기화 가드 | `tests/be/schema-sync.test.ts` | `corepack pnpm test:schema` |
| E2E(Playwright) | `tests/e2e/*.spec.ts` (현재 약 96개 파일) | 먼저 개발 서버 실행 후 `corepack pnpm test:e2e` |
| E2E 헬퍼 | `tests/e2e/helpers/` | 직접 실행하지 않음 |
| 테스트 가이드 | `tests/README.md` | 작업 전에 관련 절차 확인 |

파일 수는 계속 변할 수 있으므로 숫자보다 위 경로와 실행 명령을 기준으로 한다.

## 2. 기능 작업 규칙

1. 작업 시작 직전에 `git status`와 `docs/DEVELOPMENT-ROADMAP.md`를 새로 읽는다.
2. 다른 작업자가 `[진행중]`으로 표시한 업무와 그 변경 파일은 건드리지 않는다.
3. `[대기]` 업무만 선택하고 구현 전에 `[진행중]`으로 바꾼다.
4. 새 기능이나 버그 수정에는 해당 동작을 증명하는 단위 테스트 또는 E2E를 함께 만든다.
5. 구현 직후 가장 작은 대상 테스트를 먼저 실행한다.
6. 대상 린트와 TypeScript 검사를 실행하고 결과를 로드맵에 기록한다.
7. 테스트가 실패하면 기능을 완료로 표시하지 않는다. 환경 문제라면 실패 명령과 원인을 기록한다.

## 3. 커밋 전 전체 검증 게이트

커밋하기 직전에는 변경 범위와 무관하게 다음 순서로 전체 검증한다.

1. `corepack pnpm test:unit`
2. `corepack pnpm test:schema`
3. `corepack pnpm lint`
4. `corepack pnpm exec tsc --noEmit`
5. 개발 서버 실행
6. `corepack pnpm test:e2e`
7. 사용자 화면이나 Android 네이티브 변경이면 해당 빌드·실기기 검증 추가

전체 검증이 통과하지 않으면 임의로 커밋하지 않는다. 기존 실패나 외부 환경 제약 때문에 실행할
수 없다면 사용자에게 정확한 명령·실패 원인·통과하지 못한 범위를 보고하고 커밋 여부를 확인한다.

## 4. 증거 기록

- 완료한 로드맵 항목 아래에 테스트 파일과 통과 개수를 기록한다.
- E2E는 사용한 프로젝트(예: `mobile-chromium`)와 로컬/운영 대상 URL을 기록한다.
- Android는 APK 경로, 앱 버전, 기기 모델, `adb logcat` 확인 결과를 기록한다.
- 커밋 전 전체 검증 결과는 `docs/DEVELOPMENT-ROADMAP.md` 진행 기록에 남긴다.
