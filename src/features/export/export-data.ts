import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DAY_BLOCKS, isDayBlockId } from "@/features/routine/data";
import {
  EQUIPMENT_LABELS,
  isEquipmentId,
} from "@/features/routine/exercise-catalog-labels";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { parseSetDetails } from "@/features/routine/set-details";
import {
  BACKUP_TABLES,
  type BodyExportRecord,
  type DietExportRecord,
  type WorkoutExportRecord,
} from "@/features/export/export-format";

/**
 * 사용자 데이터 내보내기 — **조회 계층** (로드맵 5.1).
 *
 * ## 왜 전부 제너레이터인가
 * 내보내기는 "그 사람이 앱을 쓴 기간 전체"를 읽는다. 화면 조회처럼 최근 15일이
 * 아니라 처음부터 끝까지다. 한 번에 배열로 모으면 **행 수만큼 메모리를 쓴다** —
 * 오래 쓴 사용자 하나가 함수 인스턴스를 넘어뜨릴 수 있고, 그 인스턴스는 Fluid
 * Compute 라 다른 요청과 공유된다. 그래서 페이지 단위로 읽어 **읽는 즉시 흘려보낸다**.
 * 라우트는 이 제너레이터를 ReadableStream 으로 감싸기만 한다.
 *
 * ## 남의 데이터는 애초에 못 읽는다
 * 모든 조회에 소유자 조건을 **명시**한다. RLS 가 이미 막지만, 조건을 코드에도 적어
 * 두면 정책이 바뀌어도 이 파일은 남의 행을 요청하지 않는다(방어 두 겹).
 *
 * ## ⚠ Supabase 클라이언트를 **밖에서 받아 온다**
 * 클라이언트를 만들려면 `cookies()` 를 읽어야 하는데, 그건 **요청 스코프 안에서만**
 * 된다. 응답 본문을 스트리밍하면 여기 코드는 Response 를 돌려준 **뒤에** 실행되므로,
 * 그때 만들려 하면 스코프가 없어 던진다 — 헤더는 이미 나갔으니 사용자에게는
 * "다운로드가 중간에 끊김" 으로 보인다(실제로 그렇게 깨졌다). 그래서 라우트가
 * 요청 스코프에서 미리 만들어 넘긴다.
 */

/** 요청 스코프에서 만들어 넘겨받는 Supabase 클라이언트. */
export type ExportClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** 한 번에 읽어 오는 행 수. 왕복 횟수와 메모리 사이의 타협점. */
const PAGE = 1000;
/**
 * 페이지 반복의 안전 상한. 정상적으로는 마지막 페이지에서 멈추지만, 드라이버가
 * 예상 밖 응답을 주더라도 무한 루프로 함수를 태우지 않게 한다(= 최대 100만 행).
 */
const MAX_PAGES = 1000;

type OwnerColumn = "user_id" | "created_by";

type TableConfig = {
  /** 내보낼 컬럼. `*` 를 쓰지 않는다 — 나중에 추가된 컬럼이 말없이 새어 나가면 안 된다. */
  columns: string;
  ownerColumn: OwnerColumn;
  /** 페이지네이션이 흔들리지 않게 **고유하거나 사실상 고유한** 정렬 기준. */
  order: string;
};

/**
 * 백업 JSON 의 구획별 조회 설정.
 *
 * 키 집합은 `EXPORT_SCOPE` 의 포함 테이블과 **정확히 같아야 한다** — 정책 표에
 * 추가만 하고 여기를 빠뜨리면 "내보낸다고 써 놓고 안 내보내는" 상태가 된다.
 * 테스트가 두 집합의 일치를 고정한다.
 */
