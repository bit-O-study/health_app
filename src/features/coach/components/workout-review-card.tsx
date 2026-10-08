import type { CoachReview } from "../workout-review";

export function WorkoutReviewCard({ review, onConsult }: { review: CoachReview; onConsult?: (question: string) => void }) {
  return <section className="app-card space-y-4 p-4" aria-label="운동 기록 점검">
    <div><h2 className="font-semibold">다음 운동 전에 확인하세요</h2><p className="text-xs text-zinc-500">{review.from} ~ {review.to} · 기록 기준 자동 점검</p></div>
    <dl className="space-y-3 text-sm">
      <div><dt className="font-semibold">운동한 날</dt><dd className="mt-1 text-zinc-600 dark:text-zinc-300">{review.observation}</dd></div>
      <div><dt className="font-semibold">점검할 부분</dt><dd className="mt-1 text-zinc-600 dark:text-zinc-300">{review.check}</dd></div>
      <div><dt className="font-semibold">다음 할 일</dt><dd className="mt-1 text-zinc-600 dark:text-zinc-300">{review.nextStep}</dd></div>
    </dl>
    {review.exercises.length > 0 && <div className="space-y-3 border-t pt-3">
      <h3 className="text-sm font-semibold">최근 종목의 다음 중량·횟수</h3>
      <p className="text-xs text-zinc-500">최근 28일 중 같은 기구로 한 기록과 저장된 계획의 목표 횟수 기준입니다.<br />현재 계획을 자동으로 바꾸지 않아요.</p>
      {review.exercises.map(exercise => <div key={exercise.exerciseId} className="space-y-1 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><strong>{exercise.name}</strong><span className="text-brand">{exercise.label}</span></div>
        {(exercise.suggestedKg !== null || exercise.suggestedReps !== null) && <p>{exercise.suggestedKg !== null && `${exercise.suggestedKg}kg`}{exercise.suggestedKg !== null && exercise.suggestedReps !== null && " · "}{exercise.suggestedReps !== null && `${exercise.suggestedReps}회`}</p>}
        <p className="text-xs text-zinc-500">{exercise.reason}</p>
      </div>)}
    </div>}
    {review.workoutDays > 0 && review.exercises.length === 0 && <p className="text-xs text-zinc-500">운동 계획의 목표 횟수와 기구를 확인할 수 있는 기록이 쌓이면 중량·횟수를 안내해요.<br />조건이 다른 기록은 섞어서 계산하지 않아요.</p>}
    {onConsult && <button type="button" className="app-press h-10 w-full rounded-full border border-brand text-sm font-semibold text-brand" onClick={() => onConsult([`[운동 기록 점검 ${review.from} ~ ${review.to}]`, review.observation, review.check, ...review.exercises.slice(0, 3).map(e => `${e.name}: ${e.reason}`), "이 기록을 기준으로 다음 운동에서 바꿀 점을 상담하고 싶어요."].join("\n").slice(0, 1700))}>상담하기</button>}
  </section>;
}