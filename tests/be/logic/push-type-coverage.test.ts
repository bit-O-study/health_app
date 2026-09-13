import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  PUSH_TYPE_TO_KIND,
  kindForPushType,
} from "@/features/notifications/preferences";

/**
 * 푸시 발송 전수 가드 — 2026-09-09.
 *
 * 🔴 알림을 새로 만들 때 **두 군데를 조용히 빠뜨릴 수 있다.**
 *  1. `PUSH_TYPE_TO_KIND` 에 안 넣으면 → **설정에서 못 끄는 알림**이 된다.
 *  2. 부르는 쪽이 `decideSend` 를 안 하면 → 설정 스위치가 **장식**이 된다.
 *     (`notifyUser`/`notifyDevices` 는 일부러 설정을 안 본다 — 크론이 수백 명을
 *      한 번에 거르는 구조라 판단이 부르는 쪽에 있다.)
 *
 * 둘 다 **화면에는 아무 이상이 없다.** 사용자가 "껐는데 계속 온다"고 말해 줘야 안다.
 * 실제로 그룹 응원 알림이 이 상태로 한동안 나가고 있었다(2026-09-09 발견).
 *
 * 그래서 발송 호출부를 소스에서 훑어 **전수로** 검사한다.
 */

const ROOTS = ["src/features", "src/app"];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/** 발송 호출부와 그 파일 — `notifyUser(`/`notifyDevices(` 뒤에 오는 `type: "..."`. */
function findSendSites(): { file: string; type: string }[] {
  const sites: { file: string; type: string }[] = [];
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      if (file.includes("push-fanout")) continue; // 정의부는 제외
      const src = readFileSync(file, "utf8");
      // ⚠ 괄호로 잘라내면 안 된다 — `notifyDevices(admin, devices.get(uid), {…})` 의
      //    `devices.get(uid)` 닫는 괄호에서 끊겨 정작 `type:` 을 놓친다(실제로 놓쳤다).
      //    호출 위치 뒤 일정 구간에서 **첫 `type:`** 만 집는다.
      for (const m of src.matchAll(/notify(?:User|Devices)\(/g)) {
        const window = src.slice(m.index ?? 0, (m.index ?? 0) + 900);
        const t = window.match(/type:\s*"([a-z0-9-]+)"/);
        if (t) sites.push({ file, type: t[1] });
      }
    }
  }
  return sites;
}

describe("푸시 발송 전수", () => {
  const sites = findSendSites();

  it("발송 호출부를 찾았다 — 못 찾으면 이 가드가 아무것도 안 지킨다", () => {
    // 헬퍼 이름이 바뀌면 정규식이 0건을 찾고, 그러면 아래 검사가 전부 공회전한다.
    expect(sites.length).toBeGreaterThanOrEqual(4);
  });

  it("🔴 모든 발송 타입이 알림 종류로 이어져 있다 — 아니면 설정에서 못 끈다", () => {
    for (const s of sites) {
      expect(
        kindForPushType(s.type),
        `${s.file}: 푸시 타입 "${s.type}" 이 PUSH_TYPE_TO_KIND 에 없다 → 사용자가 못 끈다`,
      ).not.toBeNull();
    }
  });

  it("🔴 발송하는 파일은 설정(decideSend)이나 filterByPreference 를 거친다", () => {
    // 크론은 여러 명을 한 번에 거르고(filterByPreference), 단건은 decideSend 를 쓴다.
    for (const file of new Set(sites.map((s) => s.file))) {
      const src = readFileSync(file, "utf8");
      expect(
        /decideSend\(|filterByPreference\(/.test(src),
        `${file}: 설정을 안 보고 보낸다 → 설정 화면의 스위치가 장식이 된다`,
      ).toBe(true);
    }
  });

  it("종류 표에 죽은 타입이 없다 — 안 쓰는 매핑은 지운다", () => {
    const used = new Set(sites.map((s) => s.type));
    // 리마인더는 payload 표(daily-reminder.ts)에 있어 위 정규식에 안 잡힌다.
    const known = new Set([...used, "reminder-workout", "reminder-diet"]);
    for (const type of Object.keys(PUSH_TYPE_TO_KIND)) {
      expect(known.has(type), `"${type}" 은 아무도 안 보낸다`).toBe(true);
    }
  });
});
