"use client";

import { useEffect, useRef, type RefObject } from "react";

import { pickPrefilled, readFields } from "@/lib/forms/prefilled";

/**
 * 하이드레이션 직후 한 번, 폼 DOM 에 이미 들어와 있는 값(빠른 타이핑·자동완성)을
 * React state 로 끌어올린다. 배경 설명은 `prefilled.ts` 주석 참고.
 *
 * 마운트 1회만 돈다 — 그 뒤부터는 onChange 가 state 를 유지하므로 다시 읽을 필요가 없다.
 */
export function usePrefilledInputs<K extends string>(
  formRef: RefObject<HTMLFormElement | null>,
  current: Record<K, string>,
  apply: (values: Partial<Record<K, string>>) => void,
): void {
  const currentRef = useRef(current);
  const applyRef = useRef(apply);

  useEffect(() => {
    currentRef.current = current;
    applyRef.current = apply;
  });

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const keys = Object.keys(currentRef.current) as K[];
    const found = pickPrefilled(currentRef.current, readFields(form, keys));
    if (Object.keys(found).length > 0) applyRef.current(found);
  }, [formRef]);
}
