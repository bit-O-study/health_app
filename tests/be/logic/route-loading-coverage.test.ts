import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 라우트 전환 로딩 표시 커버리지 가드.
 *
 * 서버에서 데이터를 읽는 화면에 `loading.tsx` 가 없으면, 탭을 눌러도 **아무 반응 없이**
 * 이전 화면이 그대로 서 있다. 사용자는 안 눌렸다고 생각해 또 누른다 — 느린 동작에는
 * 로딩 표시를 둔다는 이 프로젝트 원칙이 정확히 이 자리 얘기다.
 *
 * `loading.tsx` 는 **그 세그먼트와 하위 전체**를 덮으므로, 조상 중 하나만 있으면 된다
 * (`/settings/loading.tsx` 하나가 `/settings/*` 를 다 덮는다).
 */

const APP = join(process.cwd(), "src", "app");

/**
 * 로딩 표시가 필요 없는 화면.
 * - `admin/*` — 운영자용. 사용자 체감 대상이 아니다
 * - 인증·정적 화면 — 서버 왕복이 없거나(정적) 폼 자체가 즉시 뜬다
 */
const EXEMPT = new Set([
  "/",
  "/admin",
  "/account-deletion",
  "/change-password",
  "/find-id",
  "/find-password",
  "/login",
  "/onboarding",
  "/privacy",
  "/suspended",
]);

/** `src/app` 아래 모든 라우트를 `{ route, dir }` 로 모은다. */
function routes(dir: string, route = ""): { route: string; dir: string }[] {
  const out: { route: string; dir: string }[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    // (group) 세그먼트는 URL 에 안 나타난다 — 이 앱엔 아직 없지만 방어.
    const seg = name.startsWith("(") ? "" : `/${name}`;
    const child = route + seg;
    if (readdirSync(full).includes("page.tsx")) out.push({ route: child, dir: full });
    out.push(...routes(full, child));
  }
  return out;
}

/** 이 디렉터리 또는 조상에 loading.tsx 가 있는가. */
function covered(dir: string): boolean {
  let cur = dir;
  while (cur.startsWith(APP)) {
    if (readdirSync(cur).includes("loading.tsx")) return true;
    if (cur === APP) break;
    cur = join(cur, "..");
  }
  return false;
}

describe("라우트 로딩 표시", () => {
  const all = routes(APP);

  it("라우트를 실제로 찾아냈다 (탐색이 조용히 비면 가드가 무의미해진다)", () => {
    expect(all.length).toBeGreaterThan(40);
  });

  it("사용자 화면은 전부 loading.tsx 로 덮여 있다", () => {
    const missing = all
      .filter((r) => !r.route.startsWith("/admin") && !EXEMPT.has(r.route))
      .filter((r) => !covered(r.dir))
      .map((r) => r.route);

    expect(
      missing,
      `loading.tsx 없는 화면:\n  ${missing.join("\n  ")}\n` +
        "→ 해당 세그먼트(또는 상위)에 loading.tsx 를 추가하거나, 정말 필요 없으면 EXEMPT 에 적을 것.",
    ).toEqual([]);
  });

  it("면제 목록은 실재하는 라우트만 담는다 (지운 화면이 남으면 가드가 헐거워진다)", () => {
    const known = new Set(all.map((r) => r.route));
    known.add("/");
    for (const route of EXEMPT) expect(known.has(route), `${route} 없음`).toBe(true);
  });
});
