/**
 * 하이드레이션 전에 채워진 입력값 끌어올리기(순수 로직).
 *
 * 🔴 왜 필요한가 — 로그인/찾기 폼의 입력은 전부 **제어 컴포넌트**(`value={state}`)다.
 * 첫 화면은 서버에서 온 HTML 이고 React 하이드레이션은 조금 뒤에 끝나는데, 그 사이에
 * 사용자가 타이핑하거나 브라우저·비밀번호 매니저가 자동완성하면 값이 **DOM 에만**
 * 들어간다. onChange 가 아직 붙기 전이라 state 는 빈 문자열 그대로다.
 * → 화면엔 이메일·비밀번호가 멀쩡히 보이는데 로그인 버튼을 누르면
 *   "이메일과 비밀번호를 입력해 주세요" 가 뜬다(= 사용자 입장에선 "로그인이 안 됨").
 * 앱 WebView·느린 네트워크처럼 하이드레이션이 늦을수록 잘 걸린다(2026-09-21 프로덕션 재현).
 *
 * 해결 — 마운트 직후 한 번(`usePrefilledInputs`), 그리고 제출 시점에(`withPrefilled`)
 * **폼 DOM 의 실제 값**을 읽어 state 와 합친다.
 */

/** 값만 읽는 최소 인터페이스 — 테스트에서 가짜 폼을 넣을 수 있다. */
export type ValueElement = { value?: unknown };
export type FormLike = { querySelector(selector: string): ValueElement | null };

/** 필드 키(= input 의 id, 없으면 name)로 찾는 선택자. */
export function fieldSelector(key: string): string {
  return `#${key}, [name="${key}"]`;
}

/** 폼 DOM 에서 지정한 키들의 현재 값을 읽는다(없는 필드는 빠진다). */
export function readFields<K extends string>(
  form: FormLike | null | undefined,
  keys: readonly K[],
): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  if (!form) return out;
  for (const key of keys) {
    const value = form.querySelector(fieldSelector(key))?.value;
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/**
 * DOM 에만 있고 state 엔 아직 없는 값만 고른다.
 * 빈 값은 절대 고르지 않는다 — state 에 있는 값을 DOM 의 공백으로 지우면 안 된다.
 */
export function pickPrefilled<K extends string>(
  current: Record<K, string>,
  dom: Partial<Record<K, string>>,
): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const key of Object.keys(current) as K[]) {
    const value = dom[key];
    if (typeof value === "string" && value !== "" && value !== current[key]) {
      out[key] = value;
    }
  }
  return out;
}

/** state 위에 DOM 값을 덮어 합친 최종 값 — 제출 로직은 state 대신 이걸 쓴다. */
export function withPrefilled<K extends string>(
  form: FormLike | null | undefined,
  current: Record<K, string>,
): Record<K, string> {
  const keys = Object.keys(current) as K[];
  return { ...current, ...pickPrefilled(current, readFields(form, keys)) };
}
