# 트레이너 · 회원 관리 검수보고서 (2026-09-18)

> 대상: "회원 통계(연/월/주) · 통계 요약 · 회원 관리 · 운동 처방(각 회원 운동 삭제·변경 권한)"
> 브랜치: `feat/trainer-member-management`
> 이 문서는 **만들기 전 현황 검수**다. 구현은 사용자가 계획을 확정한 뒤 시작한다.

---

## 1. 지금 있는 것 (검수 결과)

### 1-1. 권한 모델

| 항목 | 현재 |
| --- | --- |
| 트레이너의 정체 | **`groups.owner_id` (그룹장) = 트레이너**. 별도 트레이너 역할 없음 |
| 회원의 정체 | `group_members` 행 (`role`: `owner` \| `member`) |
| 화면 진입 | `/groups/<id>/trainer` — 그룹장이 아니면 화면 자체를 안 줌 (`trainer-data.ts:getTrainerBoard`) |
| 유료 | `team_subscriptions` (`requested`/`active`…), `has_team_premium()` 존재. **회원 관리 화면은 아직 유료 게이팅 안 함** |

### 1-2. 이미 만들어진 트레이너 기능

| 기능 | 파일 | 상태 |
| --- | --- | --- |
| 회원 관리 보드(이번 주) | `src/app/groups/[id]/trainer/page.tsx`, `features/groups/components/trainer-board-view.tsx` | ✅ |
| 챙길 회원 판정·정렬(순수 로직) | `features/groups/trainer-board.ts` (+ `tests/be/logic/trainer-board.test.ts`) | ✅ |
| 주간 집계 RPC | `supabase/schema.sql` `trainer_board(group_id, from, to)` | ✅ |
| 회원 오늘 기록 상세 | `src/app/groups/[id]/member/[uid]/page.tsx` (`getGroupMemberDay`, `getGroupMemberWeeklyTraining`) | ✅ |
| 루틴 배정(일차 통째 복사) | `features/groups/trainer-actions.ts:assignRoutineDayAction` + RPC `trainer_assign_routine_day` | ✅ |
| 트레이너 코멘트 | `trainer_comments` 테이블 + `trainer-comment-form.tsx` | ✅ |
| 배정·코멘트 푸시 알림 | `trainer-actions.ts:notifyAssigned / notifyComment` | ✅ |
| 팀 요금제 신청 | `/groups/[id]/trainer/billing` | ✅ |

### 1-3. 재사용 가능한 통계 자산 (이미 있음 — 새로 짜면 안 됨)

- `features/routine/training-volume.ts` — `setsByRegion`, `setsBySubMuscle`, `trainingDaysByRegion`,
  `pushPullBalance`, `upperLowerBalance`, `lastTrainedByRegion`, `setsDelta`, 히트맵
- `features/routine/progress.ts` — `dailyVolumeSeries`, `weeklyVolumeSeries`, `oneRMSeries`,
  `topExercisesByVolume`, `personalRecords`, `trendPct`
- `features/home/dashboard-metrics.ts` — 잔디(`ContributionDay`, `levelForMinutes`)
- `features/calendar/data-access.ts` — 월 단위 섭취·소비·운동시간 집계
- `recharts` 이미 의존성에 있음

---

## 2. 검수에서 찾은 빈틈 (= 이번에 메울 것)

1. **기간이 "이번 주" 하나뿐.** 보드도 상세도 주간 고정(`weekRange`). 월·연 통계 없음.
   → 연/월/주 전환과 기간 집계가 통째로 없음.
2. **트레이너가 회원의 루틴 "내용"을 못 본다.** `trainer_member_routine` RPC 는
   `splits / variant_id / custom_week` (= 주 모양)만 준다. **회원이 무슨 운동을 몇 세트 하는지
   조회할 방법이 없다.** `routine_exercises` 는 RLS 가 본인 전용.
   → 운동 처방(삭제·변경)의 전제가 아예 비어 있다. **가장 큰 구멍.**
3. **처방이 "일차 통째 덮어쓰기" 하나뿐.** `trainer_assign_routine_day` 는 대상 일차를
   `delete` 후 내 루틴을 복사한다. 운동 **하나만 빼기 / 세트·횟수 바꾸기 / 하나만 추가**가 불가능.
4. **무게는 의도적으로 안 넘어간다**(`weight_kg` null 고정). 트레이너가 처방 무게를
   지정하려면 이 정책을 바꿔야 한다 → 결정 필요.
5. **"오늘만" 처방 경로가 없다.** 회원 본인은 `daily_plan`/`daily_conditioning` 으로
   오늘만 바꿀 수 있는데(원칙 2번), 트레이너는 **영구 루틴만** 건드린다.
6. **장기 통계에 필요한 표가 그룹원에게 안 열려 있다.**
   - 열림: `exercise_completions`, `conditioning_completions`, `food_logs`, `profiles`,
     `meal_photos`, `daily_run_distance`
   - 안 열림: `weight_logs`, `body_compositions`, `workout_sessions`, `daily_steps`, `user_routines`,
     `routine_exercises`, `daily_plan`
   → 연간 통계는 **`SECURITY DEFINER` 트레이너 전용 RPC** 로 가야 한다(그룹원 전체에게 열면
     친구 그룹에서 남의 체중·체성분이 새어 나간다 — `trainer_board` 주석의 그 이유).
