"use client";

import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { Home, Minus, Plus } from "lucide-react";
import { visibleApps } from "./apps";
import { useHomeDock } from "./use-home-dock";

type App = ReturnType<typeof visibleApps>[number];
type Drag = { id: string; x: number; y: number; target: number | null };

/**
 * 하단바 자리 배치 — '내 앱' 아이콘을 끌어 아래 하단바 미리보기에 놓는다(2026-10-08).
 * 예전엔 미리보기 밑에 앱 목록을 한 벌 더 그려 그걸 끌어야 했다 — 내 앱에서 바로 끌게 해 달라는 요청.
 * 끌기(마우스·터치) 말고도 '앱을 누르고 → 자리를 누르기'(키보드 Enter 포함)로 놓을 수 있다.
 */
export function useDockPlacement(userId: string, apps: readonly App[]) {
  const dock = useHomeDock(userId);
  const root = useRef<HTMLElement>(null);
  const pointer = useRef<{ id: string; x: number; y: number; moved: boolean; touchHold: boolean; armed: boolean; timer: ReturnType<typeof setTimeout> | null } | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const activeApp = apps.find(app => app.id === (drag?.id ?? selected));

  // 꾹 눌러 끌기가 시작된 뒤에는 화면이 같이 스크롤되지 않게 — 그 전에는 평소처럼 스크롤.
  useEffect(() => {
    const block = (e: TouchEvent) => { if (pointer.current?.armed) e.preventDefault(); };
    window.addEventListener("touchmove", block, { passive: false });
    return () => window.removeEventListener("touchmove", block);
  }, []);

  function targetAt(x: number, y: number) {
    const target = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-dock-slot]");
    return target && root.current?.contains(target) ? Number(target.dataset.dockSlot) : null;
  }
  function place(id: string, target: number) {
    dock.setSlot(target, id);
    setSelected(null);
    setNotice(`${apps.find(app => app.id === id)?.label} 앱을 하단 ${target + 1}번 자리에 놓았어요.`);
  }
  function clear() {
    if (pointer.current?.timer) clearTimeout(pointer.current.timer);
    pointer.current = null;
  }
  /** holdOnTouch — 내 앱 아이콘처럼 화면 스크롤과 겹치는 곳은 터치로 꾹 눌러야(약 0.35초) 끌린다. */
  function start(event: PointerEvent<HTMLButtonElement>, id: string, holdOnTouch: boolean) {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    clear();
    const touchHold = holdOnTouch && event.pointerType === "touch";
    const target = event.currentTarget;
    const pointerId = event.pointerId;
    const current = { id, x: event.clientX, y: event.clientY, moved: false, touchHold, armed: !touchHold, timer: null as ReturnType<typeof setTimeout> | null };
    pointer.current = current;
    if (touchHold) {
      current.timer = setTimeout(() => {
        if (pointer.current !== current) return;
        current.armed = true;
        try { target.setPointerCapture(pointerId); } catch { /* 손을 이미 뗐다 */ }
        navigator.vibrate?.(10);
        setDrag({ id, x: current.x, y: current.y, target: null });
      }, 350);
    } else {
      target.setPointerCapture(pointerId);
    }
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = pointer.current;
    if (!current) return;
    const far = Math.hypot(event.clientX - current.x, event.clientY - current.y) >= 6;
    // 꾹 누르기 전에 손가락이 움직였으면 스크롤하려는 것 — 끌기를 접는다.
    if (!current.armed) { if (far) clear(); return; }
    if (!current.moved && !far && !current.touchHold) return;
    current.moved = true;
    setDrag({ id: current.id, x: event.clientX, y: event.clientY, target: targetAt(event.clientX, event.clientY) });
  }
  function finish(event: PointerEvent<HTMLButtonElement>) {
    const current = pointer.current;
    clear();
    setDrag(null);
    if (!current?.moved) return;
    suppressClick.current = true;
    const target = targetAt(event.clientX, event.clientY);
    if (target !== null) place(current.id, target);
  }
  /** 앱(또는 자리에 있는 앱)을 눌렀을 때 — 고른 앱이 있고 자리를 눌렀으면 놓고, 아니면 고른다. */
  function click(id: string | null, slot?: number, keyboard = false) {
    if (suppressClick.current) { suppressClick.current = false; if (!keyboard) return; }
    if (selected && slot !== undefined) place(selected, slot);
    else setSelected(selected === id ? null : id);
  }
  /** opts.holdOnTouch — 내 앱 아이콘(스크롤 영역)은 터치 스크롤을 막지 않고 꾹 눌러 끈다. 하단바 자리는 바로 끈다. */
  const handlers = (id: string, opts: { holdOnTouch?: boolean } = {}) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => start(event, id, !!opts.holdOnTouch),
    onPointerMove: move,
    onPointerUp: finish,
    onPointerCancel: () => { clear(); setDrag(null); suppressClick.current = true; },
    onContextMenu: opts.holdOnTouch ? (event: { preventDefault: () => void }) => event.preventDefault() : undefined,
    style: { touchAction: opts.holdOnTouch ? ("manipulation" as const) : ("none" as const) },
  });
  function cancel() { clear(); setDrag(null); setSelected(null); }
  return { dock, root, drag, selected, activeApp, notice, handlers, click, cancel };
}

