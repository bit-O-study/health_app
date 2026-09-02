"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  pickNewBodyLogs,
  type BodyEntry,
  type ExistingBodyLog,
} from "@/features/health/body-import";

/** 한 번에 받을 수 있는 줄 수 — 30일치 체중계 기록보다 넉넉하되 무제한은 아니게. */
const MAX_ENTRIES = 200;

export type BodyImportResult = {
  /** 실제로 새로 저장한 줄 수. */
  inserted: number;
  /** 이미 있어서 건너뛴 줄 수 — "0건 저장"이 실패로 보이지 않게 함께 알린다. */
  skipped: number;
  ok: boolean;
};

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/**
 * Health Connect 에서 읽은 체중·체성분을 앱 기록에 넣는다 — 로드맵 6.1.
 *
 * 🔴 **이미 있는 것은 안 넣는다.** `weight_logs` 에는 출처 칸도 고유 키도 없어서,
 * 동기화를 누를 때마다 같은 측정이 새 줄로 쌓이면 체형 그래프가 같은 점을 여러 번
 * 찍는다. 겹침 판정은 순수 모듈(`pickNewBodyLogs`)이 하고 여기서는 **비교에 필요한
 * 기존 기록만** 읽어 넘긴다(전부 읽지 않는다 — 오래 쓴 사용자일수록 커진다).
 *
 * 던지지 않는다 — 건강 연동 실패가 앱을 막으면 안 된다(`ok:false` 로만 알린다).
 */
export async function importBodyLogsAction(
  entries: BodyEntry[],
): Promise<BodyImportResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, inserted: 0, skipped: 0 };

    // 클라이언트가 보낸 값은 그대로 믿지 않는다 — 모양·개수만 통과시킨다.
    const clean = (Array.isArray(entries) ? entries : [])
      .filter(
        (e): e is BodyEntry =>
          !!e &&
          typeof e.measuredAt === "string" &&
          !Number.isNaN(new Date(e.measuredAt).getTime()) &&
          (isNum(e.weightKg) || isNum(e.bodyFatPct) || isNum(e.muscleMassKg)),
      )
      .slice(0, MAX_ENTRIES);
    if (clean.length === 0) return { ok: true, inserted: 0, skipped: 0 };

    const supabase = await createSupabaseServerClient();

    // 비교 범위 = 들어온 것 중 가장 이른 측정 시각부터. 그보다 과거는 겹칠 수 없다.
    const since = clean
      .map((e) => e.measuredAt)
      .reduce((a, b) => (a < b ? a : b));
    const { data } = await supabase
      .from("weight_logs")
      .select("created_at, weight_kg")
      .eq("user_id", user.id)
      .gte("created_at", since);

    const existing: ExistingBodyLog[] = (
      (data ?? []) as { created_at: string; weight_kg: number | string | null }[]
    ).map((r) => ({
      createdAt: r.created_at,
      weightKg: r.weight_kg === null ? null : Number(r.weight_kg),
    }));

    const fresh = pickNewBodyLogs(existing, clean);
    if (fresh.length === 0) {
      return { ok: true, inserted: 0, skipped: clean.length };
    }

    const { error } = await supabase.from("weight_logs").insert(
      fresh.map((e) => ({
        user_id: user.id,
        // 측정 시각이 그래프의 x축이다 — 저장 시각으로 덮으면 어제 잰 값이 오늘로 온다.
        created_at: e.measuredAt,
        weight_kg: e.weightKg,
        body_fat_pct: e.bodyFatPct,
        muscle_mass_kg: e.muscleMassKg,
      })),
    );
    if (error) return { ok: false, inserted: 0, skipped: 0 };

    revalidatePath("/settings/body-composition");
    revalidatePath("/calendar");
    return { ok: true, inserted: fresh.length, skipped: clean.length - fresh.length };
  } catch {
    return { ok: false, inserted: 0, skipped: 0 };
  }
}
