"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Home, Minus, Plus } from "lucide-react";
import { visibleApps } from "./apps";
import { useHomeDock } from "./use-home-dock";

type App = ReturnType<typeof visibleApps>[number];
type Drag = { id: string; x: number; y: number; target: number | null };

export function HomeDockEditor({ userId, apps }: { userId: string; apps: App[] }) {
  const dock = useHomeDock(userId);
  const root = useRef<HTMLElement>(null);
  const pointer = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const activeApp = apps.find(app => app.id === (drag?.id ?? selected));

  function targetAt(x: number, y: number) {
    const target = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-dock-slot]");
    return target && root.current?.contains(target) ? Number(target.dataset.dockSlot) : null;
  }
  function place(id: string, target: number) {
    dock.setSlot(target, id);
    setSelected(null);
    setNotice(`${apps.find(app => app.id === id)?.label} 앱을 ${target + 1}번 자리에 배치했어요.`);
  }
  function start(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    pointer.current = { id, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = pointer.current;
    if (!current) return;
    if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6) return;
    current.moved = true;
    setDrag({ id: current.id, x: event.clientX, y: event.clientY, target: targetAt(event.clientX, event.clientY) });
  }
  function finish(event: PointerEvent<HTMLButtonElement>) {
    const current = pointer.current;
    pointer.current = null;
    setDrag(null);
    if (!current?.moved) return;
    suppressClick.current = true;
    const target = targetAt(event.clientX, event.clientY);
    if (target !== null) place(current.id, target);
  }
  function click(id: string | null, slot?: number, keyboard = false) {
    if (suppressClick.current) { suppressClick.current = false; if (!keyboard) return; }
    if (selected && slot !== undefined) place(selected, slot);
    else setSelected(id);
  }
  const handlers = (id: string) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => start(event, id),
    onPointerMove: move,
    onPointerUp: finish,
    onPointerCancel: () => { pointer.current = null; setDrag(null); suppressClick.current = true; },
  });
  function icon(app: App, small = false) {
    const Icon = app.icon;
    return <span aria-hidden="true" className={`flex ${small ? "h-10 w-10" : "h-12 w-12"} items-center justify-center rounded-2xl text-white shadow-sm ${app.tone}`}><Icon size={small ? 20 : 22} /></span>;
  }
  return <section ref={root} aria-label="하단 바로가기 편집" className="space-y-4 border-t border-line pt-3" onKeyDown={event => { if (event.key === "Escape") { pointer.current = null; setDrag(null); setSelected(null); } }}>
    <h2 className="text-sm font-semibold">하단 바로가기</h2>
    <p className="text-xs text-muted">앱을 끌어 원하는 자리에 놓으세요. 가운데 홈은 고정이에요.</p>
    <div className="grid grid-cols-5 gap-1 rounded-2xl bg-surface p-2 ring-1 ring-line">
      {[0, 1, "home", 2, 3].map(slot => {
        if (slot === "home") return <div key="home" aria-label="가운데 홈 고정" className="flex flex-col items-center gap-1 pt-1 text-brand"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10"><Home size={22} /></span><span className="text-xs">홈</span></div>;
        const index = slot as number;
        const app = apps.find(app => app.id === dock.ids[index]);
        return <div key={index} data-dock-slot={index} className={`relative min-w-0 rounded-xl ${drag?.target === index ? "bg-brand/15 ring-2 ring-brand" : ""}`}>
          <button type="button" aria-label={`하단 ${index + 1}번 자리: ${app?.label ?? "빈칸"}`} aria-pressed={!!app && selected === app.id} className={`flex min-h-16 w-full touch-none select-none flex-col items-center gap-1 rounded-xl py-1 ${app ? "cursor-grab active:cursor-grabbing" : ""} ${app && selected === app.id ? "ring-2 ring-brand" : ""}`} {...(app ? handlers(app.id) : {})} style={{ touchAction: "none" }} onClick={event => click(app?.id ?? null, index, event.detail === 0)}>
            {app ? icon(app, true) : <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-dashed border-line text-muted"><Plus size={20} /></span>}
            <span className="w-full truncate text-center text-xs">{app?.label ?? "빈칸"}</span>
          </button>
          {app && <button type="button" aria-label={`${app.label} 바로가기 제거`} onClick={() => { dock.setSlot(index, null); setSelected(null); }} className="absolute -right-2 -top-3 flex h-8 w-8 items-center justify-center rounded-full"><span className="rounded-full bg-foreground p-0.5 text-background"><Minus size={14} /></span></button>}
        </div>;
      })}
    </div>
    <div className="grid grid-cols-4 gap-3" aria-label="배치할 앱">
      {apps.map(app => <button key={app.id} type="button" aria-label={`${app.label} 배치`} aria-pressed={selected === app.id} className={`flex touch-none select-none flex-col items-center gap-1 rounded-xl py-1 cursor-grab active:cursor-grabbing ${selected === app.id ? "ring-2 ring-brand" : ""}`} {...handlers(app.id)} style={{ touchAction: "none" }} onClick={event => click(app.id, undefined, event.detail === 0)}>
        {icon(app)}<span className="max-w-full truncate text-xs">{app.label}</span>
      </button>)}
    </div>
    <p role="status" className="text-xs text-muted">{selected && activeApp ? `${activeApp.label}: 놓을 자리를 선택하세요. Esc로 취소할 수 있어요.` : notice || "앱을 누른 뒤 자리를 눌러 배치할 수도 있어요."}</p>
    {dock.error && <p role="alert" className="text-sm text-danger">{dock.error}</p>}
    {drag && activeApp && <div aria-hidden="true" className="pointer-events-none fixed z-[100] opacity-90" style={{ left: drag.x - 24, top: drag.y - 24 }}>{icon(activeApp)}</div>}
  </section>;
}