/**
 * 주기에 맞춘 운동 강도 한 줄(라이트, 2026-10-08) — 순수 로직, AI 없음. 의료 조언이 아니라 참고용.
 *
 * 생리 기록이 있는 회원에게 '오늘 운동을 어떻게 하면 좋은지'를 주기 단계로 한 줄.
 * 예측은 `predictCycle`(평균 주기·배란일) 그대로 쓴다.
 */
import type { CyclePrediction } from "@/features/cycle/cycle-predict";

export type CyclePhase = "period" | "follicular" | "ovulation" | "luteal" | "premenstrual";
export type CycleTip = { phase: CyclePhase; title: string; tip: string };

const epochDay = (ymd: string) => Math.floor(Date.parse(`${ymd}T00:00:00Z`) / 86_400_000);

/**
 * 오늘의 주기 단계와 운동 팁. 기록이 없거나 너무 오래돼(마지막 시작이 평균 주기 두 번보다 전) 믿기 어려우면 null.
 */
export function cycleTrainingTip(pred: CyclePrediction, today: string): CycleTip | null {
  if (!pred.lastStart || pred.dayOfCycle == null || pred.daysUntilNext == null || !pred.ovulation) return null;
  if (pred.dayOfCycle > pred.avgCycle * 2) return null;
  // 지난 주기에서 굴려 온 예측이면 '오늘 몇 일차'는 이번 주기 기준으로 다시 센다.
  const day = ((pred.dayOfCycle - 1) % pred.avgCycle) + 1;
  if (day <= pred.avgPeriod) {
    return {
      phase: "period",
      title: `생리 ${day}일차예요`,
      tip: "몸이 무거우면 무게를 평소의 90% 정도로, 세트를 하나 줄여도 괜찮아요. 가벼운 유산소는 생리통에 도움이 될 수 있어요.",
    };
  }
  if (pred.daysUntilNext <= 3) {
    return {
      phase: "premenstrual",
      title: `생리 예정 ${pred.daysUntilNext}일 전이에요`,
      tip: "붓기·피로가 올 수 있어요. 무게 욕심보다 자세와 반복 수에 집중해 보세요.",
    };
  }
  const toOvulation = epochDay(pred.ovulation) - epochDay(today);
  if (Math.abs(toOvulation) <= 1) {
    return {
      phase: "ovulation",
      title: "배란기 무렵이에요",
      tip: "힘은 잘 나지만 관절이 느슨해질 수 있어요. 무거운 무게는 워밍업을 충분히 하고 들어가세요.",
    };
  }
  if (toOvulation > 1) {
    return {
      phase: "follicular",
      title: "힘이 잘 나는 때예요",
      tip: "회복이 빨라 무게를 올리거나 신기록에 도전하기 좋아요.",
    };
  }
  return {
    phase: "luteal",
    title: "같은 무게도 힘들 수 있는 때예요",
    tip: "체온·심박이 조금 오르는 시기라 세트 사이 휴식을 30초쯤 길게 잡아 보세요.",
  };
}
