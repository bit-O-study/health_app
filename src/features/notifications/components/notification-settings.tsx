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

  // 아이폰 설정식 그룹 목록 두 장(2026-09-16 8단계) — 섹션 설명 문장은 뺐다.
  return (
    <div className="space-y-4">
      <section>
        <h2 className="app-section-label">받을 알림</h2>
        <ul className="app-list">
          {NOTIFICATION_KINDS.map((kind) => (
            <li key={kind} className="app-row">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base text-zinc-900 dark:text-zinc-100">
                  {NOTIFICATION_LABEL[kind].title}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
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

      <section>
        <h2 className="app-section-label">방해 금지</h2>
        <div className="app-list">
          <div className="app-row">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300">
              <Moon aria-hidden="true" size={16} />
            </span>
            <span className="min-w-0 flex-1 truncate text-base text-zinc-900 dark:text-zinc-100">
              야간 방해 금지
            </span>
            <Toggle
              on={prefs.quietHours}
              disabled={pending}
              label="야간 방해 금지"
              onToggle={() => save({ ...prefs, quietHours: !prefs.quietHours })}
            />
          </div>

          {prefs.quietHours ? (
            <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
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
                <p className="basis-full text-xs text-warn">
                  시작과 종료가 같아 방해 금지 시간이 없어요.
                </p>
              ) : nowQuiet ? (
                <p className="basis-full text-xs text-zinc-500 dark:text-zinc-400">
                  지금은 방해 금지 시간이에요.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <p
        aria-live="polite"
        className="flex items-center gap-1.5 px-1 text-xs text-zinc-500 dark:text-zinc-400"
      >
        {pending ? (
          <>
            <Loader2 aria-hidden="true" size={13} className="animate-spin" />
            저장 중…
          </>
        ) : error ? (
          <span className="flex items-center gap-1.5 text-danger">
            <BellOff aria-hidden="true" size={13} />
            {error} 다시 시도해 주세요.
          </span>
        ) : savedAt > 0 ? (
          <>
            <Check aria-hidden="true" size={13} className="text-brand" />
            저장했습니다.
          </>
        ) : null}
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
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
        on ? "bg-brand" : "bg-zinc-300 dark:bg-zinc-600"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-6" : "left-1"
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
        className="h-9 rounded-[10px] bg-zinc-100 px-2 text-sm text-zinc-800 disabled:opacity-60 dark:bg-white/[0.08] dark:text-zinc-200"
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