7. **1년치를 행 단위로 끌어오면 안 된다.** 회원 10명 × 1년 = 수만 행. 집계는 DB 에서,
   화면에는 요약·시계열만 내려야 한다.
8. **트레이너가 그룹장 1명뿐.** 헬스장에 트레이너가 여러 명이면 현재 구조로는 못 쓴다 → 결정 필요.
9. **테스트 커버리지**: 순수 로직은 `trainer-board.test.ts` 만, E2E 는 `groups.spec.ts` 의
   회원 관리 진입·코멘트 정도. 처방 삭제/변경·기간 집계 테스트 없음.

---

## 3. 만들 기능 목록 (제안)

### A. 회원 통계 — 주 / 월 / 년

| # | 기능 | 구현 위치 |
| --- | --- | --- |
| A1 | 기간 전환 탭(주·월·년)과 이전/다음 기간 이동 | `/groups/[id]/member/[uid]` 상세를 트레이너용으로 확장 |
| A2 | 기간 경계 계산(주=월~일, 월=1일~말일, 년=1/1~12/31, 서울 기준) 순수 함수 | `features/groups/member-stats-range.ts` (신규) |
| A3 | 기간 집계 RPC `trainer_member_stats(group_id, member, from, to)` — 운동일수·총 세트·총 운동시간·소비kcal·식단 기록일수·평균 섭취kcal·체중 시작/끝/최저/최고·달성률 | `supabase/schema.sql` |
| A4 | 시계열 RPC `trainer_member_series(group_id, member, from, to, bucket)` — 일/주/월 버킷 (년=월 12칸, 월=일 28~31칸, 주=요일 7칸) | `supabase/schema.sql` |
| A5 | 부위별 세트 분포 + 푸시/풀·상하체 균형 (기존 `setsByRegion` 등 재사용) | `features/groups/member-stats.ts` (신규, 순수) |
| A6 | 차트 (막대: 기간별 운동일수/세트, 라인: 체중 추이) — `recharts` | `features/groups/components/member-stats-*.tsx` |

### B. 통계 요약 (한 줄 진단)

| # | 기능 |
| --- | --- |
| B1 | 요약 카드: 운동 n일 / 목표 대비 %, 총 n세트, 식단 기록 n일, 체중 ±n kg, 총 운동 n시간 |
| B2 | 직전 동일 기간과 비교(전주·전월·전년 대비 증감 %) — `setsDelta` 재사용 |
| B3 | 자동 코멘트 문장 생성(순수 함수): "하체 0세트 3주 연속", "체중 -2.4kg", "출석 62% → 81% 상승" |
| B4 | 요약을 **코멘트로 바로 보내기** (기존 `trainer_comments` 재사용) |

### C. 운동 처방 권한 (각 회원 운동 삭제·변경)

| # | 기능 | 핵심 |
| --- | --- | --- |
| C1 | **회원 루틴 조회 RPC** `trainer_member_plan(group_id, member, day_index)` | 회원의 `routine_exercises` 목록을 트레이너에게만 연다. **C2~C5 의 전제** |
| C2 | 운동 **삭제** `trainer_delete_member_exercise(group_id, member, exercise_row_id)` | 삭제 후 `position` 재정렬 |
| C3 | 운동 **변경** `trainer_update_member_exercise(...)` | sets·reps·(무게)·memo·운동 교체 |
| C4 | 운동 **추가** `trainer_add_member_exercise(...)` | 기존 카탈로그·`exercise-search-select` 재사용 |
| C5 | **순서 변경** | `position` 일괄 갱신 |
| C6 | 처방 화면 | `/groups/[id]/trainer/prescribe/[memberId]` (신규). 일차 선택 → 운동 목록 → 편집 |
| C7 | 변경 시 회원에게 푸시 알림 | 기존 `routine-assigned` 타입 재사용. **회원이 안 한 변경이라 필수** |
| C8 | 권한은 **DB 함수 안에서 다시 검사** | 그룹장 + 그 그룹 회원 + 자기 자신 아님. 서버 액션만 믿지 않음 |
| C9 | (선택) 변경 이력 `trainer_prescriptions` 로그 | 누가 언제 무엇을 바꿨는지 — 분쟁 방지 |

### D. 테스트 (CLAUDE.md 필수)

- 단위: `member-stats-range.test.ts`(기간 경계·윤년·연말), `member-stats.test.ts`(요약·증감·진단 문장),
  `trainer-prescribe.test.ts`(권한 분기·position 재정렬)
- 스키마: `pnpm test:schema` — 새 RPC/테이블은 **라이브 DB 에 반드시 적용**
- E2E: `tests/e2e/trainer-prescribe.spec.ts` — 트레이너가 회원 운동 삭제/변경 → **회원 화면에 반영**,
  비담당 트레이너는 차단
- 기존 `groups.spec.ts`·`trainer-board.test.ts` 도 변경분에 맞춰 갱신

---

## 4. 결정이 필요한 것

1. **트레이너 범위** — 그룹장 1명 유지 vs `group_members.role` 에 `trainer` 추가(헬스장 다중 트레이너)
2. **처방 적용 축** — 영구 루틴만 / 오늘만(`daily_plan`) / 둘 다 선택
3. **무게 처방** — 현재는 무게를 절대 안 넘김(안전 정책). 트레이너가 무게 지정 허용할지
4. **유료 게이팅** — 회원 관리·처방을 `has_team_premium()` 활성 팀만 쓰게 할지
