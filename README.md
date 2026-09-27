# Health Platform

Next.js 기반 헬스 플랫폼 MVP입니다. 초기 MVP는 운동 종목 리스트, 운동 상세 페이지, 자세 영상 업로드, 익명 댓글 피드백 기능을 제공합니다.

## 주요 기술 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- pnpm
- Vercel 배포 기준

## 로컬 실행 방법

```bash
corepack enable pnpm
pnpm install
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인합니다.

## 환경변수 설정

`.env.example`을 참고해 로컬용 `.env.local` 파일을 만들고 Supabase 값을 설정합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Supabase 스키마 적용

Supabase SQL Editor에서 `supabase/schema.sql` 내용을 실행합니다. 이 스키마는 운동 종목 테이블, 영상 테이블, 댓글 테이블, `exercise-videos` Storage bucket, MVP용 공개 읽기/익명 등록 정책을 생성합니다.

### 적용 내역

- 2026-05-18: `supabase/schema.sql`을 Supabase connection pooler로 적용했습니다.
- 생성된 테이블: `exercises`, `exercise_videos`, `video_comments`
- 생성된 Storage bucket: `exercise-videos`
- 생성된 기본 데이터: `squat`, `deadlift`, `bench-press`
- 검증: publishable key로 `exercises` 3건 조회, `exercise-videos` bucket 접근, `/exercises`, `/exercises/squat` 라우트 응답 확인

## 배포

배포는 Vercel 기준입니다. Vercel 프로젝트 환경변수에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`을 등록한 뒤 배포합니다.

## 저장소 디렉터리 구조

```text
health_app/
├─ src/
│  ├─ app/                              # Next.js App Router
│  │  ├─ admin/
│  │  │  ├─ exercise-media/
│  │  │  ├─ members/
│  │  │  ├─ reports/
│  │  │  ├─ settings/
│  │  │  └─ test/
│  │  ├─ api/
│  │  │  ├─ cron/
│  │  │  │  ├─ daily-reminders/
│  │  │  │  ├─ weekly-group-mvp/
│  │  │  │  └─ workout-inactivity/
│  │  │  └─ workout/end/
│  │  ├─ auth/callback/
│  │  ├─ calendar/[date]/
│  │  ├─ community/[id]/
│  │  ├─ conditioning/[id]/
│  │  ├─ exercises/[slug]/
│  │  ├─ groups/
│  │  │  ├─ [id]/member/[uid]/
│  │  │  ├─ join/[token]/
│  │  │  └─ manage/
│  │  ├─ plan/
│  │  │  ├─ muscle/
│  │  │  └─ today/
│  │  ├─ settings/
│  │  │  ├─ body-composition/
│  │  │  ├─ gym/
│  │  │  ├─ history/[date]/
│  │  │  ├─ me/
│  │  │  ├─ personal/
│  │  │  ├─ profile/
│  │  │  ├─ progress/
│  │  │  ├─ routine/
│  │  │  └─ score/
│  │  ├─ account-deletion/
│  │  ├─ change-password/
│  │  ├─ coach/
│  │  ├─ commitments/
│  │  ├─ cycle/
│  │  ├─ diet/
│  │  ├─ equipment/
│  │  ├─ find-id/
│  │  ├─ find-password/
│  │  ├─ home/
│  │  ├─ jog/
│  │  ├─ login/
│  │  ├─ onboarding/
│  │  ├─ pet/
│  │  ├─ privacy/
│  │  ├─ routine/
│  │  ├─ running/
│  │  ├─ suspended/
│  │  ├─ teaching/
│  │  ├─ icon-192.png/                  # 동적 아이콘 라우트
│  │  ├─ icon-512.png/
│  │  ├─ icon-512-maskable.png/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  ├─ manifest.ts
│  │  ├─ robots.ts
│  │  └─ sitemap.ts
│  │
│  ├─ features/                         # 기능 단위 모듈
│  │  ├─ account/
│  │  ├─ admin/
│  │  ├─ auth/
│  │  ├─ body-composition/
│  │  ├─ brand/
│  │  ├─ calendar/
│  │  ├─ coach/
│  │  ├─ commitments/
│  │  ├─ community/
│  │  ├─ cross-promo/
│  │  ├─ cycle/
│  │  ├─ diet/
│  │  ├─ equipment/
│  │  ├─ exercises/
│  │  ├─ groups/
│  │  ├─ gym/
│  │  ├─ health/
│  │  ├─ home/
│  │  ├─ notifications/
│  │  ├─ pet/
│  │  ├─ profile/
│  │  ├─ routine/
│  │  ├─ routine-share/
│  │  ├─ running/
│  │  ├─ teaching/
│  │  ├─ theme/
│  │  └─ workout-timer/
│  │
│  ├─ components/                       # 공통 UI 컴포넌트
│  ├─ constants/                        # 공통 정적 데이터
│  ├─ lib/                              # 공통 인프라 및 유틸리티
│  │  ├─ email/
│  │  ├─ image/
│  │  ├─ platform/
│  │  └─ supabase/
│  ├─ styles/                           # 전역 스타일
│  ├─ types/                            # 공통 타입 선언
│  └─ middleware.ts
│
├─ android/                             # Capacitor Android 프로젝트
│  ├─ app/
│  │  └─ src/
│  │     ├─ main/
│  │     │  ├─ java/app/helssu/twa/
│  │     │  └─ res/
│  │     ├─ test/
│  │     └─ androidTest/
│  └─ gradle/wrapper/
│
├─ supabase/
│  └─ schema.sql                        # DB, RLS, RPC, Storage 스키마
├─ tests/
│  ├─ be/
│  │  ├─ logic/                         # Vitest 로직 테스트
│  │  └─ stubs/
│  └─ e2e/
│     └─ helpers/                       # Playwright E2E
├─ public/
│  ├─ exercise-guides/
│  ├─ models/
│  ├─ wolf/
│  └─ sw.js
├─ docs/
│  ├─ design/
│  ├─ requests/
│  └─ superpowers/
│     ├─ plans/
│     └─ specs/
├─ native-shell/                        # Capacitor 오프라인 폴백 셸
├─ assets/                              # 앱 아이콘 원본
├─ data/                                # 운동 데이터 CSV
├─ patches/                             # pnpm 의존성 패치
├─ scripts/                             # 검증 스크립트
├─ tools/                               # Android 설정 도구
├─ releases/                            # APK 릴리스 보관
├─ dist/                                # APK 산출물
├─ capacitor.config.ts
├─ next.config.ts
├─ vercel.json
├─ playwright.config.ts
├─ vitest.config.ts
├─ eslint.config.mjs
├─ tsconfig.json
├─ pnpm-workspace.yaml
└─ package.json
```

## 유용한 명령어

```bash
pnpm dev
pnpm lint
pnpm build
```
