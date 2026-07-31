# 슬로우 쿼리 전수 검수보고서 — 2026-07-30

## 1. 결론

현재 운영 DB에서 **앱의 일반 SQL 자체가 지속적으로 느린 증거는 없다.**
사용자 체감 지연의 주원인은 다음 순서로 판단한다.

1. 인증·권한·기능 플래그 등 짧은 쿼리의 과다 호출
2. 반복문 안에서 Supabase 요청을 직렬 실행하는 N+1/왕복 누적
3. 서버 렌더와 프리페치가 같은 데이터 함수를 중복 호출하는 경로
4. 장기적으로 데이터가 늘 때 복합 조건과 맞지 않을 수 있는 일부 인덱스

운영 `pg_stat_statements`에서 주요 앱 SQL의 평균 실행시간은 대부분
**0.18~7.70ms**다. 즉 500ms가 걸리는 화면에서 DB SQL이 500ms를 소비하는
것이 아니라, Supabase까지의 HTTP 왕복과 인증을 여러 번 수행해 시간이
누적되는 형태다.

## 1.1 Speed Insights 기준선

사용자가 제공한 최근 24시간 Production Mobile P75:

| 지표 | 측정값 | 판단 |
|---|---:|---|
| Real Experience Score | 56 | 개선 필요 |
| `/routine` RES | 12 | 심각 |
| TTFB | 5.73s | 최초 서버 응답 병목 |
| FCP | 7.56s | TTFB 영향 |
| LCP | 7.56s | 초기 콘텐츠가 한꺼번에 도착 |
| INP | 120ms | 화면 표시 후 상호작용은 양호 |
| CLS | 0.01 | 레이아웃 안정성 양호 |

TTFB가 전체 지연의 대부분이고 INP·CLS는 정상에 가깝다. 따라서 이번
조치는 클라이언트 애니메이션이나 CSS가 아니라 `/routine` 서버 렌더의
직렬 데이터 대기와 스트리밍 부재를 대상으로 했다.

## 1.2 2026-07-30 적용 조치

### 루트 레이아웃 비차단화

`src/app/layout.tsx`

- 기존: 로그인 사용자·코치 플래그·그룹 모드를 모두 기다린 뒤 HTML 생성
- 변경: 로그인 사용자만 초기 렌더에 필요하도록 축소
- 코치 플래그와 그룹 모드는 `ConfiguredBottomNav`에서 병렬 조회
- 하단 내비게이션은 `Suspense` 기본 내비게이션을 먼저 보내고 설정 완료 후 교체

효과: `debug_feature_enabled`와 `group_mode()` 왕복이 앱 전체의 최초 HTML을
막지 않는다.

### `/routine` 최초 조회 단계 통합

`src/app/routine/page.tsx`

- 기존 첫 병렬 묶음: 프로필, 루틴, 기능 플래그 2개
- 기존 다음 단계: 오늘 계획 조회
- 변경 첫 병렬 묶음: 프로필, 루틴, 오늘 계획
- 기능 플래그는 운동 상세 데이터 묶음으로 이동
- 이미 읽은 오늘 계획을 `TodayExercises`에 전달해 하위 컴포넌트의 재호출 제거

효과: 오늘 계획을 기다리는 별도 직렬 단계를 제거하고, 핵심 카드에 필요한
데이터를 첫 DB 왕복에서 확보한다.

### 운동 목록 스트리밍

`src/app/routine/page.tsx`,
`src/features/routine/components/today-exercises.tsx`

- 운동 목록을 독립 `Suspense` 경계로 분리
- 운동 데이터가 준비되는 동안 작은 스켈레톤 표시
- 날짜·오늘 운동 카드 등 상단 콘텐츠는 운동 상세 조회보다 먼저 스트리밍 가능
- 자세 분석·기구 스캔 플래그를 운동 계획·유산소·완료·최근 중량 조회와 같은
  `Promise.all`에 포함

효과: 플래그 조회라는 별도 선행 단계가 사라지고, 상세 운동 데이터가 늦어도
상단 콘텐츠의 FCP를 막지 않는다.

### 변경 전후 요청 단계

| 구간 | 변경 전 | 변경 후 |
|---|---|---|
| 루트 레이아웃 | auth + 플래그 + 그룹 모드 모두 차단 | auth만 차단, 나머지 스트리밍 |
| `/routine` 첫 데이터 | 프로필·루틴·플래그 | 프로필·루틴·오늘 계획 |
| 오늘 계획 | 상위 계산 중 별도 await | 첫 데이터와 동시 |
| 운동 상세 | 7개 조회 후 전체 페이지 완료 | 7개+플래그 병렬, 독립 스트리밍 |
| 하단 내비 설정 | 전체 HTML 차단 | 기본 내비 우선 표시 |

