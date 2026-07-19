# CLAUDE.md

This file is read automatically at the start of every session. Follow it.

## 🔴 원칙(법) 먼저 — `docs/원칙.md` (Read PRINCIPLES first)

**모든 요청/질문을 처리하기 전에 `docs/원칙.md` 를 먼저 읽고, 거기 적힌 원칙을 반드시 지킨다.**
`docs/원칙.md` 는 **법**이며 사용자만 바꾼다 — Claude 는 임의로 수정·삭제·완화하지 않는다.

## 🔴 커밋 기여자 규칙 (Commit author — mandatory)

**모든 커밋은 `bong94688 <bong94688@gmail.com>` 이름/이메일로만 한다.**
커밋 작성자·기여자에 **Claude / Anthropic / Co-Authored-By 가 절대 남으면 안 된다.**

- 커밋 메시지에 `Co-Authored-By: Claude ...`, `Generated with Claude Code` 같은
  트레일러를 **넣지 않는다**.
- 커밋 실행은 작성자를 명시해서:
  `git -c user.name="bong94688" -c user.email="bong94688@gmail.com" commit ...`
- PR 본문에도 Claude 생성 표기를 넣지 않는다.
- 기여자(contributor) 목록에 오직 bong94688 만 남아야 한다.

## 🔴 멈추지 말고 자율 진행 (Keep going)

**사용자가 매번 "계속" 이라고 안 해도, 받은 작업은 멈추지 말고 끝까지 자율적으로 진행한다.**

- "계속할까요? / 이어서 할까요?" 같은 **불필요한 진행 확인으로 멈추지 않는다.** 그냥 한다.
- 여러 요청이 쌓이면 순서대로 끝까지 처리한다. 중간에 손 놓지 않는다.
- (단, 되돌리기 어렵거나 파괴적인 작업, 진짜 갈림길 결정은 여전히 확인. 그 외엔 진행.)

## 🔴 커밋만 한다 — push·PR 은 사용자가 (Commit only)

**작업이 끝나면 커밋까지만 한다. `git push` 와 PR 생성은 사용자가 직접 한다.**

- 명시적으로 "푸시해줘 / 올려줘 / PR 만들어줘" 라고 요청하지 않는 한 **push 하지 않는다.**
- 브랜치를 main 으로 올리거나 원격에 반영하는 것도 사용자 몫. Claude 는 로컬 커밋만 만든다.
- 커밋 후 "커밋했습니다. 푸시는 직접 해주세요" 처럼 상태만 알린다.

## 🔴 요청 추적 문서 (docs/requests/&lt;YYYY-MM-DD&gt;.md)

사용자 요청은 **날짜별 파일** `docs/requests/<오늘날짜>.md` 에 기록/추적한다.

- **세션 시작 시 오늘 날짜의 `docs/requests/<오늘>.md` 가 있으면 반드시 참고**한다(대기/진행 중 요청 확인).
- 새 요청이 오면 그 날짜 파일의 "대기/진행" 에 추가하고, 끝내면 "완료" 로 옮긴다. 빠짐없이.
- **질문·논의해서 정한 것(결정사항·답변)도 그날 파일에 기록**한다(나중에 참고).
- **완료되지 않은 항목은 자동으로 다음 날 파일로 계속 이월**한다(끝날 때까지 매일 따라감).
- **전날 파일에서 완료 안 된 요청은 오늘 날짜 파일에 다시 이월**해 적는다(빠뜨리지 않게).
- **완료했더라도 사용자가 "OK/확인" 하지 않은 항목은, 끝내기 전에 다시 한번 "이거 이렇게 하면 될까요?" 확인**한다. 사용자 OK 전까지는 "완료 확정"이 아니다.
- **그 날짜의 모든 요청을 다 끝내고 + 사용자 OK 까지 받으면**, "다 했습니다. 오늘 요청 추적 문서(`docs/requests/<날짜>.md`) 지워도 될까요?" 라고 **먼저 물어보고**, 사용자가 OK 하면 그때 삭제한다. 마음대로 지우지 않는다.

## 🔴 테스트는 필수 (Tests are mandatory)

**기능을 만들거나 고치면 항상 테스트 코드를 같이 작성/갱신한다.** 예외 없음.

When you add or change a feature, you MUST add or update tests in the same change:

- **로직(순수 함수)** → Vitest 단위테스트 `tests/be/logic/*.test.ts`
- **사용자 플로우(UI/페이지/액션)** → Playwright E2E `tests/e2e/*.spec.ts`
  (회원가입은 `signUpAndOnboard()`, 운동 시드는 `seedRecommendedExercises()` 헬퍼 사용)
- **DB 스키마 변경(`supabase/schema.sql` 수정)** → 반드시 라이브 DB에도 적용하고
  `pnpm test:schema`로 동기화를 확인한다. (스키마만 고치고 DB에 안 올리면 prod에서 "빵꾸"가 난다 — 과거 버그 전부 이 원인이었다.)

### 🔴 기능을 바꾸면 영향받는 기존 테스트·코드 경로를 _전부_ 같이 고친다

새 테스트만 추가하고 **기존 테스트를 방치하지 말 것.** 비즈니스 로직을 바꿨으면
그 로직을 검증하던 기존 단언(`tests/**`)을 찾아 바뀐 동작에 맞게 **갱신하거나 삭제**한다.
(과거에 "테스트는 그대로인데 로직만 바뀌어서 검증이 안 되는" 문제가 반복됐다.)

또한 **같은 동작을 구현한 코드 경로가 여러 개면 한 곳만 고치지 말고 전부 고친다.**
끝내기 전에 바꾼 함수·상수 이름으로 `grep` 해서 다른 호출부가 빠지지 않았는지 확인한다.
예) "추천 운동 채우기"는 `fillMissingFocusesAction`(actions.ts)·
`registerRecommendedPlanAction`(plan-actions.ts)·`PlanEditor.doRecommendFocus`(컴포넌트)
**세 곳**에 있다 — 하나만 고치면 다른 경로로 들어온 사용자에게는 기능이 빠진다.

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
