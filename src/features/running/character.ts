/**
 * 런닝 캐릭터(3D 모델) 설정 — 한 곳에서 관리해 교체가 쉽게.
 *
 * 캐릭터를 바꾸려면: 새 .glb 를 public/models/ 에 넣고 아래 CHARACTER_MODEL_URL 만 바꾼다.
 * (Mixamo 러너 받는 법은 docs/RUNNING-CHARACTER.md 참고.)
 *
 * ⚠ Mixamo 등은 클립 이름이 제각각("mixamo.com", "Armature|Run", "Running" 등)이라,
 *   pickClipName 이 이름을 유연하게 매칭한다. 이상적으로는 클립을 'Idle'·'Run' 으로
 *   이름 붙여 합치면 가장 확실하다.
 */

export const CHARACTER_MODEL_URL = "/models/runner-robot.glb";

const RUN_RX = /run|jog|sprint/i;
const IDLE_RX = /idle|stand|breath|t[-_ ]?pose|rest/i;

/**
 * 애니메이션 클립 이름 목록에서 원하는 종류(run/idle)에 가장 맞는 이름을 고른다.
 * 없으면: run 은 'idle 아닌 첫 클립'→첫 클립, idle 은 null(정지 폴백은 호출부에서).
 */
export function pickClipName(
  names: string[],
  kind: "run" | "idle",
): string | null {
  if (kind === "run") {
    return (
      names.find((n) => RUN_RX.test(n)) ??
      names.find((n) => !IDLE_RX.test(n)) ??
      names[0] ??
      null
    );
  }
  return names.find((n) => IDLE_RX.test(n)) ?? null;
}