const TABLES: Record<string, TableConfig> = {
  profiles: {
    columns:
      "gender, experience, height_cm, weight_kg, body_type, body_fat_pct, muscle_mass_kg, name, nickname, goal, target_weight_kg, target_body_fat_pct, target_muscle_kg, created_at, updated_at",
    ownerColumn: "user_id",
    order: "user_id",
  },
  user_routines: {
    columns:
      "splits, variant_id, custom_week, start_date, rest_date, override_date, override_block, created_at",
    ownerColumn: "user_id",
    order: "created_at",
  },
  routine_exercises: {
    columns:
      "id, focus, position, exercise_id, equipment, sets, reps, weight_kg, created_at",
    ownerColumn: "user_id",
    order: "id",
  },
  exercise_completions: {
    columns:
      "id, for_date, exercise_id, focus, equipment, status, sets, reps, weight_kg, set_details, created_at",
    ownerColumn: "user_id",
    order: "id",
  },
  workout_completions: {
    columns: "id, for_date, focus, calories, created_at",
    ownerColumn: "user_id",
    order: "id",
  },
  workout_sessions: {
    columns: "for_date, duration_sec, updated_at",
    ownerColumn: "user_id",
    order: "for_date",
  },
  weight_logs: {
    columns:
      "id, weight_kg, height_cm, body_fat_pct, muscle_mass_kg, created_at",
    ownerColumn: "user_id",
    order: "id",
  },
  body_compositions: {
    columns:
      "id, measured_at, weight_kg, skeletal_muscle_kg, body_fat_kg, body_fat_pct, muscle_right_arm, muscle_left_arm, muscle_trunk, muscle_right_leg, muscle_left_leg, fat_right_arm, fat_left_arm, fat_trunk, fat_right_leg, fat_left_leg, image_path, created_at",
    ownerColumn: "user_id",
    order: "id",
  },
  food_logs: {
    columns:
      "id, for_date, meal, position, name, kcal, protein_g, carbs_g, fat_g, amount, category, photo_url, eaten_at, created_at",
    ownerColumn: "user_id",
    order: "id",
  },
  custom_foods: {
    columns:
      "id, name, category, cuisine, amount, kcal, protein_g, carbs_g, fat_g, source, created_at",
    ownerColumn: "created_by",
    order: "id",
  },
  run_sessions: {
    columns:
      "id, for_date, mode, started_at, ended_at, duration_sec, distance_m, avg_kmh, pace_sec_per_km, calories_kcal, incline, route_points, created_at",
    ownerColumn: "user_id",
    order: "id",
  },
  daily_run_distance: {
    columns: "for_date, meters, updated_at",
    ownerColumn: "user_id",
    order: "for_date",
  },
  daily_steps: {
    columns: "for_date, steps, source, updated_at",
    ownerColumn: "user_id",
    order: "for_date",
  },
  cycle_logs: {
    columns: "id, for_date, is_period, flow, symptoms, note, created_at",
    ownerColumn: "user_id",
    order: "id",
  },
  commitments: {
    columns:
      "id, title, tag, metric, target, start_date, deadline, archived, mode, missions, created_at",
    ownerColumn: "user_id",
    order: "id",
  },
  gyms: {
    columns: "id, name, address, equipment_ids, created_at",
    ownerColumn: "created_by",
    order: "id",
  },
  ai_analyses: {
    columns: "id, kind, summary, points, subject, created_at",
    ownerColumn: "user_id",
    order: "id",
  },
};

/** 정책 표(`EXPORT_SCOPE`)와 이 파일이 어긋나지 않았는지 테스트가 볼 수 있게 노출. */
export const EXPORT_TABLE_NAMES = Object.keys(TABLES);

type Row = Record<string, unknown>;

/**
 * 한 테이블을 페이지 단위로 읽는다. 마지막 페이지(요청한 것보다 적게 온 페이지)에서 멈춘다.
 * 조회가 실패하면 **거기서 끊는다** — 부분만 담긴 파일을 "전체 백업" 이라고 주는 것보다,
 * 그때까지 읽은 것으로 끝내고 라우트가 오류를 남기는 편이 낫다.
 */
async function* pagesOf(
  supabase: ExportClient,
  table: string,
  config: TableConfig,
  userId: string,
): AsyncGenerator<Row[]> {
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE;
    const { data, error } = await supabase
      .from(table)
      .select(config.columns)
      .eq(config.ownerColumn, userId)
      .order(config.order, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      // 조용히 빈 구획을 주면 "기록이 없다" 와 구분이 안 된다 — 서버 로그에는 남긴다.
      console.error("[export] query failed", table, error.message);
      return;
    }
    const rows = (data ?? []) as unknown as Row[];
    if (rows.length > 0) yield rows;
    if (rows.length < PAGE) return;
  }
}

// ─────────────────────────────────────────────────────────────
// CSV 세 종류
// ─────────────────────────────────────────────────────────────

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const str = (v: unknown): string | null =>
  typeof v === "string" && v !== "" ? v : null;

/** 부위 코드를 사람이 읽는 이름으로. 모르는 코드는 그대로 둔다(지우면 정보가 준다). */
function focusLabelOf(focus: string | null): string | null {
  if (!focus) return null;
  return isDayBlockId(focus) ? DAY_BLOCKS[focus].label : focus;
}

function equipmentLabelOf(equipment: string | null): string | null {
  if (!equipment) return null;
  return isEquipmentId(equipment) ? EQUIPMENT_LABELS[equipment] : equipment;
}

/** 운동 기록 — 완료·건너뜀 전부. 오래된 날짜부터. */
export async function* workoutRecords(
  supabase: ExportClient,
  userId: string,
): AsyncGenerator<WorkoutExportRecord[]> {
  for await (const rows of pagesOf(
    supabase,
    "exercise_completions",
    // 화면과 달리 **전 기간**을 날짜 순으로 준다 — 파일은 위에서 아래로 읽는다.
    { ...TABLES.exercise_completions, order: "for_date" },
    userId,
  )) {
    yield rows.map((r) => {
      const exerciseId = str(r.exercise_id);
      return {
        forDate: String(r.for_date),
        exerciseId,
        exerciseName: exerciseId
          ? (getCatalogExercise(exerciseId)?.name ?? exerciseId)
          : null,
        focusLabel: focusLabelOf(str(r.focus)),
        equipmentLabel: equipmentLabelOf(str(r.equipment)),
        status: r.status === "skipped" ? "skipped" : "done",
        sets: num(r.sets),
        reps: num(r.reps),
        weightKg: num(r.weight_kg),
        setDetails: parseSetDetails(r.set_details),
      } satisfies WorkoutExportRecord;
    });
  }
}

