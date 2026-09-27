"use client";

import { type FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useHydrated } from "@/lib/use-hydrated";

import { findLoginEmailAction } from "@/features/auth/recover-actions";
import {
  Err,
  Submit,
  inputCls,
  labelCls,
  primaryBtnCls,
} from "@/features/auth/components/recover-ui";
import { withPrefilled } from "@/lib/forms/prefilled";
import { usePrefilledInputs } from "@/lib/forms/use-prefilled-inputs";

export function FindIdForm() {
  const hydrated = useHydrated();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [foundEmail, setFoundEmail] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // 하이드레이션 전에 채워진 값(빠른 타이핑·자동완성)을 state 로 끌어올린다.
  usePrefilledInputs(formRef, { name, phone }, (v) => {
    if (v.name !== undefined) setName(v.name);
    if (v.phone !== undefined) setPhone(v.phone);
  });

  async function runFind(findName: string, findPhone: string) {
    const res = await findLoginEmailAction(findName, findPhone);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
    setFoundEmail(res.email);
  }

  /**
   * 이름 + 휴대폰이 맞으면 바로 아이디(이메일)를 보여준다.
   *
   * 예전엔 여기서 휴대폰 OTP 를 한 번 태웠지만, Supabase 의 Phone 공급자가 꺼져 있어
   * `sendPhoneOtp` 가 늘 실패 → "SMS 미설정" 안내와 함께 어차피 건너뛰고 있었다.
   * 동작하지 않는 관문을 화면에만 남겨둘 이유가 없어 걷어냈다.
   */
  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    // state 가 아직 비어 있을 수 있어 폼 DOM 의 실제 값을 쓴다(하이드레이션 경합).
    const filled = withPrefilled(event.currentTarget, { name, phone });
    if (!filled.name.trim() || !filled.phone.trim()) {
      setError("이름과 휴대폰 번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    await runFind(filled.name, filled.phone);
  }

  if (done) {
    return (
      <div className="w-full space-y-3">
        <h2 className="app-section-label">아이디 찾기 결과</h2>
        {foundEmail ? (
          <div className="app-card px-3 py-4 text-center">
            <span
              data-testid="found-email"
              className="select-all text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {foundEmail}
            </span>
          </div>
        ) : (
          <p
            data-testid="find-id-none"
            className="rounded-[10px] bg-warn/10 px-3 py-3 text-sm text-warn"
          >
            입력하신 정보와 일치하는 아이디가 없습니다.
          </p>
        )}
        <Link href="/login" className={primaryBtnCls}>
          로그인하기
        </Link>
      </div>
    );
  }

  return (
<fieldset disabled={!hydrated} className="min-w-0 w-full">
    <form ref={formRef} className="w-full space-y-3" onSubmit={handleStart}>
      <div>
        <label className={labelCls} htmlFor="name">
          이름
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          className={inputCls}
          placeholder="홍길동"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="phone">
          전화번호
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          className={inputCls}
          placeholder="010-1234-5678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      {error ? <Err>{error}</Err> : null}
      <Submit busy={busy} label="아이디 찾기" icon="search" />
    </form>
    </fieldset>
  );
}
