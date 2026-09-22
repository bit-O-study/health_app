"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Settings } from "lucide-react";
import { visibleApps } from "./apps";


export function AppGrid({ showCoach, searching = false }: { showCoach: boolean; searching?: boolean }) {
  const [query, setQuery] = useState("");
  const apps = visibleApps(showCoach ? ["helssu-coach"] : []).filter(app => app.label.includes(query.trim()));
  return <section aria-label="앱 런처" className="space-y-4">
    {searching && <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900">
      <Search size={18} aria-hidden="true" className="text-zinc-400" />
      <input autoFocus type="search" aria-label="앱 검색" placeholder="어떤 앱을 찾으세요?" value={query} onChange={e => setQuery(e.target.value)} className="h-12 w-full bg-transparent text-sm outline-none" />
    </label>}
    <div className="grid grid-cols-4 gap-x-2 gap-y-6 rounded-[24px] border border-zinc-200/80 bg-white px-3 py-6 dark:border-zinc-800 dark:bg-[#141c18]">
      {apps.map(app => { const Icon = app.icon; return <Link key={app.id} href={app.home} prefetch={false} aria-label={app.label + " 앱 열기"} className="group flex min-h-20 flex-col items-center gap-2 rounded-xl focus-visible:outline-2 focus-visible:outline-emerald-600">
        <span className={"flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br text-white shadow-md transition-transform group-active:scale-95 " + app.tone}><Icon aria-hidden="true" size={28} strokeWidth={1.7} /></span>
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{app.label}</span>
      </Link>; })}
      {!query && <Link href="/settings" aria-label="설정 열기" className="flex min-h-20 flex-col items-center gap-2"><span className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-dashed border-zinc-300 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"><Settings size={26} aria-hidden="true" /></span><span className="text-xs font-semibold text-zinc-500">설정</span></Link>}
    </div>
    {query && !apps.length && <p role="status" className="py-3 text-center text-sm text-zinc-500">찾는 앱이 없어요. 앱 이름을 다시 입력해 주세요.</p>}
  </section>;
}