운영 배포 후의 실제 TTFB 개선폭은 Speed Insights 신규 표본으로 확인해야
한다. 이번 로컬 검수에서는 구조적 대기 단계 감소와 빌드 성공까지 확인했으며,
아직 배포 전 실사용 P75 개선값을 추정치로 기재하지 않는다.

## 2. 측정 범위와 주의사항

- 측정 시각: 2026-07-30 (KST)
- 대상: 라이브 Supabase Postgres
- 근거:
  - `pg_stat_statements`
  - `pg_stat_user_tables`
  - 운영 `pg_indexes`
  - `src` 전체 Supabase 호출 정적 검사
- 통계 누적 시작: **2026-05-08 03:19 KST**
- 통계에는 개발·E2E·관리 콘솔·7월 28일 최적화 이전 호출이 함께 포함된다.
  따라서 누적 호출 수는 현재 배포의 페이지 1회 호출 수를 뜻하지 않는다.
- 운영 데이터가 작다. 가장 큰 앱 테이블도 `exercise_completions` 639행,
  `routine_conditioning` 427행 수준이라, 현재의 빠른 실행계획이 대규모
  데이터에서도 그대로 유지된다고 단정할 수 없다.

## 3. 운영 DB 실측 결과

### 3.1 누적 부하가 큰 앱 쿼리

| 쿼리 | 호출 수 | 평균 | 최대 | 누적 | 판정 |
|---|---:|---:|---:|---:|---|
| 미들웨어 `profiles` 차단 상태 조회 | 77,962 | 0.62ms | 35.62ms | 48.64s | SQL은 빠름, 과거 과다 호출 |
| `admins` 권한 조회 | 105,955 | 0.36ms | 24.08ms | 37.78s | SQL은 빠름, 과거 과다 호출 |
| 운동 중량 이력 조회 | 3,502 | 4.61ms | 24.93ms | 16.16s | 앱 SQL 중 누적 1위 |
| `debug_feature_enabled` RPC | 11,363 | 0.79ms | 394.53ms | 8.94s | 호출 수 축소 필요 |
| 운동 완료 저장 | 939 | 5.58ms | 44.30ms | 5.24s | 현재 정상 |
| 주간 운동 완료 조회 | 1,758 | 2.70ms | 14.49ms | 4.75s | 현재 정상 |
| 루틴 위치 UPDATE | 3,197 | 1.07ms | 46.78ms | 3.43s | 건별 갱신 축소 필요 |
| 사용자 활동 UPSERT | 1,284 | 2.52ms | 44.84ms | 3.24s | 빈도 관찰 |
| 완료 운동 exact count 계열 | 266 | 7.70ms | 37.82ms | 2.05s | 데이터 증가 시 재검토 |
| `group_mode()` RPC | 3,255 | 0.46ms | 254.74ms | 1.50s | 호출 수 축소 필요 |

`SELECT name FROM pg_timezone_names`가 평균 633.89ms로 전체 1위지만 앱
비즈니스 쿼리가 아니며 149회 관리/도구성 호출이다. Supabase 관리 화면과
백업·스키마 조회 SQL도 앱 최적화 대상에서 제외했다.

### 3.2 인증 쿼리

Auth 내부의 `users`, `sessions`, `identities`, MFA 조회가 각각 약
15.9만~16.2만 회 누적됐다. 개별 SQL은 평균 0.01~0.07ms로 빠르지만,
`auth.getUser()` 한 번이 여러 내부 쿼리와 외부 HTTP 왕복을 만든다.
따라서 인증 경로는 인덱스 추가보다 **호출 횟수 감소**가 효과적이다.

### 3.3 테이블 스캔

| 테이블 | 행 수 | 순차 스캔 | 인덱스 스캔 | 판단 |
|---|---:|---:|---:|---|
| `daily_plan` | 137 | 13,704 | 6,776 | 작은 테이블이라 현재 비용은 낮으나 조건 점검 필요 |
| `exercise_completions` | 639 | 1,244 | 23,761 | 인덱스 사용 우세, 양호 |
| `conditioning_completions` | 177 | 2,457 | 18,953 | 현재 양호 |
| `routine_exercises` | 381 | 952 | 36,395 | 양호 |
| `user_activity` | 106 | 1,647 | 1,340 | 소규모라 문제 없음 |
| `routine_conditioning` | 427 | 76 | 19,520 | 양호 |

