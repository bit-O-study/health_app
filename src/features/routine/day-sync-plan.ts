/**
 * 일차별 day_index 동기화 '계획'(순수 함수 — server-only 아님 → 단위 테스트 가능).
 *
 * 루틴이 바뀌면 routine_exercises 의 day_index 가 새 루틴 일차와 어긋날 수 있다.
 * 이 모듈은 한 부위(focus)의 행들을 현재 루틴 일차에 맞추기 위한 '연산 목록'만
 * 계산한다(DB 접근 없음). 실제 적용(UPDATE/DELETE/INSERT)은 호출부가 한다.
 */

/** day_index NULL 을 내부 그룹 키로 표현 */
export const NULL_DAY_KEY = -1;

export type DaySyncOp =
  | { type: "move"; from: number; to: number } // from 일차의 행을 to 일차로(UUID 보존)
  | { type: "delete"; from: number } // from 일차의 행 삭제
  | { type: "copy"; from: number; to: number }; // from 일차의 행을 to 일차로 복제

/**
 * 한 부위의 일차 동기화 연산을 만든다.
 *
 * @param presentDays 이 부위 행이 존재하는 day_index 목록(중복 없음, NULL 은 NULL_DAY_KEY)
 * @param target      이 부위를 쓰는 일차(오름차순, NULL 없음)
 * @param isSide      target 일차의 역할 조회 — 주(主)=false / 보조(side)=true
 *
 * 규칙:
 *  1) target 이 아닌 일차(드리프트/legacy NULL)의 행은 비어 있는 target 으로 **이동**
 *     (UUID 보존 → 완료기록·편집 유지). 짝지을 빈 target 이 없으면 **삭제**(중복).
 *  2) 그래도 비어 있는 target 은 **같은 역할(주/보조)** 의 채워진 target 에서만 **복사**.
 *     본↔보조 교차 복사는 금지한다 — 1일차 보조에 2일차 본운동이 복제되어 본/보조가
 *     뒤바뀌어 보이던 버그 방지. (PPL×2 처럼 같은 역할로 반복되는 일차는 그대로 복사.)
 */
export function planFocusDaySync(
  presentDays: number[],
  target: number[],
  isSide: (day: number) => boolean,
): DaySyncOp[] {
  const ops: DaySyncOp[] = [];
  if (target.length === 0) return ops;

  const targetSet = new Set(target);
  const present = new Set(presentDays);
  const orphans = presentDays.filter((d) => !targetSet.has(d));
  const emptyTargets = target.filter((d) => !present.has(d));
  // 이미 행이 있는 target + 이번에 이동으로 채워질 target 을 추적(복사 소스 후보).
  const filled = new Set(presentDays.filter((d) => targetSet.has(d)));

  // 1) 드리프트 행 → 빈 target 으로 이동
  let oi = 0;
  let ti = 0;
  for (; oi < orphans.length && ti < emptyTargets.length; oi++, ti++) {
    ops.push({ type: "move", from: orphans[oi], to: emptyTargets[ti] });
    filled.add(emptyTargets[ti]);
  }
  // 2) 남은 드리프트 행 → 삭제
  for (; oi < orphans.length; oi++) {
    ops.push({ type: "delete", from: orphans[oi] });
  }
  // 3) 아직 빈 target → 같은 역할의 채워진 target 에서만 복사
  const stillEmpty = emptyTargets.slice(ti);
  for (const t of stillEmpty) {
    const canon = target.find(
      (d) => d !== t && filled.has(d) && isSide(d) === isSide(t),
    );
    if (canon !== undefined) ops.push({ type: "copy", from: canon, to: t });
    // 같은 역할의 채워진 일차가 없으면 비워 둔다(사용자가 직접 등록).
  }
  return ops;
}