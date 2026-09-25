"use client";

import { useState, useSyncExternalStore } from "react";
import { DEFAULT_DOCK_IDS, normalizeDock, placeDockApp } from "./home-preferences";

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

export function useHomeDock(userId: string) {
  const key = `helssu:home-dock:${userId}`;
  const [error, setError] = useState<string | null>(null);
  const stored = useSyncExternalStore(subscribe, () => {
    try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
  }, serverSnapshot);
  let ids: (string | null)[] = [...DEFAULT_DOCK_IDS];
  try { ids = normalizeDock(JSON.parse(stored)); } catch { /* 기본 바로가기 */ }
  function setSlot(index: number, id: string | null) {
    const next = id === null ? ids.map((current, i) => i === index ? null : current) : placeDockApp(ids, id, index);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setError(null);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      setError("하단 앱 구성을 저장하지 못했어요. 브라우저 저장 공간 설정을 확인해 주세요.");
    }
  }
  return { ids, setSlot, error };
}