import Link from "next/link";

import { visibleApps } from "@/features/launcher/apps";

/**
 * 런처 격자 — 홈 맨 위의 앱 아이콘 판 (2026-09-20).
 *
 * 스마트폰 홈처럼, 작은 아이콘을 눌러 그 앱으로 들어간다. 들어가면 화면도
 * 하단 메뉴바도 그 앱 것으로 바뀐다(가운데 홈 칸만 그대로).
 *
 * 순서·숨김을 사용자가 편집하는 기능은 **1차엔 없다**(사용자 결정 2026-09-20).
 * 어떤 앱이 보일지는 `visibleApps()` 한 곳이 정한다.
 */
export function AppGrid({ enabledFlags = [] }: { enabledFlags?: readonly string[] }) {
  const apps = visibleApps(enabledFlags);
  return (
    <nav aria-label="앱" className="app-card p-3">
      <ul className="grid grid-cols-4 gap-x-1 gap-y-3">
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <li key={app.id}>
              <Link
                href={app.home}
                prefetch={false}
                data-app={app.id}
                className="flex flex-col items-center gap-1.5 rounded-xl py-1 transition-transform active:scale-90"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm ${app.tone}`}
                >
                  <Icon size={22} strokeWidth={1.9} />
                </span>
                <span className="max-w-full truncate px-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {app.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
