import type { WorkoutSnapshot } from '../workout-snapshot';

export function WorkoutShareCard({ snapshot }: { snapshot: WorkoutSnapshot }) {
  return <div className="mx-3 my-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60" data-testid="workout-share-card">
    <p className="text-xs text-zinc-500">{snapshot.date} · 운동 기록</p>
    <p className="mt-1 text-lg font-semibold">오늘도 운동 완료</p>
    <p className="mt-1 text-sm text-zinc-500">{snapshot.exercises.length}개 운동{snapshot.durationSec ? ` · ${Math.floor(snapshot.durationSec / 60)}분` : ''}</p>
    <ul className="mt-3 space-y-1 text-sm">{snapshot.exercises.map((e, i) => <li key={i} className="flex justify-between gap-3"><span className="break-words">{e.name}</span>{e.sets ? <span className="shrink-0 text-zinc-500">{e.sets}세트</span> : null}</li>)}</ul>
  </div>;
}
