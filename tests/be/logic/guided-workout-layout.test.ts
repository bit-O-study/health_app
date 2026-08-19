import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 운동모드(가이드 오버레이) 하단 버튼 바의 **줄 순서** 가드.
 *
 * 사용자 요청: 위쪽 줄 = 넘기기 / 완료, 아래쪽 줄 = 취소 / 세트 완료.
 * (반복해서 누르는 '세트 완료'가 엄지에 가장 가까운 맨 아래에 오게.)
 * 눈으로만 확인하면 다음 수정 때 다시 뒤집히기 쉬워 소스 순서로 회귀를 막는다.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../../../src");
const src = readFileSync(
  resolve(SRC, "features/workout-timer/guided-workout.tsx"),
  "utf8",
);

describe("운동모드 하단 버튼 바 순서", () => {
  const skipIdx = src.indexOf("onClick={skip}"); // 넘기기
  const completeIdx = src.indexOf("onClick={complete}"); // 완료
  const cancelSetIdx = src.indexOf("onClick={cancelSet}"); // 취소
  const completeSetIdx = src.indexOf("onClick={completeSet}"); // 세트 완료

  it("네 버튼이 모두 있다", () => {
    for (const i of [skipIdx, completeIdx, cancelSetIdx, completeSetIdx]) {
      expect(i).toBeGreaterThan(-1);
    }
    // 라벨도 그대로인지(E2E 셀렉터가 이름으로 찾는다)
    expect(src).toContain("세트 완료 취소");
    expect(src).toContain("세트 완료 · 휴식 ");
  });

  it("위쪽 줄이 '넘기기 → 완료' 다", () => {
    expect(skipIdx).toBeLessThan(completeIdx);
  });

  it("아래쪽 줄('취소 → 세트 완료')이 넘기기·완료보다 아래에 온다", () => {
    expect(completeIdx).toBeLessThan(cancelSetIdx);
    expect(cancelSetIdx).toBeLessThan(completeSetIdx);
  });
});
