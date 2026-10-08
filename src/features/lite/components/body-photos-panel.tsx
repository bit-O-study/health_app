"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Lock, Trash2 } from "lucide-react";

import { resizeImageForAI } from "@/lib/image/resize-for-ai";
import { addBodyPhotoAction, deleteBodyPhotoAction } from "@/features/lite/body-photo-actions";
import {
  comparePair,
  compOnOrBefore,
  daysBetween,
  FREE_PHOTO_LIMIT,
  PHOTO_MAX_PX,
  PHOTO_QUALITY,
  POSE_LABEL,
  POSES,
  photoDates,
  type Pose,
} from "@/features/lite/body-photos";
import { signed } from "@/features/lite/reports";
import type { BodyPhotosView, BodyPhotoView } from "@/features/lite/body-photos-data";

const md = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;

function Chips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`h-9 flex-1 rounded-full text-sm font-semibold ${
            value === o.id ? "bg-brand text-white dark:text-zinc-950" : "bg-zinc-100 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Shot({ photo, caption }: { photo: BodyPhotoView; caption: string }) {
  return (
    <figure className="min-w-0 space-y-1">
      <div className="aspect-[3/4] overflow-hidden rounded-xl bg-zinc-100 dark:bg-white/[0.06]">
        {photo.url ? (
          // 서명 URL(10분)이라 next/image 최적화 캐시에 남기지 않는다.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt={`${caption} 몸 사진`} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <figcaption className="text-center text-xs text-zinc-500 dark:text-zinc-400">{caption}</figcaption>
    </figure>
  );
}

const POSE_OPTIONS = POSES.map((p) => ({ id: p, label: POSE_LABEL[p] }));

/**
 * 몸 사진(라이트 2단계 혜택 3, 2026-10-02) — 올리기 · 같은 방향끼리 비교 · 목록.
 * 사진은 나만 본다(비공개 버킷, 10분 서명 URL). 무료 3장 · 라이트 무제한(하루 10장).
 */
export function BodyPhotosPanel({ view, today }: { view: BodyPhotosView; today: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pose, setPose] = useState<Pose>("front");
  const [takenOn, setTakenOn] = useState(today);
  const [consent, setConsent] = useState(false);
  const [cmpPose, setCmpPose] = useState<Pose>("front");
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);

  const first = view.photos.length === 0;
  const lockedFree = view.plan === "free" && view.photos.length >= FREE_PHOTO_LIMIT;
  const poseDates = useMemo(() => photoDates(view.photos.filter((p) => p.pose === cmpPose)), [view.photos, cmpPose]);
  const pair = comparePair(view.photos, cmpPose, before, after);
  const pairPhotos = pair
    ? {
        before: view.photos.find((p) => p.id === pair.before.id)!,
        after: view.photos.find((p) => p.id === pair.after.id)!,
      }
    : null;
  const cb = pair ? compOnOrBefore(view.comps, pair.before.takenOn) : null;
  const ca = pair ? compOnOrBefore(view.comps, pair.after.takenOn) : null;
  const delta = (a: number | null | undefined, b: number | null | undefined) =>
    a != null && b != null ? Math.round((b - a) * 10) / 10 : null;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    let base64: string;
    try {
      base64 = (await resizeImageForAI(file, PHOTO_MAX_PX, PHOTO_QUALITY)).base64;
    } catch {
      return setError("사진을 열지 못했어요. 다른 사진으로 해 주세요.");
    }
    start(async () => {
      const r = await addBodyPhotoAction({ base64, pose, takenOn, consent });
      if (!r.ok) return setError(r.error);
      setBefore(null);
      setAfter(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    start(async () => {
      const r = await deleteBodyPhotoAction(id);
      if (!r.ok) return setError(r.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3" data-testid="body-photos">
      <section className="app-card space-y-3 p-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">사진 추가</h2>
        <Chips label="사진 방향" value={pose} options={POSE_OPTIONS} onChange={setPose} />
        <label className="flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-200">
          찍은 날
          <input
            type="date"
            value={takenOn}
            max={today}
            onChange={(e) => setTakenOn(e.target.value)}
            className="h-9 rounded-[10px] bg-zinc-100 px-2 text-base text-zinc-900 dark:bg-white/[0.08] dark:text-zinc-100"
          />
        </label>
        {first ? (
          <label className="flex items-start gap-2 rounded-xl bg-zinc-50 p-2.5 text-xs text-zinc-700 dark:bg-white/[0.04] dark:text-zinc-200">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            <span>
              몸 사진은 <b>나만 볼 수 있게</b> 비공개로 저장돼요. 언제든 지울 수 있고, 탈퇴하면 바로 지워져요. 이 안내에 동의해요.
            </span>
          </label>
        ) : null}
        {lockedFree ? (
          <p className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300" data-testid="body-photos-locked">
            <Lock aria-hidden="true" size={14} />
            무료는 {FREE_PHOTO_LIMIT}장까지예요.{" "}
            <Link href="/settings/subscription" className="font-semibold text-brand">
              라이트에서 계속 쌓기
            </Link>
          </p>
        ) : (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} data-testid="body-photo-input" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending || (first && !consent)}
              className="app-press inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-base font-semibold text-white disabled:opacity-50 dark:text-zinc-950"
            >
              {pending ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <Camera aria-hidden="true" size={16} />}
              {POSE_LABEL[pose]} 사진 찍기·고르기
            </button>
          </>
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          같은 장소·같은 자세·비슷한 시간에 찍으면 변화가 잘 보여요.
          {view.plan === "free" ? ` 무료 ${view.photos.length}/${FREE_PHOTO_LIMIT}장.` : ""}
        </p>
        {error ? (
          <p role="alert" className="text-xs font-semibold text-danger">
            {error}
          </p>
        ) : null}
      </section>

      <section className="app-card space-y-3 p-3" data-testid="body-photos-compare">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">비교</h2>
        <Chips
          label="비교할 방향"
          value={cmpPose}
          options={POSE_OPTIONS}
          onChange={(p) => {
            setCmpPose(p);
            setBefore(null);
            setAfter(null);
          }}
        />
        {pair && pairPhotos ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Shot photo={pairPhotos.before} caption={md(pair.before.takenOn)} />
              <Shot photo={pairPhotos.after} caption={md(pair.after.takenOn)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="이전 날짜"
                value={pair.before.takenOn}
                onChange={(e) => setBefore(e.target.value)}
                className="h-9 rounded-[10px] bg-zinc-100 px-2 text-sm dark:bg-white/[0.08] dark:text-zinc-100"
              >
                {poseDates.map((d) => (
                  <option key={d} value={d}>
                    {md(d)}
                  </option>
                ))}
              </select>
              <select
                aria-label="이후 날짜"
                value={pair.after.takenOn}
                onChange={(e) => setAfter(e.target.value)}
                className="h-9 rounded-[10px] bg-zinc-100 px-2 text-sm dark:bg-white/[0.08] dark:text-zinc-100"
              >
                {poseDates.map((d) => (
                  <option key={d} value={d}>
                    {md(d)}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-200" data-testid="body-photos-delta">
              {pair.before.takenOn === pair.after.takenOn ? "같은 날" : `${daysBetween(pair.before.takenOn, pair.after.takenOn)}일 사이`}
              {(() => {
                const parts = [
                  ["체중", delta(cb?.weightKg, ca?.weightKg), "kg"],
                  ["골격근", delta(cb?.muscleKg, ca?.muscleKg), "kg"],
                  ["체지방률", delta(cb?.fatPct, ca?.fatPct), "%"],
                ].filter((x) => x[1] != null && cb?.date !== ca?.date) as [string, number, string][];
                return parts.length ? ` · ${parts.map(([l, v, u]) => `${l} ${signed(v)}${u}`).join(" · ")}` : "";
              })()}
            </p>
          </>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {POSE_LABEL[cmpPose]} 사진이 2장 이상 쌓이면 나란히 비교할 수 있어요.
          </p>
        )}
      </section>

      {view.photos.length ? (
        <section className="app-card space-y-2 p-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">전체 {view.photos.length}장</h2>
          <ul className="grid grid-cols-3 gap-2">
            {view.photos.map((p) => (
              <li key={p.id} className="relative" data-testid="body-photo-item">
                <Shot photo={p} caption={`${md(p.takenOn)} ${POSE_LABEL[p.pose]}`} />
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  disabled={pending}
                  aria-label={`${md(p.takenOn)} ${POSE_LABEL[p.pose]} 사진 지우기`}
                  className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"
                >
                  <Trash2 aria-hidden="true" size={13} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="px-1 text-xs text-zinc-500 dark:text-zinc-400">이 사진은 나만 봐요.<br />다른 회원·트레이너에게 보이지 않아요.</p>
    </div>
  );
}
