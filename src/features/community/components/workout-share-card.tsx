'use client';
import { useState } from 'react';
import type { WorkoutSnapshot } from '../workout-snapshot';
import { TryWorkoutSheet } from './try-workout-sheet';

/**
 * 운동 기록 카드. postId 가 있으면(피드·상세 — 올라간 글) '오늘 이 운동 해보기' 버튼을 붙인다(커뮤니티 4-1).
 * 글쓰기 미리보기에는 postId 가 없어 버튼이 없다.
 */
export function WorkoutShareCard({ snapshot, postId }: { snapshot: WorkoutSnapshot; postId?: string }) {
  const [trying, setTrying] = useState(false);
  return <div className="mx-3 my-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60" data-testid="workout-share-card">
    <p className="text-xs text-zinc-500">{snapshot.date} · 운동 기록</p>
    <p className="mt-1 text-lg font-semibold">오늘도 운동 완료</p>
    <p className="mt-1 text-sm text-zinc-500">{snapshot.exercises.length}개 운동{snapshot.durationSec ? ` · ${Math.floor(snapshot.durationSec / 60)}분` : ''}</p>
    <ul className="mt-3 space-y-1 text-sm">{snapshot.exercises.map((e, i) => <li key={i} className="flex justify-between gap-3"><span className="break-words">{e.name}</span>{e.sets ? <span className="shrink-0 text-zinc-500">{e.sets}세트</span> : null}</li>)}</ul>
    {postId ? <>
      {/* 카드를 누르면 상세로 가는 목록 안이라 클릭이 위로 올라가지 않게 막는다. */}
      <button type="button" onClick={e => { e.stopPropagation(); setTrying(true); }} className="mt-3 min-h-11 w-full rounded-xl border border-brand text-sm font-semibold text-brand active:bg-brand-soft">
        오늘 이 운동 해보기
      </button>
      {trying ? <TryWorkoutSheet postId={postId} onClose={() => setTrying(false)} /> : null}
    </> : null}
  </div>;
}