순차 스캔 횟수만으로 인덱스 누락을 판정하면 안 된다. Postgres는 100여 행
테이블에서는 전체 스캔이 더 싸다고 판단할 수 있다. 현재는 인덱스를
추가하기보다 데이터 증가 후 `EXPLAIN (ANALYZE, BUFFERS)`로 재검증하는
편이 안전하다.

## 4. 코드 경로별 위험

### P0 — 일일 알림 크론의 직렬 N+1

`src/app/api/cron/daily-reminders/route.ts:61-89`

- 전체 루틴 1회 조회
- 사용자마다 식단 또는 운동 완료 여부 1회 조회
- 사용자마다 푸시 구독 2회 조회
- `notifyUser`가 구독과 FCM 토큰을 다시 조회
- 모든 사용자를 `for` 루프에서 직렬 처리

대략 `1 + (4~6 × 사용자 수)` DB 요청에 외부 푸시 요청까지 직렬로
붙는다. 사용자가 1,000명이면 SQL 한 건이 2ms여도 네트워크 왕복만으로
크론 제한시간을 넘을 수 있다.

**개선안:** 오늘의 식단/완료 사용자와 알림 토큰을 각각 한 번에 조회해
Set/Map으로 판정한다. `sendReminder`의 사전 count는 제거하고
`notifyUser` 결과로 전송 여부를 판단한다. 발송은 제한된 동시성으로
처리한다.

### P0 — 알림 fan-out의 기기별 직렬 외부 요청

`src/features/notifications/push-fanout.ts:31-62`

웹푸시 구독과 FCM 토큰을 순차 조회하고, 각 기기로의 외부 요청도 각각
직렬 실행한다. 이 경로는 DB보다 외부 네트워크가 병목이다.

**개선안:** 두 토큰 조회를 `Promise.all`로 합치고, 기기 발송은 제한된
동시성으로 처리한다. 만료 토큰 삭제는 모아 한 번의 `.in(...)` 삭제로
처리한다.

### P1 — 주간 MVP의 그룹/회원 N+1

`src/features/groups/weekly-mvp.ts:59-96`, `:167-180`

그룹마다 회원 1회 + 프로필/운동/유산소 3회가 실행되고, 회원별 알림은
직렬이다. 복수 그룹 가입자는 완료 기록도 그룹마다 반복 조회된다.

**개선안:** 모든 그룹 회원을 한 번에 읽고 전체 회원 ID로 프로필과 기간
기록을 한 번씩 조회한 뒤 메모리에서 그룹별 집계한다.

### P1 — 루틴/일일 계획 변경의 건별 UPDATE

- `src/features/routine/daily-plan-actions.ts:112-156`
- `src/features/routine/actions.ts:301-324`
- `src/features/routine/day-index-migration.ts:116-192`

계획의 운동 수나 일수에 비례해 UPDATE가 직렬 증가한다. 운영 통계의
루틴 위치 UPDATE 3,197회도 이 패턴과 일치한다.

**개선안:** 다건 위치/날짜 변경을 하나의 RPC 또는 `unnest/jsonb_to_recordset`
기반 UPDATE로 원자화한다. 단순 병렬화는 부분 실패를 만들 수 있어
트랜잭션 RPC가 우선이다.

### P1 — 기능 플래그 RPC 과다 호출

`src/features/admin/debug-features.server.ts:45-49`

플래그 하나를 확인할 때마다 `debug_feature_enabled` RPC를 실행한다.
평균 SQL은 0.79ms지만 11,363회 누적됐고 최대 394.53ms outlier가 있다.

**개선안:** 한 서버 렌더 안에서는 React `cache()`로 중복 제거하고, 여러
플래그를 한 번에 반환하는 단일 조회로 합친다. 전역 TTL 캐시는 관리자
변경 즉시 반영 요구와 충돌하므로 짧은 TTL 또는 태그 무효화가 필요하다.

### P2 — 운동 중량 이력 범위가 무제한

`src/features/routine/exercise-completions.ts:200-218`

사용자의 완료 운동 이력을 제한 없이 읽고 애플리케이션에서 운동별 최근
값을 계산한다. 현재 639행에서는 평균 4.61ms지만 사용자 기록이 누적되면
응답 크기와 JSON 처리 비용이 선형 증가한다.

