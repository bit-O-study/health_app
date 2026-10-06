"use client";

import { Capacitor } from "@capacitor/core";
import { getHealthPlugin, withTimeout } from "./health-plugin";
import { connectSteps } from "./steps-native";
import { saveStepsDaysAction } from "./steps-actions";
import { summarizeHeartRate } from "./heart-rate";

export type WatchMetric = "steps" | "heartRate" | "workouts";
export type WatchWorkout = { name: string; start: string; minutes: number; source?: string };
export type WatchResult = { message: string; workouts?: WatchWorkout[] };

function minutesBetween(start: string, end: string): number {
  return Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 60000));
}

/** Read only on an explicit tap, one permission scope at a time. Never claim a paired watch. */
export async function syncWatchMetric(metric: WatchMetric): Promise<WatchResult> {
  const platform = Capacitor.getPlatform();
  if (platform !== "ios" && platform !== "android") {
    throw new Error("워치 기록은 iPhone 또는 Android 앱에서 동기화할 수 있어요.");
  }
  const end = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(end);
  const start = metric === "steps" ? new Date(today + "T00:00:00+09:00") : new Date(end.getTime() - 7 * 86400000);
  if (platform === "ios") {
    const { Health } = await import("@capgo/capacitor-health");
    if (!(await Health.isAvailable()).available) throw new Error("이 기기에서는 Apple 건강을 사용할 수 없어요.");
    await Health.requestAuthorization({ read: [metric], write: [] });
    // HealthKit intentionally hides whether READ was granted. Empty is not 'connected'.
    if (metric === "workouts") {
      const result = await Health.queryWorkouts({ startDate: start.toISOString(), endDate: end.toISOString(), limit: 50 });
      return { message: "최근 7일 운동 기록 · 최대 50개", workouts: result.workouts.map((w) => ({ name: w.workoutType, start: w.startDate, minutes: minutesBetween(w.startDate, w.endDate), source: w.sourceName })) };
    }
    const { samples } = await Health.queryAggregated({ dataType: metric, startDate: start.toISOString(), endDate: end.toISOString(), bucket: "day", aggregation: metric === "steps" ? "sum" : "average" });
    const valid = samples.filter((s) => Number.isFinite(s.value) && s.value > 0);
    if (!valid.length) return { message: "읽을 수 있는 기록이 없어요. Apple 건강의 접근 허용과 워치 동기화를 확인해 주세요." };
    if (metric === "steps") {
      const count = Math.round(valid.reduce((n, s) => n + s.value, 0));
      const saved = await saveStepsDaysAction({ [today]: count }, "apple-health");
      if (!saved.ok) throw new Error("걸음 기록을 저장하지 못했어요. 다시 시도해 주세요.");
      return { message: "오늘 " + count.toLocaleString() + "걸음 · 캘린더에 반영했어요." };
    }
    const latest = valid.sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
    return { message: "최근 기록일 평균 " + Math.round(latest.value) + " bpm · " + new Date(latest.startDate).toLocaleDateString("ko-KR") + " (실시간 아님)" };
  }
  if (metric === "steps") {
    const result = await connectSteps();
    if (!result.ok) throw new Error(result.reason);
    const saved = await saveStepsDaysAction(result.byDay ?? { [today]: result.steps });
    if (!saved.ok) throw new Error("걸음 기록을 저장하지 못했어요. 다시 시도해 주세요.");
    return { message: "오늘 " + result.steps.toLocaleString() + "걸음 · 캘린더에 반영했어요." };
  }
  const hc = await getHealthPlugin();
  if (!hc?.requestHealthPermissions) throw new Error("건강 연동을 지원하는 최신 앱을 설치해 주세요.");
  const type = metric === "heartRate" ? "HeartRateSeries" : "ExerciseSession";
  const permission = await hc.requestHealthPermissions({ read: [type], write: [] });
  const key = metric === "heartRate" ? "heartrate" : "exercise";
  if (!(permission.grantedPermissions ?? []).some((p) => p.toLowerCase().replace(/[^a-z]/g, "").includes(key) && !p.toLowerCase().includes("write"))) throw new Error("선택한 항목의 읽기 권한을 허용해 주세요.");
  const result = await withTimeout(hc.readRecords({ type, timeRangeFilter: { type: "between", startTime: start, endTime: end } }), 8000, null);
  if (!result) throw new Error("동기화가 지연되고 있어요. 잠시 후 다시 시도해 주세요.");
  if (metric === "heartRate") {
    const summary = summarizeHeartRate(result.records ?? [], start, end);
    return { message: summary ? "최근 7일 평균 " + summary.averageBpm + " bpm · 최고 " + summary.maxBpm + " bpm (실시간 아님)" : "심박 기록이 없어요. 삼성헬스와 Health Connect 동기화를 확인해 주세요." };
  }
  return { message: "최근 7일 운동 기록 · 최대 50개", workouts: (result.records ?? []).filter((r) => r.startTime && r.endTime).map((r) => ({ name: r.title || "워치 운동", start: new Date(r.startTime!).toISOString(), minutes: minutesBetween(new Date(r.startTime!).toISOString(), new Date(r.endTime!).toISOString()), source: r.metadata?.dataOrigin ?? undefined })).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 50) };
}