export type DockPlacement = ReturnType<typeof useDockPlacement>;

export function appIcon(app: App, small = false) {
  const Icon = app.icon;
  return <span aria-hidden="true" className={`flex ${small ? "h-10 w-10" : "h-12 w-12"} items-center justify-center rounded-2xl text-white shadow-sm ${app.tone}`}><Icon size={small ? 20 : 22} /></span>;
}

/** 하단바 미리보기(4자리 + 가운데 홈) — 내 앱 아이콘을 여기로 끌어 놓는다. */
export function HomeDockEditor({ apps, placement }: { apps: App[]; placement: DockPlacement }) {
  const { dock, root, drag, selected, activeApp, notice, handlers, click, cancel } = placement;
  return <section ref={root as RefObject<HTMLElement>} aria-label="하단 바로가기 편집" className="space-y-3 border-t border-line pt-3" onKeyDown={event => { if (event.key === "Escape") cancel(); }}>
    <h2 className="text-sm font-semibold">하단 바로가기</h2>
    <p className="sentences text-xs text-muted"><span>위 내 앱 아이콘을 끌어 아래 자리에 놓으세요.</span><span>빈 자리는 하단바에서 빠지고, 같은 쪽 앱이 홈 쪽으로 당겨져요.</span><span>가운데 홈은 고정이에요.</span></p>
    <div className="grid grid-cols-5 gap-1 rounded-2xl bg-surface p-2 ring-1 ring-line">
      {[0, 1, "home", 2, 3].map(slot => {
        if (slot === "home") return <div key="home" aria-label="가운데 홈 고정" className="flex flex-col items-center gap-1 pt-1 text-brand"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10"><Home size={22} /></span><span className="text-xs">홈</span></div>;
        const index = slot as number;
        const app = apps.find(app => app.id === dock.ids[index]);
        return <div key={index} data-dock-slot={index} className={`relative min-w-0 rounded-xl ${drag?.target === index ? "bg-brand/15 ring-2 ring-brand" : ""}`}>
          <button type="button" aria-label={`하단 ${index + 1}번 자리: ${app?.label ?? "빈칸"}`} aria-pressed={!!app && selected === app.id} className={`flex min-h-16 w-full touch-none select-none flex-col items-center gap-1 rounded-xl py-1 ${app ? "cursor-grab active:cursor-grabbing" : ""} ${app && selected === app.id ? "ring-2 ring-brand" : ""} ${selected && !app ? "ring-2 ring-dashed ring-brand/50" : ""}`} {...(app ? handlers(app.id) : { style: { touchAction: "none" as const } })} onClick={event => click(app?.id ?? null, index, event.detail === 0)}>
            {app ? appIcon(app, true) : <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-dashed border-line text-muted"><Plus size={20} /></span>}
            <span className="w-full truncate text-center text-xs">{app?.label ?? "빈칸"}</span>
          </button>
          {app && <button type="button" aria-label={`${app.label} 바로가기 제거`} onClick={() => { dock.setSlot(index, null); cancel(); }} className="absolute -right-2 -top-3 flex h-8 w-8 items-center justify-center rounded-full"><span className="rounded-full bg-foreground p-0.5 text-background"><Minus size={14} /></span></button>}
        </div>;
      })}
    </div>
    <p role="status" className="text-xs text-muted">{selected && activeApp ? `${activeApp.label}: 놓을 자리를 누르세요. Esc로 취소할 수 있어요.` : notice || "앱을 누른 뒤 자리를 눌러 놓을 수도 있어요."}</p>
    {dock.error && <p role="alert" className="text-sm text-danger">{dock.error}</p>}
    {drag && activeApp && <div aria-hidden="true" className="pointer-events-none fixed z-[100] opacity-90" style={{ left: drag.x - 24, top: drag.y - 24 }}>{appIcon(activeApp)}</div>}
  </section>;
}
