"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";

import { findLoginEmailAction } from "@/features/auth/recover-actions";
import { Err, Submit, inputCls } from "@/features/auth/components/recover-ui";

export function FindIdForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [foundEmail, setFoundEmail] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runFind() {
    const res = await findLoginEmailAction(name, phone);
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
    if (!name.trim() || !phone.trim()) {
      setError("이름과 휴대폰 번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    await runFind();
  }

  if (done) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-7 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-zinc-950 dark:text-zinc-100">
          아이디 찾기 결과
        </h2>
        {foundEmail ? (
          <>
            <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
              입력하신 정보와 일치하는 아이디(이메일)입니다.
            </p>
            <div className="mb-5 rounded-md bg-zinc-100 dark:bg-zinc-900 px-3 py-3 text-center">
              <span
                data-testid="found-email"
                className="select-all text-sm font-bold text-zinc-900 dark:text-zinc-100"
              >
                {foundEmail}
              </span>
            </div>
          </>
        ) : (
          <p
            data-testid="find-id-none"
            className="mb-5 rounded-md bg-amber-50 dark:bg-amber-950/40 px-3 py-3 text-sm text-amber-700 dark:text-amber-400"
          >
            입력하신 정보와 일치하는 아이디가 없습니다.
          </p>
        )}
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          로그인하기
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-7 shadow-sm">
      <form className="space-y-4" onSubmit={handleStart}>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" htmlFor="name">
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
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" htmlFor="phone">
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
    </div>
  );
}
