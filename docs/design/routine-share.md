# 설계 — 루틴 소개(하루치 루틴 공유)

> 2026-08-11 · 상태: **구현 완료(1~4단계)** · 요청: `docs/requests/2026-08-11.md` (4)
> 읽기 좋은 보고서판: 대화에 첨부한 Artifact 참고.
>
> 코드: `src/features/routine-share/` (share.ts 순수로직 · data-access.ts · actions.ts ·
> components/{routine-share-board,share-day-button}.tsx)
> 테스트: `tests/be/logic/routine-share.test.ts`, `tests/e2e/routine-share.spec.ts`

내 루틴의 **한 일차**(예: 1일차 등)를 운동 순서·메모까지 올리면,
다른 사람이 **자기 루틴의 한 일차로 담아갈** 수 있게 한다.

## 1. 배치 결정

| 무엇 | 어디 |
|---|---|
| **공유하기**(내보내기) | **운동 탭** — 루틴 편집 화면, 일차 카드의 "이 일차 소개하기" |
| **둘러보기 / 담기** | **커뮤니티 탭** — `루틴` 세그먼트 신설 (현재 오운완/운동(티칭)/내 글 → 4칸) |

- **새 하단 탭은 만들지 않는다.** 이미 6개(+헬쑤쌤)라 7개째는 10px 라벨이 뭉개진다.
- 커뮤니티를 고른 이유: "남의 것을 본다"는 맥락이 이미 있고,
  `teaching_posts` 의 공개범위(`group`/`public`/`public_except_group`)·신고·좋아요 규칙을 그대로 재사용한다.
- 운동 탭에 피드를 두지 않는 이유: 운동 탭은 **오늘 할 일**을 보는 곳. 피드가 섞이면 오늘 운동이 밀린다.
- 그룹 탭 제외: 그룹 미가입자가 아예 못 본다.

## 2. 공유 단위 = "하루치"

| 묶음 | 담는 것 | 출처 |
|---|---|---|
| 머리말 | 일차 이름, 부위, 운동 수, 예상 소요·kcal, 한마디(200자) | 계산 + 작성자 입력 |
| 본운동 | **순서**, 운동, 기구, 세트, 횟수, **메모** | `routine_exercises` (day_index·position·memo) |
| 워밍업/마무리 | 순서, 항목, 시간·속도·경사 또는 세트·횟수, 메모 | `routine_conditioning` |
| 무게 | `weight_kg` | **기본 제외** — 토글로만 포함 |
| 개인 기록 | 완료 이력·지난 무게·체중 | **절대 제외** |

무게를 기본 제외하는 이유: 남의 100kg 스쿼트가 내 루틴에 그대로 들어오면 위험하고,
어차피 첫 세트에서 다시 고칠 값이다. 순서·세트·횟수·메모만으로 루틴은 재현된다.
포함 시 상세에 "작성자 기준" 명시.

## 3. 화면 흐름

1. **공유** — 운동 탭 › 루틴 편집 › 일차 카드 "소개하기" → 미리보기 시트(제목·한마디·무게 포함·공개범위) → 올리기
2. **둘러보기** — 커뮤니티 › `루틴` → 부위 칩(등·가슴·하체…) 필터. 카드에 **운동 이름 3개까지** 흘려 보여줘 목록에서 성격이 읽히게
3. **상세** — 운동 순서를 번호 리스트로, 메모는 운동 아래 노란 쪽지(메인 화면 메모와 같은 표현)
4. **담기** — "내 루틴에 담기" → **일차 선택 시트에서 일차 줄을 누르면 바로 담긴다**

일차 선택 시트:

- **줄 = 버튼.** 일차를 고르고 나서 또 "담기"를 누르는 두 번 손을 없앤다. 시트엔 취소만 둔다.
- 각 줄에 그 일차의 현재 상태를 적는다 — 비어 있으면 "그대로 채워집니다",
  차 있으면 "운동 N개 — 덮어씁니다"를 **빨간 글씨**로.
- **비어 있는 일차는 눌렀을 때 즉시 적용**, **차 있는 일차만** "N개를 덮어씁니다" 확인을 한 번 받는다.

## 4. 데이터

`routine_presets`(내 루틴 스냅샷을 `exercises`/`conditioning` jsonb 로 저장)가 이미 있다.
**같은 jsonb 모양을 재사용**하고 공개용 테이블만 새로 만든다 → 담기는 프리셋 적용 경로를 그대로 탄다.

```
routine_shares (신규)
  id, user_id, author_name, title, caption,
  focus_blocks jsonb, exercises jsonb, conditioning jsonb,
  include_weight bool, visibility, group_id, save_count, created_at
routine_share_likes (신규)  -- teaching_likes 복제
  share_id, user_id, created_at
```

`author_name` 은 **작성 시점 스냅샷** — 공개 피드에선 남의 `profiles` 를 RLS 로 못 읽는다
(`community_posts`·`teaching_posts` 와 같은 이유).

### 서버 액션

- `shareRoutineDayAction(dayIndex, {title, caption, includeWeight, visibility})`
  — 그 일차의 `routine_exercises`·`routine_conditioning` 을 읽어 jsonb 로 **복사(스냅샷)**.
  참조가 아니라 복사라, 내가 나중에 루틴을 고쳐도 올린 글은 안 바뀐다.
- `applyRoutineShareAction(shareId, targetDayIndex)`
  — 대상 일차의 기존 행을 지우고 스냅샷 삽입. `save_count` +1.
- `getRoutineSharesAction({focus, cursor})` — 커서 페이지네이션.

## 5. 지켜야 할 것

- ⚠ **담기는 "루틴"을 바꾼다 — "오늘만"이 아니다.**
  `docs/원칙.md` 2번(오늘만 변경은 영구 루틴을 안 건드림)의 반대 방향이라,
  시트 문구에 "**루틴이 바뀝니다**"를 넣고 확인을 받는다.
  (후속안: "오늘만 이 루틴으로 해보기" = `daily_plan` 에만 적용하는 옵션)
- ⚠ **DDL 은 수동.** `supabase/schema.sql` 수정 + 라이브 DB 적용 + `pnpm test:schema` 로 확인.

## 6. 만드는 순서

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | DDL(`routine_shares`·`routine_share_likes`·`bump_routine_share_saves`) + 순수 로직 + 단위테스트 | ✅ 라이브 DB 적용까지 완료 |
| 2 | 운동 등록(`/plan`) 일차 헤더 "소개하기" 시트 | ✅ |
| 3 | 커뮤니티 `루틴` 세그먼트 + 카드 + 부위 칩 | ✅ |
| 4 | 상세 + "담기" + 일차 선택 시트(줄 탭으로 바로 담기) | ✅ |
| 5 | 좋아요·담긴 수 + E2E(올리기→담기→내 루틴 확인) | ✅ 좋아요·담긴 수·E2E 완료 / 신고는 미구현 |

미구현(후속): 신고 버튼, 댓글, 커서 페이지네이션(지금은 최신 30개), 담김 푸시 알림.

## 7. 결정 필요

- 공개범위 기본값 — 전체공개 vs 그룹만
- 무게 포함 토글을 아예 없애고 항상 제외할지
- 여러 일차 묶음 공유(6일 통째로)를 나중에 넣을지 — 지금은 하루치만
- 담기면 작성자에게 푸시를 보낼지