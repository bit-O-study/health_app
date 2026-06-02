"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";

import {
  deleteExerciseMediaAction,
  setExerciseMediaAction,
} from "@/features/exercises/exercise-media-actions";
import { MediaEmbed } from "@/features/exercises/components/media-embed";
import type { ExerciseMedia, MediaKind } from "@/features/exercises/exercise-media";

type ExerciseOpt = { id: string; name: string; part: string };

export function AdminMediaManager({
  exercises,
  initialMedia,
}: {
  exercises: ExerciseOpt[];
  initialMedia: ExerciseMedia[];
}) {
  const [media, setMedia] = useState<ExerciseMedia[]>(initialMedia);
  const [exerciseId, setExerciseId] = useState<string>(exercises[0]?.id ?? "");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<MediaKind>("video");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const nameById = useMemo(() => {
    const m = new Map<string, ExerciseOpt>();
    for (const e of exercises) m.set(e.id, e);
    return m;
  }, [exercises]);

  function save() {
    setError(null);
    setOkMsg(null);
    start(async () => {
      const res = await setExerciseMediaAction(exerciseId, url, kind);
      if (res.ok) {
        setMedia((prev) => {
          const rest = prev.filter((m) => m.exerciseId !== exerciseId);
          return [...rest, { exerciseId, url: url.trim(), kind }];
        });
        setOkMsg(`${nameById.get(exerciseId)?.name ?? exerciseId} 저장됨`);
        setUrl("");
      } else {
        setError(res.error);
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      const res = await deleteExerciseMediaAction(id);
      if (res.ok) setMedia((prev) => prev.filter((m) => m.exerciseId !== id));
      else setError(res.error);
    });
  }

  const inputCls =
    "h-10 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm text-zinc-800 dark:text-zinc-200";

  return (
    <div className="space-y-8">
      {/* 등록 폼 */}
      <section className="space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          미디어 등록 / 수정
        </h2>
        <div className="flex flex-col gap-2">
          <select
            aria-label="운동"
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
            disabled={pending}
            className={inputCls}
          >
            {exercises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.part})
              </option>
            ))}
          </select>
          <input
            aria-label="미디어 URL"
            type="url"
            inputMode="url"
            placeholder="https://youtu.be/... 또는 https://.../clip.gif"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={pending}
            className={inputCls}
          />
          <div className="flex items-center gap-2">
            <select
              aria-label="종류"
              value={kind}
              onChange={(e) => setKind(e.target.value as MediaKind)}
              disabled={pending}
              className={inputCls}
            >
              <option value="video">영상 (유튜브/mp4)</option>
              <option value="gif">움짤 (gif)</option>
              <option value="image">이미지</option>
            </select>
            <button
              type="button"
              onClick={save}
              disabled={pending || !exerciseId || url.trim() === ""}
              className="inline-flex h-10 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={15} />
              ) : (
                <Check aria-hidden="true" size={15} />
              )}
              저장
            </button>
          </div>
        </div>
        {url.trim() !== "" ? (
          <div className="max-w-sm">
            <p className="mb-1 text-xs text-zinc-500">미리보기</p>
            <MediaEmbed url={url.trim()} kind={kind} />
          </div>
        ) : null}
        {error ? (
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        {okMsg ? (
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {okMsg}
          </p>
        ) : null}
      </section>

      {/* 등록 목록 */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          등록된 미디어 ({media.length})
        </h2>
        {media.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-4 text-center text-sm text-zinc-500">
            아직 등록된 미디어가 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {media
              .slice()
              .sort((a, b) =>
                (nameById.get(a.exerciseId)?.name ?? a.exerciseId).localeCompare(
                  nameById.get(b.exerciseId)?.name ?? b.exerciseId,
                  "ko",
                ),
              )
              .map((m) => (
                <li
                  key={m.exerciseId}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {nameById.get(m.exerciseId)?.name ?? m.exerciseId}
                      <span className="ml-2 text-xs font-normal text-zinc-500">
                        {m.kind}
                      </span>
                    </p>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-xs text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      {m.url}
                    </a>
                  </div>
                  <button
                    type="button"
                    aria-label="삭제"
                    onClick={() => remove(m.exerciseId)}
                    disabled={pending}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
