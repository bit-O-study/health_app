import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyEnabled } from "@/features/notifications/push-fanout";
import {
  buildCronRun,
  failureReason,
  type CronCounts,
  type CronName,
  type CronRunRow,
  type CronStatus,
} from "@/lib/cron/run-log";

/** 크론 본체가 돌려주는 것 — 기록할 수치와 응답에 실을 값. */
export type CronResult = {
  counts?: CronCounts;
  /** 응답 JSON 에 그대로 합쳐진다(기존 응답 모양 유지용). */
  body?: Record<string, unknown>;
};

/**
 * 모든 크론 라우트의 공통 껍데기 — 인증·사전조건·시간측정·실행기록을 한 곳에서.
 *
 * 라우트마다 같은 코드(`CRON_SECRET` 확인 → admin 클라이언트 → 푸시 설정 확인)를
 * 복사해 두면 한 곳만 고쳐지고 나머지는 남는다. 무엇보다 **실행 흔적이 없었다** —
 * 성공했는지, 몇 명에게 갔는지, 왜 죽었는지 아무도 몰랐다. 여기서 `cron_runs` 에 남긴다.
 *
 * 기록 자체가 실패해도 크론 결과는 그대로 돌려준다(관측 때문에 기능이 죽으면 안 된다).
 */
export async function handleCron(
  req: Request,
  name: CronName,
  run: (admin: SupabaseClient) => Promise<CronResult>,
): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  // 인증 실패는 기록하지 않는다 — 외부에서 아무나 행을 쌓을 수 있으면 그게 구멍이다.
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const startedAt = Date.now();
  const admin = createSupabaseAdminClient();
  if (!admin) {
    // 남길 곳(=DB)이 없다. 응답으로만 알린다.
    return NextResponse.json(
      { ok: false, reason: "admin not configured" },
      { status: 200 },
    );
  }

  if (!notifyEnabled()) {
    await record(admin, {
      name,
      status: "skipped",
      startedAt,
      reason: "push not configured",
    });
    return NextResponse.json(
      { ok: false, reason: "push/admin not configured" },
      { status: 200 },
    );
  }

  try {
    const result = await run(admin);
    await record(admin, {
      name,
      status: "ok",
      startedAt,
      counts: result.counts,
    });
    return NextResponse.json({ ok: true, ...(result.body ?? {}) });
  } catch (err) {
    const reason = failureReason(err);
    await record(admin, { name, status: "error", startedAt, reason });
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}

async function record(
  admin: SupabaseClient,
  input: {
    name: string;
    status: CronStatus;
    startedAt: number;
    counts?: CronCounts;
    reason?: string | null;
  },
): Promise<void> {
  const row = buildCronRun({ ...input, finishedAt: Date.now() });
  await recordCronRun(admin, row);
}

/** `cron_runs` 에 한 행. 실패해도 조용히 넘어간다(크론 결과를 뒤엎지 않는다). */
export async function recordCronRun(
  admin: SupabaseClient,
  row: CronRunRow,
): Promise<void> {
  try {
    await admin.from("cron_runs").insert(row);
  } catch {
    // 관측 실패가 기능 실패가 되면 안 된다.
  }
}
