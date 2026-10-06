import type { BodyInput, Prediction } from "@/features/commitments/prediction";
import { BODY_PART_LABEL } from "@/features/routine/exercise-catalog-labels";

const sign = (v: number) => (v > 0 ? `+${v}` : `${v}`);

/**
 * 예상 결과 — **필요한 다짐이 있을 때만** 숫자를 보여 준다(체중 = 식단 kcal, 근육 = 근력 + 단백질).
 * 없으면 무엇을 추가하면 보이는지 안내한다. 체중 하나가 아니라 체지방·근육·수분으로 나눠
 * 보여 줘야 근력 다짐을 넣는 이유가 보인다.
 */
export function PredictionCard({ pred, body }: { pred: Prediction; body: BodyInput }) {
  const hasWeight = pred.weightKg !== null;
  const hasMuscle = pred.muscleKg !== null;
  return (
    <section className="app-card space-y-3 p-4" data-testid="prediction">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold">이 다짐을 지키면 ({pred.days}일 뒤 예상)</h2>
        {pred.calibrated ? <span className="text-xs text-brand">내 지난 결과로 보정</span> : null}
      </div>

      {hasWeight ? (
        <div data-testid="pred-weight">
          <p className="text-2xl font-bold tabular-nums">
            체중 {sign(pred.weightKg!)}kg
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            범위 {sign(pred.weightRange![0])} ~ {sign(pred.weightRange![1])}kg · {body.weightKg}kg →{" "}
            {Math.round((body.weightKg + pred.weightKg!) * 10) / 10}kg
          </p>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="체지방" value={`${sign(pred.fatKg!)}kg`} />
            <Stat label="제지방(근육)" value={`${sign(pred.leanKg!)}kg`} />
            <Stat label="수분·글리코겐" value={`${sign(pred.waterKg!)}kg`} />
          </dl>
          <p className="mt-1 text-xs text-zinc-500">
            시작·끝 체중은 각각 7일 평균으로 비교해요 — 주 2번 이상 체중을 기록해 주세요.
          </p>
          {pred.leanKg! < 0 ? (
            <p className="mt-1 text-xs font-semibold text-warn">
              근육도 같이 빠져요 — 근력운동과 단백질 다짐을 넣으면 지킬 수 있어요.
            </p>
          ) : null}
        </div>
      ) : null}

      {hasMuscle ? (
        <div data-testid="pred-muscle">
          <p className="text-lg font-bold tabular-nums">
            골격근 {sign(pred.muscleKg!)}kg
            <span className="ml-1 text-xs font-normal text-zinc-500">
              ({pred.muscleRange![0]}~{pred.muscleRange![1]}kg)
            </span>
          </p>
          {pred.baseline.skeletalMuscleKg !== null ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              지금 {pred.baseline.skeletalMuscleKg}kg →{" "}
              {Math.round((pred.baseline.skeletalMuscleKg + pred.muscleKg!) * 100) / 100}kg (인바디 기준)
            </p>
          ) : null}
          {pred.segments.length > 0 ? (
            <ul className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
              {pred.segments.map((s) => (
                <li key={s.segment} className="rounded-full bg-brand-soft px-2.5 py-1 font-semibold text-brand">
                  {s.label} {s.nowKg !== null ? `${s.nowKg}kg ` : ""}
                  {sign(s.gainKg)}kg
                </li>
              ))}
            </ul>
          ) : null}
          {pred.days < 60 ? (
            <p className="mt-1 text-xs text-zinc-500" data-testid="muscle-noise-note">
              {pred.days}일 근육 변화는 인바디 오차(±0.5~1kg)보다 작아 재도 잘 안 보일 수 있어요 — 60일 이상 다짐에서
              확인해 보세요.
            </p>
          ) : null}
          {pred.parts.length > 0 ? (
            <p className="mt-1 text-xs text-zinc-500">
              {pred.parts.map((p) => BODY_PART_LABEL[p]).join("·")} 근육이 커지는 다짐이에요
            </p>
          ) : null}
        </div>
      ) : null}

      {pred.hints.length > 0 ? (
        <ul className="space-y-0.5" data-testid="pred-hints">
          {pred.hints.map((h) => (
            <li key={h} className="text-xs text-zinc-500 dark:text-zinc-400">
              {h}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="border-t border-[var(--line)] pt-2 text-xs leading-4 text-zinc-400">
        기초대사 {pred.baseline.bmr.toLocaleString()}kcal · 체지방 {pred.baseline.bodyFatPct}%
        {pred.baseline.bodyFatMeasured ? "(측정)" : "(추정)"}
        {pred.baseline.metabolicFactor ? ` · 내 기록 대사 보정 ×${pred.baseline.metabolicFactor}` : ""} · 예상치이며
        실제와 다를 수 있어요
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 py-1.5 dark:bg-white/[0.04]">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-bold tabular-nums">{value}</dd>
    </div>
  );
}
