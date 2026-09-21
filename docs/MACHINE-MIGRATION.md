# 다른 컴퓨터로 옮기기 — 체크리스트

작성: 2026-09-21. **git clone 으로 따라오지 않는 것**만 정리했다.
비밀값은 여기에 적지 않는다(원칙). 아래는 **키 이름과 어디서 오는지**만 적는다.

## 🔴 0. 옮기기 전에 먼저 — 미푸시 커밋

`health_app` 은 **원격보다 앞선 로컬 커밋이 있다.** 그냥 새 컴퓨터에서 clone 하면 **사라진다.**

```bash
git -C health_app log --oneline @{u}..HEAD   # 몇 개 남았는지 먼저 확인
git -C health_app push                       # ← 사용자가 직접
```

푸시하지 않을 거라면 **`.git` 폴더째 복사**해야 한다(clone 으로는 못 가져간다).
2026-09-21 기준 브랜치 `feat/full-ui-renewal` 에 미푸시 6개.

`heltch-admin` 은 미푸시 0개라 clone 으로 충분하다.

## 저장소 (clone 으로 해결)

두 개의 **독립 git 저장소**다. 상위 `D:\git\heltch` 는 저장소가 아니다.

| 폴더 | 원격 |
|---|---|
| `health_app` | `https://github.com/bit-O-study/health_app.git` |
| `heltch-admin` | `https://github.com/bit-O-study/admin.git` |

## 📄 .md 문서 — **따로 옮길 것 없음**

`health_app` 의 마크다운 **79개 전부 git 에 추적**되고 있다. 미추적·무시된 .md 는 없다.
(`_repanel-16/CODEX-HANDOFF.md` 는 `_repanel-16/*` 규칙에 걸려 빠져 있던 것을
2026-09-21 에 `.gitignore` 예외로 살렸다. 그 전 백업에는 없을 수 있으니 주의.)

무시 목록에 잡히는 .md 는 전부 **옮길 필요 없는 것**이다:
`node_modules/`, `tools/media/.venv-cutout/` 의 라이선스 파일, `test-results/` 의 실패 리포트.

새 컴퓨터에서 먼저 읽을 문서 순서:
`CLAUDE.md` → `docs/원칙.md` → `RULE.md` → `docs/DEVELOPMENT-ROADMAP.md`(P1.4) →
`docs/EXERCISE-VIDEO-RESUME.md` → `docs/requests/<오늘>.md` → `tests/README.md`

## 🔑 .env — **반드시 손으로 옮긴다**

`.gitignore` 의 `.env*` (예외 `!.env.example`) 때문에 git 에 없다.
USB·암호화 압축 등 **안전한 경로로** 옮기고, 메신저·이슈·문서에 붙여넣지 않는다.

### health_app/.env — 2키

공개 Supabase 설정. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### health_app/.env.local — 21키 (가장 중요)

없으면 앱이 대부분 안 돈다.

- 메일: `RESEND_API_KEY`, `EMAIL_FROM`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`
- 배포: `VERCEL_TOKEN`, `VERCEL_OIDC_TOKEN`, `NEXT_PUBLIC_SITE_URL`
- 소셜 로그인: `KAKAO_REST_API_KEY`, `NEXT_PUBLIC_KAKAO_JS_KEY`,
  `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_CLIENT_JSON`
- 웹푸시: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- 기타: `CRON_SECRET`, `NVIDIA_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`,
  `FOOD_DB_URL`, `FOOD_DB_API_KEY`, `SUPABASE_ACCESS_TOKEN`

`VERCEL_OIDC_TOKEN` 은 수명이 짧다 — 새 컴퓨터에서 `vercel env pull` 로 다시 받는 게 낫다.

### health_app/.env.test.local — 9키 (테스트 전용)

없으면 **E2E 와 스키마 가드가 통째로 skip** 된다(`pnpm test:schema`, `tests/e2e/**`).

- DB: `SUPA_DB_REF`, `SUPA_DB_HOST`, `SUPA_DB_PORT`, `SUPA_DB_PW`
- 실계정 스모크: `E2E_REAL_EMAIL`, `E2E_REAL_PW`
- 메일 검증: `RESEND_API_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`

### heltch-admin/.env.local — 2키

`LIQUOR_SUPABASE_URL`, `LIQUOR_SUPABASE_SERVICE_ROLE_KEY`

> 각 저장소의 `.env.example` 은 git 에 있으니 **양식은 거기서 보고 값만 채우면 된다.**

## 그 밖에 git 에 없는 것

| 대상 | 옮길까 | 비고 |
|---|---|---|
| `tools/media/imports/` (24MB) | **옮긴다** | 원본 백업·후보 이미지·재생 증거. 재생성 불가 |
| `~/.codex/generated_images/` (667MB) | **선별해서 옮긴다** | 등록된 원본 PNG 의 출처. 전부는 과하니 현재 참조분만 |
| `android/local.properties` | 옮기지 않는다 | SDK 경로라 컴퓨터마다 다르다. 새로 만든다 |
| `.claude/settings.local.json` | 선택 | 권한 허용목록. 없으면 권한 창이 늘 뿐 |
| `node_modules/` | 옮기지 않는다 | `corepack pnpm install` |
| `tools/media/.venv-cutout/` | 옮기지 않는다 | 아래 명령으로 다시 만든다 |
| `.next/`, `test-results/`, `playwright-report/` | 옮기지 않는다 | 전부 재생성물 |
| 안드로이드 서명 키스토어 | — | 이 저장소엔 **없다**. 따로 보관 중이면 그것도 챙긴다 |

## 새 컴퓨터에서 세팅

```bash
corepack pnpm install
corepack pnpm exec playwright install chromium

# 누끼 파이썬 환경 (영상 제작을 할 때만 필요)
python -m venv tools/media/.venv-cutout
tools/media/.venv-cutout/Scripts/python -m pip install -r tools/media/requirements-cutout.txt

# 확인
corepack pnpm test          # .env.test.local 있어야 스키마 가드까지 돈다
corepack pnpm dev
```

- 패키지 매니저는 `corepack pnpm` (pnpm 이 PATH 에 없다).
- `enable-pre-post-scripts=true` 때문에 `dev`/`build`/`start` 앞에 테스트가 자동으로 붙는다.
- E2E 는 라이브 Supabase 에 `e2e_*` 임시 계정을 만들고 끝나면 지운다.
  **여러 컴퓨터에서 동시에 돌리지 않는다** — 같은 DB 를 건드린다.
- `next dev` 는 같은 디렉터리에서 두 번째 서버를 거부하고, 포트가 막히면 조용히 다음 포트로 옮긴다.
  E2E 전에 실제 리스닝 포트를 확인하고 `E2E_BASE_URL` 을 맞춘다.
