"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** 서버 HTML이 보이더라도 이벤트 핸들러가 연결되기 전에는 조작을 막는다. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}