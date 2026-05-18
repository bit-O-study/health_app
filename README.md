# Health Platform

Next.js 기반 헬스 플랫폼 MVP입니다. 초기 MVP는 운동 종목 리스트, 운동 상세 페이지, 자세 영상 업로드, 익명 댓글 피드백 기능을 목표로 합니다.

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
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 배포

배포는 Vercel 기준입니다. Vercel 프로젝트 환경변수에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 등록한 뒤 배포합니다.

## 프로젝트 구조

```text
src/
  app/
  components/
  constants/
  features/
  lib/
  styles/
  types/
```

## 유용한 명령어

```bash
pnpm dev
pnpm lint
pnpm build
```
