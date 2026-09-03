"use client";

import { useState, useTransition } from "react";
import { BellOff, Check, Loader2, Moon } from "lucide-react";

import { saveNotificationPreferencesAction } from "@/features/notifications/preference-actions";
import {
  NOTIFICATION_KINDS,
  NOTIFICATION_LABEL,
  isQuietHour,
  seoulHour,
  type NotificationKind,
  type NotificationPreferences,
} from "@/features/notifications/preferences";

/**
 * 알림 설정 화면 — 로드맵 3.1.
 *
 * 켜고 끄면 **바로 저장한다**(저장 버튼 없음). 설정 화면에서 토글만 만지고 나가는 게
 * 자연스러운데 저장을 안 눌러 안 바뀌는 일이 흔하다. 대신 실패하면 되돌리고 알린다 —
 * 껐다고 믿는데 계속 오는 상태가 제일 나쁘다.
 */
export function NotificationSettings({
  initial,
}: {
  initial: NotificationPreferences;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(0);

  function save(next: NotificationPreferences) {
    const before = prefs;
    setPrefs(next); // 낙관적 — 토글이 즉시 움직여야 만졌다는 게 보인다
    setError(null);
    start(async () => {
      const res = await saveNotificationPreferencesAction(next);
      if (res.ok) {
        setSavedAt(Date.now());
      } else {
        setPrefs(before); // 되돌린다 — 껐다고 믿게 두면 안 된다
        setError(res.error);
      }
    });
  }

  function toggleKind(kind: NotificationKind) {
    save({ ...prefs, kinds: { ...prefs.kinds, [kind]: !prefs.kinds[kind] } });
  }

  const nowQuiet = isQuietHour(seoulHour(), prefs);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="mb-1 text-base font-bold text-zinc-950 dark:text-zinc-100">
          받을 알림
        </h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          끄면 그 종류만 안 와요. 나머지는 그대로 받습니다.
        </p>
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-700">
          {NOTIFICATION_KINDS.map((kind) => (
            <li
              key={kind}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {NOTIFICATION_LABEL[kind].title}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  {NOTIFICATION_LABEL[kind].desc}
                </p>
              </div>
              <Toggle
                on={prefs.kinds[kind]}
                disabled={pending}
                label={NOTIFICATION_LABEL[kind].title}
                onToggle={() => toggleKind(kind)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold text-zinc-950 dark:text-zinc-100">
              <Moon aria-hidden="true" size={16} className="text-indigo-500" />
              야간 방해 금지
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              이 시간에는 알림을 보내지 않아요. 한국 시간 기준입니다.
            </p>
          </div>
          <Toggle
            on={prefs.quietHours}
            disabled={pending}
            label="야간 방해 금지"
            onToggle={() => save({ ...prefs, quietHours: !prefs.quietHours })}
          />
        </div>

        {prefs.quietHours ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <HourSelect
              label="시작"
              value={prefs.quietStartHour}
              disabled={pending}
              onChange={(h) => save({ ...prefs, quietStartHour: h })}
            />
            <span className="text-sm text-zinc-400">~</span>
            <HourSelect
              label="종료"
              value={prefs.quietEndHour}
              disabled={pending}
              onChange={(h) => save({ ...prefs, quietEndHour: h })}
            />
            {prefs.quietStartHour === prefs.quietEndHour ? (
              <p className="basis-full text-xs text-amber-600 dark:text-amber-400">
                시작과 종료가 같아 방해 금지 시간이 없어요.
              </p>
            ) : nowQuiet ? (
              <p className="basis-full text-xs text-indigo-600 dark:text-indigo-400">
                지금은 방해 금지 시간이에요.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <p
        aria-live="polite"
        className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400"
      >
        {pending ? (
          <>
            <Loader2 aria-hidden="true" size={13} className="animate-spin" />
            저장 중…
          </>
        ) : error ? (
          <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <BellOff aria-hidden="true" size={13} />
            {error} 다시 시도해 주세요.
          </span>
        ) : savedAt > 0 ? (
          <>
            <Check aria-hidden="true" size={13} className="text-emerald-500" />
            저장했습니다.
          </>
        ) : (
          "바꾸면 바로 저장됩니다."
        )}
      </p>
    </div>
  );
}

function Toggle({
  on,
  label,
  disabled,
  onToggle,
}: {
  on: boolean;
  label: string;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${
        on ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-[1.375rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function HourSelect({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (hour: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
      {label}
      <select
        aria-label={`방해 금지 ${label} 시각`}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-800 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
      >
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, "0")}:00
          </option>
        ))}
      </select>
    </label>
  );
}
