"use client";

import { useSyncExternalStore } from "react";
import { isNativeApp } from "@/lib/platform/is-native-app";

const subscribe = () => () => {};
const serverSnapshot = () => false;

/** 서버와 최초 수화는 웹으로 렌더하고, 이후 브라우저의 네이티브 표식을 읽는다. */
export function useNativeApp(): boolean {
  return useSyncExternalStore(subscribe, isNativeApp, serverSnapshot);
}
