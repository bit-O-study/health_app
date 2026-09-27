# 2026-09-21 커밋 검증 기록

## 변경 범위

- 우드초퍼 16패널 후보6, 이전 파일 백업, 원본 프롬프트, 모바일 재생 증거 및 검사 스크립트.
- 로그인/회원가입 및 아이디 찾기 폼에서 수화 전 입력·클릭 차단.
- 스크립트 로딩을 지연시키는 E2E 회귀 2개.
- 사용자는 전체 E2E 미완료 보고 후 커밋을 재지시했고, 이어 실패 원인 수정도 요청했다.

## 원인과 수정

이벤트 핸들러 연결 전에도 서버 HTML의 입력·버튼이 활성화돼 있었다. 회원가입 클릭은 무시됐고, 아이디 찾기는 onSubmit 대신 `/find-id?`로 기본 GET 전송되며 입력이 사라졌다. 수정 전 지연 로딩 회귀는 두 화면 모두 enabled 상태로 실패했다.

공통 useHydrated 훅의 서버 스냅샷은 false, 클라이언트 스냅샷은 true로 두고 두 폼의 fieldset을 준비 전 disabled 처리했다. 인증·신원 조회 정책은 변경하지 않았다. 별도 재실행에서 발생한 외부 인증 연결 시간 초과는 화면 문제와 구분했으며, 권한 실행한 서버에서 기존 실패 3개가 통과했다. 외부 서비스 장애가 영구적으로 해결됐다는 뜻은 아니다.

## 새로 실행한 검증

| 명령/범위 | 결과 |
|---|---|
| `corepack pnpm test:unit` | 189파일 / 1986개 통과 |
| `corepack pnpm test:schema` | 69개 통과 |
| `corepack pnpm lint` | 오류0 / 기존경고40, exit0 |
| `corepack pnpm exec tsc --noEmit` | 통과 |
| `corepack pnpm exec next build` | 통과, 정적 페이지18개 생성 |
| `node --test tools/media/guide-review.test.mjs` | 3개 통과 |
| `node tools/media/verify-woodchopper-20260920.mjs` | Pixel7 모바일 Chromium 재생·7.5초 탐색 통과 |
| 지연 로딩 회귀2개 + 기존 실패3개 | 5개 모두 통과, localhost:3110 / mobile-chromium |

대상 E2E 명령:

```powershell
$env:E2E_BASE_URL='http://localhost:3110'
corepack pnpm test:e2e tests/e2e/auth-hydration.spec.ts tests/e2e/admin-password-reset.spec.ts:14 tests/e2e/find-account.spec.ts:14 tests/e2e/food-search-responsiveness.spec.ts:45 --output=test-results/auth-hydration-after
```

## 전체 E2E 이력과 한계

- 최초 localhost:3001 실행은 기존 서버 종료로 ERR_CONNECTION_REFUSED, 3개 실패/290개 미실행.
- localhost:3110의 `corepack pnpm test:e2e --max-failures=3`: 84개 통과/3개 실패/3개 건너뜀/203개 미실행(32.1분). 포함된 모바일 운동 영상86개 재생 검사는 전부 통과.
- 실패는 admin-password-reset의 회원가입 탭 전환, find-account의 이메일 결과 미표시, food-search-responsiveness의 회원가입 탭 전환이었다.
- 실패3개 첫 단독 재검사는 외부 연결 시간 초과와 함께 온보딩 진입 대기로 모두 실패.
- 수화 문제 수정 후 기존 실패3개 및 신규 회귀2개가 모두 통과(1.8분). 전체295개를 수정 후 다시 실행한 것은 아니다.
- Android 실기기 검증은 미완료. 전체 게이트를 모두 통과했다고 보고하지 않는다.
- 우드초퍼 자체의 중간 손·머리 잔상 검토는 여전히 pending이며 공개 승인하지 않았다.
- 실패 trace와 화면은 로컬 `test-results/`에 남아 있고, 해당 디렉터리는 Git 제외 대상이다.
