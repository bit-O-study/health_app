import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 라우트 전환 로딩 표시 커버리지 가드.
 *
 * 서버에서 데이터를 읽는 화면에 `loading.tsx` 가 없으면 탭을 눌러도 **아무 반응이 없다**
 * — 사용자는 안 눌린 줄 알고 다시 누른다. 예전엔 63개 라우트 중 21개에만 있었다.
 * 새 화면을 만들면서 빠뜨리면 여기서 걸린다.
 */

const APP = join(process.cwd(), "src", "app");

/**
 * 로딩 표시가 필요 없는 화면 — 서버 조회가 없어 즉시 그려진다.
 * 여기에 새로 넣을 땐 **정말 await 이 없는지** 확인하고 넣는다.
 */
const STATIC_ROUTES = new Set(["/privacy", "/account-deletion"]);

/** 루트(`/`)는 로그인 여부만 보고 리다이렉트한다 — 여기에 loading 을 두면 모든 하위로 번진다. */
const ROOT = "/";

function routesWithPages(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      out.push(...routesWithPages(p));
    } else if (name === "page.tsx") {
      const rel = relative(APP, dir).split(sep).join("/");
      out.push(rel === "" ? ROOT : `/${rel}`);
    }
  }
  return out;
}

function hasLoading(route: string): boolean {
  const dir = route === ROOT ? APP : join(APP, route.slice(1).split("/").join(sep));
  return readdirSync(dir).includes("loading.tsx");
}

function pageSource(route: string): string {
  const dir = route === ROOT ? APP : join(APP, route.slice(1).split("/").join(sep));
  return readFileSync(join(dir, "page.tsx"), "utf8");
}

describe("route loading coverage", () => {
  const routes = routesWithPages(APP);

  it("라우트를 실제로 찾았다 (가드가 빈손으로 통과하지 않게)", () => {
    expect(routes.length).toBeGreaterThan(50);
  });

  it("서버 조회가 있는 화면에는 loading.tsx 가 있다", () => {
    const missing = routes.filter(
      (r) => r !== ROOT && !STATIC_ROUTES.has(r) && !hasLoading(r),
    );
    expect(missing).toEqual([]);
  });

  it("예외 목록은 정말 서버 조회가 없는 화면만 담는다", () => {
    for (const r of STATIC_ROUTES) {
      expect(routes, `${r} 는 더 이상 존재하지 않는다 — 예외 목록에서 지울 것`).toContain(r);
      expect(pageSource(r), `${r} 에 await 이 생겼다 — loading.tsx 를 추가할 것`).not.toMatch(
        /\bawait\b/,
      );
    }
  });

  it("모든 loading.tsx 는 공통 RouteLoading 을 쓴다", () => {
    for (const r of routes) {
      if (!hasLoading(r)) continue;
      const dir = r === ROOT ? APP : join(APP, r.slice(1).split("/").join(sep));
      const src = readFileSync(join(dir, "loading.tsx"), "utf8");
      expect(src, `${r}/loading.tsx`).toContain("RouteLoading");
    }
  });
});
