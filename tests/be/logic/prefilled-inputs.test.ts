import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  fieldSelector,
  pickPrefilled,
  readFields,
  withPrefilled,
  type FormLike,
} from "@/lib/forms/prefilled";

/**
 * 하이드레이션 전 입력 끌어올리기(2026-09-21).
 *
 * 재현된 버그: 로그인 화면이 뜬 직후(JS 하이드레이션 전) 타이핑하거나 브라우저가
 * 자동완성하면 값이 DOM 에만 들어가고 React state 는 빈 문자열로 남는다.
 * 화면엔 이메일·비밀번호가 보이는데 로그인 버튼을 누르면
 * "이메일과 비밀번호를 입력해 주세요" 가 뜨고 영영 로그인이 안 된다.
 */

/** id / name 선택자에 답하는 가짜 폼. */
function fakeForm(values: Record<string, string>): FormLike {
  return {
    querySelector(selector: string) {
      for (const [key, value] of Object.entries(values)) {
        if (selector === fieldSelector(key)) return { value };
      }
      return null;
    },
  };
}

describe("fieldSelector", () => {
  it("id 우선, name 도 함께 찾는다", () => {
    expect(fieldSelector("email")).toBe('#email, [name="email"]');
  });
});

describe("readFields", () => {
  it("폼에 있는 필드 값만 읽는다", () => {
    const form = fakeForm({ email: "a@b.com", password: "pw123456" });
    expect(readFields(form, ["email", "password", "phone"])).toEqual({
      email: "a@b.com",
      password: "pw123456",
    });
  });

  it("폼이 아직 없으면(ref 미연결) 빈 객체", () => {
    expect(readFields(null, ["email"])).toEqual({});
  });

  it("value 가 문자열이 아니면 무시한다", () => {
    const form: FormLike = { querySelector: () => ({ value: undefined }) };
    expect(readFields(form, ["email"])).toEqual({});
  });
});

describe("pickPrefilled", () => {
  it("DOM 에만 있는 값을 고른다", () => {
    expect(
      pickPrefilled({ email: "", password: "" }, { email: "a@b.com", password: "pw" }),
    ).toEqual({ email: "a@b.com", password: "pw" });
  });

  it("이미 state 와 같은 값은 고르지 않는다(불필요한 setState 방지)", () => {
    expect(pickPrefilled({ email: "a@b.com" }, { email: "a@b.com" })).toEqual({});
  });

  it("빈 DOM 값으로 state 를 지우지 않는다", () => {
    expect(pickPrefilled({ email: "a@b.com" }, { email: "" })).toEqual({});
  });

  it("폼에 없는 필드는 건드리지 않는다", () => {
    expect(pickPrefilled({ email: "", name: "" }, { email: "a@b.com" })).toEqual({
      email: "a@b.com",
    });
  });
});

describe("withPrefilled", () => {
  it("state 가 비어 있어도 DOM 값으로 제출할 수 있다 — 로그인 못 하던 버그", () => {
    const form = fakeForm({ email: "bong@naver.com", password: "secret123" });
    expect(withPrefilled(form, { email: "", password: "" })).toEqual({
      email: "bong@naver.com",
      password: "secret123",
    });
  });

  it("사용자가 입력을 고친 뒤에는 DOM = state 라 그대로다", () => {
    const form = fakeForm({ email: "new@x.com", password: "secret123" });
    expect(
      withPrefilled(form, { email: "new@x.com", password: "secret123" }),
    ).toEqual({ email: "new@x.com", password: "secret123" });
  });

  it("폼 참조가 없으면 state 를 그대로 쓴다", () => {
    expect(withPrefilled(null, { email: "a@b.com", password: "pw" })).toEqual({
      email: "a@b.com",
      password: "pw",
    });
  });
});

/**
 * 가드 — 인증 폼은 **모두** 이 보호를 달고 있어야 한다.
 * (한 곳만 고치면 다른 화면으로 들어온 사용자에게 같은 버그가 남는다.)
 */
describe("인증 폼 적용 가드", () => {
  const FORMS = [
    "auth-form.tsx",
    "find-id-form.tsx",
    "find-password-form.tsx",
    "change-password-form.tsx",
  ];

  for (const file of FORMS) {
    it(`${file} 는 withPrefilled + usePrefilledInputs 를 쓴다`, () => {
      const src = fs.readFileSync(
        path.join(process.cwd(), "src/features/auth/components", file),
        "utf8",
      );
      expect(src).toContain("usePrefilledInputs(");
      expect(src).toContain("withPrefilled(");
      // 훅이 읽을 수 있게 form 에 ref 가 붙어 있어야 한다.
      expect(src).toContain("ref={formRef}");
    });
  }
});
