import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * 런닝 2단계 소스 가드 — 실내 런닝은 카메라가 필요해 E2E 가 달리는 화면까지 못 간다.
 * 야외와 같은 규칙(꾹 눌러 종료 · 일시정지 · 멈춘 시간 제외 · 카운트다운 · 화면 켜짐)을 소스로 지킨다.
 */
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../../../src/features/running");
const indoor = readFileSync(resolve(SRC, "running-game.tsx"), "utf8");
const outdoor = readFileSync(resolve(SRC, "outdoor-run.tsx"), "utf8");

describe.each([
  ["실내", indoor],
  ["야외", outdoor],
])("%s 런닝", (_name, src) => {
  it("종료는 꾹 눌러서만 — 한 번 탭으로 끝나는 종료 버튼이 없다", () => {
    expect(src).toContain("<HoldToEnd onConfirm={finish} />");
    expect(src).not.toMatch(/onClick=\{finish\}/);
  });
  it("카운트다운 뒤 시작, 달리는 동안 화면 켜짐 유지", () => {
    expect(src).toContain("<RunCountdown");
    expect(src).toMatch(/useWakeLock\(phase === "playing"/);
  });
  it("저장 시간에서 멈춘 시간을 뺀다 — 시작 = 끝 − 달린 시간", () => {
    expect(src).toContain("activeElapsedMs(");
    expect(src).toContain("startedAt: new Date(endedAt - activeMs).toISOString()");
  });
});

describe("야외만", () => {
  it("3D 캐릭터는 켰을 때만, 달리는 중에만 그린다(종료 화면 X)", () => {
    expect(outdoor).toContain('showScene && phase === "playing"');
  });
  it("자동 일시정지와 지금 페이스", () => {
    expect(outdoor).toContain('pause("auto")');
    expect(outdoor).toContain("recentPaceSecPerKm(");
  });
});
