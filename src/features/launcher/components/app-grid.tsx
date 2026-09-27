"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Minus, Plus } from "lucide-react";
import { visibleApps } from "@/features/launcher/apps";
import { AppPickerDialog } from "@/features/launcher/app-picker-dialog";
import { HomeDockEditor } from "@/features/launcher/home-dock-editor";
import { useHydrated } from "@/lib/use-hydrated";

const CHANGE_EVENT = "launcher-apps-changed";
const serverSnapshot = () => "";
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** 홈 아이콘 선택은 계정별로 이 브라우저에 저장한다. 권한은 visibleApps가 결정한다. */
export function AppGrid({ userId, enabledFlags = [], initialEditing = false }: { userId: string; enabledFlags?: readonly string[]; initialEditing?: boolean }) {
  const [editing, setEditing] = useState(initialEditing);
  const [addingOpen, setAddingOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const hydrated = useHydrated();
  const storageKey = `helssu:home-hidden-apps:${userId}`;
  const stored = useSyncExternalStore(subscribe, () => {
    try { return localStorage.getItem(storageKey) ?? ""; } catch { return ""; }
  }, serverSnapshot);
  let hidden: string[] = [];
  try {
    const value: unknown = JSON.parse(stored);
    if (Array.isArray(value)) hidden = value.filter((id): id is string => typeof id === "string");
  } catch { /* 저장값이 없거나 손상됐으면 기본 앱 목록을 보여준다. */ }
  const available = visibleApps(enabledFlags);
  const apps = available.filter(app => !hidden.includes(app.id));
  const removed = available.filter(app => hidden.includes(app.id) || app.id === "trainer");

  function toggle(id: string, hide: boolean) {
    const next = hide ? [...new Set([...hidden, id])] : hidden.filter(value => value !== id);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setError(null);
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return true;
    } catch {
      setError("앱 구성을 저장하지 못했어요. 브라우저 저장 공간 설정을 확인해 주세요.");
      return false;
    }
  }

  function tile(app: (typeof available)[number], adding = false) {
    const Icon = app.icon;
    const content = <>
      <span aria-hidden="true" className={`relative flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm ${app.tone}`}>
        <Icon size={22} strokeWidth={1.9} />
        {(editing || adding) && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-white ring-2 ring-white dark:bg-zinc-200 dark:text-zinc-900 dark:ring-zinc-900">
          {adding ? <Plus size={14} /> : <Minus size={14} />}
        </span>}
      </span>
      <span className="max-w-full truncate px-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">{adding && app.id === "trainer" ? "트레이너 대시보드" : app.label}</span>
    </>;
    const className = "flex w-full flex-col items-center gap-1.5 rounded-xl py-1 transition-transform active:scale-90";
    return <li key={app.id}>
      {adding && app.id === "trainer" ? <Link href={app.home} prefetch={false} className={className} aria-label="트레이너 대시보드" onClick={() => toggle(app.id, false)}>{content}</Link> : editing || adding ? <button type="button" className={className} aria-label={`${app.label} ${adding ? "추가" : "숨기기"}`} onClick={() => { if (toggle(app.id, !adding) && adding) setAddingOpen(false); }}>{content}</button>
        : <Link href={app.home} prefetch={false} data-app={app.id} className={className}>{content}</Link>}
    </li>;
  }

  return (
    <nav id="home-apps" aria-label="앱" className="app-card space-y-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">내 앱</span>
        <button type="button" disabled={!hydrated} aria-pressed={editing} onClick={() => { setEditing(!editing); setAddingOpen(false); }} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-brand disabled:opacity-50">{editing ? "완료" : "편집"}</button>
      </div>
      {apps.length > 0 || editing ? <ul className="grid grid-cols-4 gap-x-1 gap-y-3">
        {apps.map(app => tile(app))}
        {editing && <li>
          <button type="button" aria-label="앱 추가" aria-expanded={addingOpen} aria-haspopup="dialog" onClick={() => setAddingOpen(!addingOpen)} className="flex w-full flex-col items-center gap-1.5 rounded-xl py-1 transition-transform active:scale-90">
            <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand shadow-sm ring-1 ring-inset ring-brand/20"><Plus size={24} strokeWidth={1.9} /></span>
          </button>
        </li>}
      </ul> : <p className="py-3 text-center text-sm text-muted">편집을 눌러 홈에 앱을 추가해 보세요.</p>}
      {editing && <p className="text-xs text-muted">아이콘을 눌러 홈에서 숨길 수 있어요. + 아이콘으로 다시 추가할 수 있어요.</p>}
      {editing && addingOpen && <AppPickerDialog onClose={() => setAddingOpen(false)}>
        {removed.length > 0
          ? <ul className="grid grid-cols-4 gap-x-1 gap-y-3">{removed.map(app => tile(app, true))}</ul>
          : <p className="py-5 text-center text-sm text-muted">추가할 수 있는 앱이 모두 홈에 있어요.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      </AppPickerDialog>}
      {editing && <HomeDockEditor userId={userId} apps={available} />}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </nav>
  );
}