/**
 * 체중·체성분 — **두 테이블을 한 표로** 낸다.
 *
 * 사용자에게는 "내 몸 기록" 하나지, 인바디로 잰 것과 체중계로 잰 것이 다른 파일일
 * 이유가 없다. 대신 `출처` 칸으로 어느 쪽인지 남긴다. 각 테이블은 날짜 순으로
 * 나오지만 둘을 이어 붙이므로 파일 전체가 날짜 순은 아니다 — 스프레드시트에서
 * 정렬하면 되고, 그러려고 병합하면서 전부 메모리에 쌓을 이유는 없다.
 */
export async function* bodyRecords(
  supabase: ExportClient,
  userId: string,
): AsyncGenerator<BodyExportRecord[]> {
  for await (const rows of pagesOf(
    supabase,
    "body_compositions",
    { ...TABLES.body_compositions, order: "measured_at" },
    userId,
  )) {
    yield rows.map((r) => ({
      date: String(r.measured_at),
      source: "체성분 측정" as const,
      weightKg: num(r.weight_kg),
      skeletalMuscleKg: num(r.skeletal_muscle_kg),
      bodyFatKg: num(r.body_fat_kg),
      bodyFatPct: num(r.body_fat_pct),
      muscleRightArm: num(r.muscle_right_arm),
      muscleLeftArm: num(r.muscle_left_arm),
      muscleTrunk: num(r.muscle_trunk),
      muscleRightLeg: num(r.muscle_right_leg),
      muscleLeftLeg: num(r.muscle_left_leg),
      fatRightArm: num(r.fat_right_arm),
      fatLeftArm: num(r.fat_left_arm),
      fatTrunk: num(r.fat_trunk),
      fatRightLeg: num(r.fat_right_leg),
      fatLeftLeg: num(r.fat_left_leg),
    }));
  }
  for await (const rows of pagesOf(
    supabase,
    "weight_logs",
    { ...TABLES.weight_logs, order: "created_at" },
    userId,
  )) {
    yield rows.map((r) => ({
      // 체중 기록은 시각까지 있지만 표에서는 날짜만 본다(같은 날 여러 번도 그대로 남는다).
      date: String(r.created_at).slice(0, 10),
      source: "체중 기록" as const,
      weightKg: num(r.weight_kg),
      bodyFatPct: num(r.body_fat_pct),
      muscleMassKg: num(r.muscle_mass_kg),
    }));
  }
}

/** 식단 — 날짜·끼니 순. */
export async function* dietRecords(
  supabase: ExportClient,
  userId: string,
): AsyncGenerator<DietExportRecord[]> {
  for await (const rows of pagesOf(
    supabase,
    "food_logs",
    { ...TABLES.food_logs, order: "for_date" },
    userId,
  )) {
    yield rows.map((r) => ({
      forDate: String(r.for_date),
      meal: String(r.meal),
      eatenAt: str(r.eaten_at),
      name: String(r.name ?? ""),
      amount: str(r.amount),
      kcal: num(r.kcal),
      carbsG: num(r.carbs_g),
      proteinG: num(r.protein_g),
      fatG: num(r.fat_g),
      category: str(r.category),
    }));
  }
}

// ─────────────────────────────────────────────────────────────
// 전체 백업(JSON)
// ─────────────────────────────────────────────────────────────

export type BackupSection = { table: string; rows: Row[] };

/**
 * 백업 구획을 **정책 표 순서대로** 하나씩 흘려보낸다.
 * 한 테이블이 여러 페이지면 페이지마다 따로 나오고, 라우트가 이어 붙인다.
 */
export async function* backupSections(
  supabase: ExportClient,
  userId: string,
): AsyncGenerator<BackupSection> {
  for (const table of BACKUP_TABLES) {
    const config = TABLES[table];
    // 정책 표에만 있고 조회 설정이 없으면 조용히 건너뛰지 않고 빈 구획을 남긴다 —
    // 파일에 키가 있는데 비어 있으면 "설정이 빠졌다" 를 바로 알 수 있다.
    if (!config) {
      yield { table, rows: [] };
      continue;
    }
    let any = false;
    for await (const rows of pagesOf(supabase, table, config, userId)) {
      any = true;
      yield { table, rows };
    }
    if (!any) yield { table, rows: [] };
  }
}
