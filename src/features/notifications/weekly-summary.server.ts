import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchAllPages } from "@/lib/batch";
import { hasPlan, planForProduct } from "@/features/billing/plans";
import { isEntitled, type SubscriptionState } from "@/features/billing/subscription";
import { dailyTarget } from "@/features/diet/calorie-target";
import { prEvents } from "@/features/routine/fit-growth";
import { recordVolume, type ProgressRecord } from "@/features/routine/progress";
import { parseSetDetails } from "@/features/routine/set-details";
import { restingParts } from "@/features/routine/fit-insights";
import { primaryBodyPart } from "@/features/routine/exercise-body-parts";
import { BODY_PART_LABEL, type BodyPart } from "@/features/routine/exercise-catalog-labels";
import { addDays, weekStartOf } from "@/features/routine/training-volume";
import { splitAlreadySent } from "@/features/notifications/dedup";
import { loadSentKeys } from "@/features/notifications/sent-log";
import { filterByPreference } from "@/features/notifications/preferences";
import { loadPreferences } from "@/features/notifications/preferences-data";
import {
  weeklySummaryKey,
  weeklySummaryPayload,
  type SummaryPayload,
} from "@/features/notifications/weekly-summary";

export type SummaryTarget = { userId: string; key: string; payload: SummaryPayload };

/** PR 판정에 쓰는 과거 기록 길이 — 지난 최고를 알아야 이번 주 신기록인지 안다. */
const HISTORY_DAYS = 84;
const CHUNK = 200;

const num = (v: unknown) => (v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/** 지금 라이트 이상(개인 구독) 회원 id — 서비스 롤로 구독 표 전체를 한 번 훑는다. */
export async function paidMemberIdsAll(admin: SupabaseClient): Promise<string[]> {
  const rows = await fetchAllPages<{
    user_id: string;
    product_id: string;
    state: string;
    expires_at: string | null;
    auto_renewing: boolean;
  }>((from, to) =>
    admin.from("subscriptions").select("user_id, product_id, state, expires_at, auto_renewing").range(from, to),
  );
  return rows
    .filter((r) => {
      const rec = { productId: r.product_id, state: r.state as SubscriptionState, expiresAt: r.expires_at, autoRenewing: r.auto_renewing };
      return isEntitled(rec) && hasPlan(planForProduct(r.product_id), "lite");
    })
    .map((r) => r.user_id);
}

async function inChunks<T>(ids: readonly string[], run: (part: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) out.push(...(await run(ids.slice(i, i + CHUNK))));
  return out;
}

/**
 * 일요일 '이번 주 정리' 대상과 내용. 라이트 이상 + 이번 주 안 받음 + 그 알림을 켜 둔 사람.
 * 숫자는 리포트 탭과 같은 계산(`recordVolume` · `prEvents` · 단백질 = `dailyTarget`).
 */
/** 가장 오래 쉰 부위(일주일 넘게). 기록 범위 안에 한 번도 없던 부위는 매주 같은 잔소리라 뺀다. */
function nextFocusOf(list: ProgressRecord[], today: string): { label: string; days: number } | null {
  if (list.length === 0) return null;
  const r = restingParts(list, primaryBodyPart, today).find((x) => x.days !== null);
  return r && r.days !== null ? { label: BODY_PART_LABEL[r.part as BodyPart], days: r.days } : null;
}

export async function weeklySummaryTargets(
  admin: SupabaseClient,
  todayYmd: string,
  hour: number,
): Promise<{ targets: SummaryTarget[]; deduped: number }> {
  const ids = await paidMemberIdsAll(admin);
  if (ids.length === 0) return { targets: [], deduped: 0 };
  const weekStart = weekStartOf(todayYmd);
  const prevStart = addDays(weekStart, -7);
  const from = addDays(weekStart, -HISTORY_DAYS);

  const [done, food, profiles] = await Promise.all([
    inChunks(ids, (part) =>
      fetchAllPages<Record<string, unknown>>((a, b) =>
        admin
          .from("exercise_completions")
          .select("user_id, exercise_id, for_date, sets, reps, weight_kg, set_details")
          .eq("status", "done")
          .in("user_id", part)
          .gte("for_date", from)
          .lte("for_date", todayYmd)
          .range(a, b),
      ),
    ),
    inChunks(ids, (part) =>
      fetchAllPages<Record<string, unknown>>((a, b) =>
        admin
          .from("food_logs")
          .select("user_id, for_date, protein_g")
          .in("user_id", part)
          .gte("for_date", weekStart)
          .lte("for_date", todayYmd)
          .range(a, b),
      ),
    ),
    inChunks(ids, async (part) => {
      const { data } = await admin.from("profiles").select("user_id, gender, weight_kg, height_cm").in("user_id", part);
      return (data ?? []) as Record<string, unknown>[];
    }),
  ]);

  const recs = new Map<string, ProgressRecord[]>();
  for (const r of done) {
    const id = String(r.user_id);
    const list = recs.get(id) ?? [];
    list.push({
      forDate: String(r.for_date),
      exerciseId: (r.exercise_id as string | null) ?? null,
      status: "done",
      sets: num(r.sets),
      reps: num(r.reps),
      weightKg: num(r.weight_kg),
      setDetails: parseSetDetails(r.set_details),
    });
    recs.set(id, list);
  }
  const protein = new Map<string, Map<string, number>>();
  for (const r of food) {
    const id = String(r.user_id);
    const byDay = protein.get(id) ?? new Map<string, number>();
    byDay.set(String(r.for_date), (byDay.get(String(r.for_date)) ?? 0) + (num(r.protein_g) ?? 0));
    protein.set(id, byDay);
  }
  const profileOf = new Map(profiles.map((p) => [String(p.user_id), p]));

  const key = weeklySummaryKey(weekStart);
  const all: SummaryTarget[] = ids.map((userId) => {
    const list = recs.get(userId) ?? [];
    const inRange = (a: string, b: string) => list.filter((r) => r.forDate >= a && r.forDate <= b);
    const thisWeek = inRange(weekStart, todayYmd);
    const lastWeek = inRange(prevStart, addDays(weekStart, -1));
    const vol = (rs: ProgressRecord[]) => rs.reduce((s, r) => s + recordVolume(r), 0);
    const p = profileOf.get(userId);
    const target = dailyTarget({
      gender: p?.gender === "female" ? "female" : "male",
      weightKg: num(p?.weight_kg),
      heightCm: num(p?.height_cm),
    }).protein;
    const days = protein.get(userId);
    return {
      userId,
      key,
      payload: weeklySummaryPayload({
        days: new Set(thisWeek.map((r) => r.forDate)).size,
        volumeKg: vol(thisWeek),
        prevVolumeKg: vol(lastWeek),
        prs: prEvents(list, 50).filter((e) => e.date >= weekStart).length,
        proteinHitDays: days ? [...days.values()].filter((g) => g >= target).length : null,
        nextFocus: nextFocusOf(list, todayYmd),
      }),
    };
  });

  const { fresh, deduped } = splitAlreadySent(all, await loadSentKeys(admin, all));
  const { allowed, blocked } = filterByPreference(
    fresh,
    (t) => t.userId,
    await loadPreferences(admin, fresh.map((t) => t.userId)),
    "weekly-summary",
    hour,
  );
  return { targets: allowed, deduped: deduped + blocked };
}
