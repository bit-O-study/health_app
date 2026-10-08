'use client';
import { useEffect, useRef, useState } from 'react';
import { getShareableWorkout, listShareableWorkoutDates } from '../workout-share-actions';
import type { WorkoutSnapshot } from '../workout-snapshot';
import { WorkoutShareCard } from './workout-share-card';

export function WorkoutRecordPicker({ value, onChange }: { value: WorkoutSnapshot | null; onChange: (value: WorkoutSnapshot | null) => void }) {
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const request = useRef(0);
  useEffect(() => {
    let active = true;
    listShareableWorkoutDates().then(result => { if (active) { setDates(result); setError(''); } })
      .catch(() => { if (active) setError('운동 기록을 불러오지 못했어요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; request.current++; };
  }, [reload]);
  async function select(date: string) {
    const current = ++request.current;
    onChange(null);
    setError('');
    if (!date) return;
    setLoading(true);
    try {
      const snapshot = await getShareableWorkout(date);
      if (current !== request.current) return;
      onChange(snapshot);
      if (!snapshot) setError('이 날짜에 공유할 완료 기록이 없어요.');
    } catch { if (current === request.current) setError('운동 기록을 불러오지 못했어요. 다시 선택해주세요.'); }
    finally { if (current === request.current) setLoading(false); }
  }
  return <div className="mb-3">
    <label className="text-sm font-semibold" htmlFor="share-workout-date">운동 기록 선택</label>
    <select id="share-workout-date" value={value?.date ?? ''} disabled={loading} onChange={e => void select(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
      <option value="">{loading ? '기록을 불러오는 중…' : '사진만 올리기'}</option>
      {dates.map(date => <option key={date} value={date}>{date} 운동</option>)}
    </select>
    {!loading && !dates.length && !error ? <p className="mt-2 text-xs text-zinc-500">완료한 운동이 생기면 사진 없이도 공유할 수 있어요.</p> : null}
    {error ? <p role="alert" className="mt-2 text-sm text-rose-500">{error} <button type="button" onClick={() => { setLoading(true); setReload(n => n + 1); }} className="underline">다시 시도</button></p> : null}
    {value ? <><WorkoutShareCard snapshot={value} /><p className="text-xs text-zinc-500">운동명·세트·시간만 공유해요.<br />체중과 개인 메모는 포함하지 않아요.</p></> : null}
  </div>;
}