**개선안:** `DISTINCT ON (exercise_id) ... ORDER BY exercise_id, for_date DESC`
RPC 또는 최근 기간 제한으로 필요한 최신 행만 반환한다. 후보 인덱스는
`(user_id, exercise_id, for_date DESC) WHERE status = 'done'`이며, 실제
데이터 증가 후 실행계획을 확인하고 추가한다.

### P2 — 미들웨어 누적 호출은 대부분 과거 데이터

`src/lib/supabase/middleware.ts:71-128`

누적 통계에는 `profiles` 77,962회와 `admins` 105,955회가 보이지만 현재
코드는 문서 요청만 처리하고 `admins`는 `/admin`에서만 조회하도록 이미
개선돼 있다. 7월 28일 이전 프리페치 요청까지 포함된 누적값으로 현재
상태를 오판하면 안 된다.

남은 확인점은 실제 배포에서 페이지 1회 탐색 시 `auth.getUser`,
`profiles`, `admins`가 각각 몇 회 발생하는지다. 통계 초기화 대신
`pg_stat_statements` 전후 델타로 재측정해야 한다.

## 5. 인덱스 검수

핵심 조회에는 운영 인덱스가 존재한다.

- `exercise_completions(user_id, for_date desc)`
- 완료 전용 partial index `(user_id, for_date) WHERE status='done'`
- `routine_exercises(user_id, day_index, focus, position)`
- `daily_plan(user_id, for_date, focus, position)`
- `food_logs(user_id, for_date desc, meal, position)`
- `workout_active_state(active, last_activity_at)`
- `profiles(user_id)` PK

즉시 추가할 필수 인덱스는 발견하지 못했다. 다음 두 개는 데이터 증가 시
후보로만 관리한다.

1. 운동별 최신 중량:
   `(user_id, exercise_id, for_date desc) WHERE status='done'`
2. 활동일 기간 집계가 늘 경우:
   현재 PK `(user_id, active_date)`의 실행계획 재확인

사용되지 않을 가능성이 큰 인덱스를 지금 추가하면 쓰기 비용과 저장공간만
늘기 때문에 이번 검수에서는 DDL 변경을 권장하지 않는다.

## 6. 개선 우선순위와 검증 기준

1. 일일 알림 크론 쿼리 일괄화
   - 목표: DB 요청 수를 `O(사용자 수)`에서 고정 4~6회로 축소
   - 검증: 100/1,000 사용자 fixture에서 요청 수와 총시간 측정
2. 푸시 fan-out 및 주간 MVP 제한 동시성 적용
   - 목표: 직렬 외부 요청 제거, Supabase/FCM rate limit 이내 유지
3. 기능 플래그 렌더 단위 중복 제거
   - 목표: 페이지 탐색 1회당 플래그 RPC 1회 이하
4. 루틴 다건 UPDATE를 트랜잭션 RPC로 통합
   - 목표: 운동 수와 무관하게 저장 왕복 1회, 부분 저장 불가
5. 운동별 최신 중량 서버 집계
   - 목표: 반환 행 수를 전체 이력에서 운동 종류 수로 제한

배포 후에는 대표 경로(`/home`, `/routine`, `/calendar`, `/settings`,
알림 크론)를 각각 3회 수행하면서 `pg_stat_statements` 델타와 서버
응답시간을 함께 기록한다. SQL 평균만 보지 말고 **요청 수 × 네트워크
왕복시간**을 기준으로 회귀 여부를 판단해야 한다.

## 7. 최종 판정

- DB 인덱스/단일 SQL 성능: **양호**
- 쿼리 호출 구조: **개선 필요**
- 즉시 장애 위험: **낮음** (현재 17명, 앱 테이블 최대 639행)
- 사용자 증가 시 위험: **높음** (크론·알림·루틴 변경의 직렬 N+1)
- 가장 먼저 고칠 항목: **일일 알림 크론 + 푸시 fan-out**

## 8. 변경 검증 결과

| 검사 | 결과 |
|---|---|
| TypeScript `tsc --noEmit` | 통과 |
| 대상 ESLint | 오류 0, 기존 미사용 매개변수 경고 1 |
| 대상 Vitest | 3 files, 33 tests 통과 |
| Next.js 16.2.6 production build | 통과 |
| `/routine` 빌드 분류 | Dynamic SSR 정상 |

전체 `pnpm build`는 `prebuild`에 연결된 전체 테스트가 장시간 실행되어
도구 제한시간을 넘겼다. 테스트와 빌드 문제를 분리하기 위해 대상 Vitest와
`next build`를 각각 실행했고 둘 다 통과했다. 기존 Android Gradle 변경과
그 밖의 사용자 작업 파일은 수정하지 않았다.
