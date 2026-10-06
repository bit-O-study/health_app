"use client";

/**
 * 끝난 런닝 저장 — 실내·야외 공용(2026-09-28 런닝 모드 고도화 1단계 · 데이터 안전).
 *
 * 🔴 예전: 이어하기용 체크포인트를 **먼저 지우고** 서버 저장 3개를 던진 뒤 실패는 삼켰다.
 *    종료 순간 신호가 없으면(지하·산) 그 런닝은 어디에도 남지 않았다.
 * 지금: ① 기기 대기 큐에 먼저 적는다 → ② 적혔으면 체크포인트는 필요 없으니 지운다 →
 *       ③ 서버에 보낸다 → ④ 성공하면 큐에서 뺀다. 실패하면 큐에 남아 연결이 돌아올 때
 *       전역 오프라인 배너가 다시 보낸다(client_session_id 로 서버가 중복을 막는다).
 */
import { writeRunHealthRecords } from "@/features/health/run-write";
import { readRunHeartRate } from "@/features/health/heart-rate";
import { seoulYmd } from "@/features/routine/data";
import {
  recordRunHeartRateAction,
  recordRunSessionAction,
} from "@/features/running/run-record-actions";
import { writeRunCheckpoint } from "@/features/running/run-checkpoint";
import { runSessionDate, type RunSessionInput } from "@/features/running/run-session";
import type { RunRecordKind } from "@/features/running/run-guide";
import { dequeuePending, enqueuePending, isPendingStored } from "@/lib/offline/pending-queue";
import { pendingKey } from "@/lib/offline/pending-writes";

export type FinishedRun = RunSessionInput & { clientSessionId: string };

/** 'saved' = 서버에 저장됨, 'queued' = 기기에 보관(연결되면 자동 저장). */
export type RunSaveResult = "saved" | "queued";

/** 저장 결과 + (저장됐으면) 기록 id·개인 최고 — 종료 화면의 링크와 배지(2026-09-29 3단계). */
export type RunSaveOutcome = { state: RunSaveResult; runId?: string; records?: RunRecordKind[] };

export async function saveFinishedRun(session: FinishedRun, label: string): Promise<RunSaveOutcome> {
  const key = pendingKey({ kind: "run", clientSessionId: session.clientSessionId });
  enqueuePending({
    kind: "run",
    key,
    name: label,
    session,
    forDate: runSessionDate(session.startedAt) ?? seoulYmd(),
    queuedAt: Date.now(),
  });
  // 기기 저장소에 실제로 적혔을 때만 체크포인트를 지운다 — 저장소가 막힌 기기(시크릿 모드 등)면
  // 체크포인트가 마지막 보루로 남아 다음에 '이어하기'로 되살릴 수 있다.
  if (isPendingStored(key)) writeRunCheckpoint(null);

  let result: Awaited<ReturnType<typeof recordRunSessionAction>>;
  try {
    result = await recordRunSessionAction(session);
  } catch {
    return { state: "queued" };
  }
  if (!result.ok) return { state: "queued" };
  dequeuePending(key);
  writeRunCheckpoint(null);

  // Health Connect(안드로이드) — 처음 저장된 런닝만. 실패해도 기록엔 영향 없음.
  if (result.health) {
    const health = result.health;
    void (async () => {
      await writeRunHealthRecords(health);
      const heartRate = await readRunHeartRate(health.startedAt, health.endedAt);
      if (heartRate.ok && heartRate.summary) {
        await recordRunHeartRateAction({
          clientSessionId: session.clientSessionId,
          averageBpm: heartRate.summary.averageBpm,
          maxBpm: heartRate.summary.maxBpm,
          sampleCount: heartRate.summary.sampleCount,
        });
      }
    })().catch(() => {});
  }
  return { state: "saved", runId: result.id, records: result.records ?? [] };
}

/** 종료 화면 한 줄 — 긴 요약은 넣지 않는다(사용자 요청), 저장 상태만. */
export function runSaveMessage(state: RunSaveResult | "saving" | null): string | null {
  if (state === "saving") return "저장 중…";
  if (state === "saved") return "기록을 저장했어요.";
  if (state === "queued") return "신호가 약해 기기에 보관했어요. 연결되면 자동으로 저장돼요.";
  return null;
}
