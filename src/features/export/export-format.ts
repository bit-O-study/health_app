/**
 * 사용자 데이터 내보내기 — **순수 포맷 계층** (로드맵 5.1).
 *
 * 여기엔 DB·네트워크 의존이 없다. "행을 받아 파일 한 줄로 만든다" 만 한다.
 * 조회는 `export-data.ts`(server-only), 전달은 `/api/export/[kind]` 가 맡는다.
 *
 * 지켜야 할 것 세 가지 —
 *
 *  1) **한글이 깨지지 않아야 한다.** 엑셀은 UTF-8 CSV 를 열 때 BOM 이 없으면
 *     시스템 코드페이지(한국은 CP949)로 읽어 전부 깨진다. 내보내는 CSV 는
 *     **반드시 `CSV_BOM` 으로 시작**한다. 파일 이름도 마찬가지라, 한글 이름은
 *     `filename*=UTF-8''` 로 따로 실어 보낸다(구형 클라이언트용 ASCII 이름과 병기).
 *
 *  2) **CSV 는 표가 아니라 문자열이다.** 음식 이름·메모는 사용자가 쓴 값이라
 *     쉼표·따옴표·줄바꿈이 그대로 들어온다. RFC4180 대로 감싸지 않으면 열이 밀린다.
 *
 *  3) **내보낸 파일은 남의 엑셀에서 열린다.** `=`·`+`·`@` 로 시작하는 값을 그대로
 *     쓰면 엑셀이 **수식으로 해석**한다(CSV 인젝션). 앞에 작은따옴표를 붙여 글자로
 *     못박는다 — 단, 숫자로 읽히는 값은 건드리지 않는다(-3 은 그냥 -3 이어야 한다).
 */

import { recordVolume, type ProgressRecord } from "@/features/routine/progress";
import type { SetDetail } from "@/features/routine/set-details";

/** 엑셀이 UTF-8 로 읽게 하는 표식. CSV 본문 맨 앞에 한 번만 붙인다. */
export const CSV_BOM = "\uFEFF";

/** RFC4180 의 줄바꿈. 엑셀·구글시트 모두 이걸 기대한다. */
export const CSV_EOL = "\r\n";

export type Cell = string | number | null | undefined;

/** 수식으로 해석될 수 있는 시작 문자들. */
const FORMULA_START = /^[=+\-@\t\r]/;
/** 숫자로 읽히는 문자열은 수식이 아니다 — 가드를 붙이면 오히려 값이 망가진다. */
const NUMERIC = /^-?\d+(\.\d+)?$/;
/** 따옴표로 감싸야 하는 경우 — 구분자·따옴표·줄바꿈, 그리고 앞뒤 공백. */
const NEEDS_QUOTE = /[",\r\n]|^\s|\s$/;

/** 한 칸. null/undefined 는 빈 칸(0 이 아니다 — 기록이 없는 것과 0 은 다르다). */
export function csvCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  let text = value;
  if (FORMULA_START.test(text) && !NUMERIC.test(text)) text = `'${text}`;
  if (NEEDS_QUOTE.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

/** 한 줄(줄바꿈 포함). 스트리밍 응답이 한 줄씩 흘려보낼 수 있게 분리해 둔다. */
export function csvLine(cells: Cell[]): string {
  return cells.map(csvCell).join(",") + CSV_EOL;
}

/** 전체 CSV 문자열(BOM + 머리글 + 본문). 작은 표·테스트용. */
export function toCsv(headers: string[], rows: Cell[][]): string {
  return CSV_BOM + csvLine(headers) + rows.map(csvLine).join("");
}

// ─────────────────────────────────────────────────────────────
// 내보내기 종류
// ─────────────────────────────────────────────────────────────

export type ExportKind = "workouts" | "body" | "diet" | "backup";

export type ExportKindMeta = {
  /** 화면에 보이는 이름. */
  label: string;
  /** 무엇이 들어 있는지 한 줄 설명. */
  description: string;
  ext: "csv" | "json";
  contentType: string;
  /** 한글을 못 읽는 클라이언트가 받을 이름의 앞부분. */
  asciiBase: string;
  /** 실제로 저장될 이름의 앞부분. */
  displayBase: string;
};

export const EXPORT_KINDS: Record<ExportKind, ExportKindMeta> = {
  workouts: {
    label: "운동 기록",
    description: "완료·건너뜀 운동을 날짜별로. 세트별 기록과 볼륨까지.",
    ext: "csv",
    contentType: "text/csv; charset=utf-8",
    asciiBase: "helssu-workouts",
    displayBase: "헬쑤-운동기록",
  },
  body: {
    label: "체중·체성분",
    description: "체중 기록과 인바디 측정(부위별 근육·지방)을 한 표로.",
    ext: "csv",
    contentType: "text/csv; charset=utf-8",
    asciiBase: "helssu-body",
    displayBase: "헬쑤-체중체성분",
  },
  diet: {
    label: "식단 기록",
    description: "끼니별 음식과 칼로리·탄단지.",
    ext: "csv",
    contentType: "text/csv; charset=utf-8",
    asciiBase: "helssu-diet",
    displayBase: "헬쑤-식단기록",
  },
  backup: {
    label: "전체 데이터 백업",
    description: "위 CSV 를 포함한 내 데이터 전부. 사람이 읽기보다 보관용.",
    ext: "json",
    contentType: "application/json; charset=utf-8",
    asciiBase: "helssu-backup",
    displayBase: "헬쑤-전체백업",
  },
};

export function isExportKind(value: unknown): value is ExportKind {
  return typeof value === "string" && value in EXPORT_KINDS;
}

/** 날짜가 붙은 파일 이름 두 벌(ASCII / 표시용). */
export function exportFilename(
  kind: ExportKind,
  ymd: string,
): { ascii: string; display: string } {
  const meta = EXPORT_KINDS[kind];
  return {
    ascii: `${meta.asciiBase}-${ymd}.${meta.ext}`,
    display: `${meta.displayBase}-${ymd}.${meta.ext}`,
  };
}

/**
 * `Content-Disposition` 헤더 값.
 *
 * `filename=` 은 ASCII 만 안전하다 — 한글을 그대로 넣으면 브라우저마다 다르게
 * 깨진다. RFC5987 의 `filename*=UTF-8''` 로 한글 이름을 싣고, 그걸 못 읽는
 * 클라이언트를 위해 ASCII 이름을 함께 둔다(둘 다 있으면 `filename*` 이 이긴다).
 */
export function contentDisposition(kind: ExportKind, ymd: string): string {
  const { ascii, display } = exportFilename(kind, ymd);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(display)}`;
}

// ─────────────────────────────────────────────────────────────
// 내보내기 범위 — 개인정보 정책을 **데이터로** 둔다
// ─────────────────────────────────────────────────────────────

export type ScopeEntry = {
  /** DB 테이블. 백업 JSON 의 구획 이름이기도 하다. */
  table: string;
  label: string;
  included: boolean;
  /** 왜 넣었는지 / 왜 뺐는지. 화면에 그대로 보여 준다. */
  reason: string;
};

/**
 * 무엇을 내보내고 무엇을 빼는가.
 *
 * 원칙 둘 —
 *  - **내 것만.** 남이 쓴 댓글·응원은 내 화면에 보였더라도 내 데이터가 아니다.
 *  - **열쇠는 빼고.** 푸시 토큰·일회용 비밀번호는 유출되면 그 자체로 피해가 된다.
 *    "내 데이터니까 전부" 가 아니라, 내보내서 **위험해지는 것은 뺀다**.
 *
 * 이 목록이 곧 정책 문서다. `/settings/export` 화면과 백업 JSON 구성이 모두
 * 여기를 읽으므로, 표만 고치면 화면·파일·테스트가 함께 따라온다.
 */
export const EXPORT_SCOPE: ScopeEntry[] = [
  {
    table: "profiles",
    label: "프로필",
    included: true,
    reason: "닉네임·성별·경력·목표 등 내가 입력한 값",
  },
  {
    table: "user_routines",
    label: "내 루틴",
    included: true,
    reason: "분할·시작일·직접 짠 주간 구성",
  },
  {
    table: "routine_exercises",
    label: "루틴 운동",
    included: true,
    reason: "부위별 운동·기구·세트·횟수·무게",
  },
  {
    table: "exercise_completions",
    label: "운동 완료 기록",
    included: true,
    reason: "완료 시점 스냅샷 — 세트별 기록 포함",
  },
  {
    table: "workout_completions",
    label: "하루 운동 완료",
    included: true,
    reason: "날짜별 대표 부위·소모 칼로리",
  },
  {
    table: "workout_sessions",
    label: "운동 시간",
    included: true,
    reason: "날짜별 운동 지속 시간",
  },
  {
    table: "weight_logs",
    label: "체중 기록",
    included: true,
    reason: "체중·체지방률·근육량",
  },
  {
    table: "body_compositions",
    label: "체성분 측정",
    included: true,
    reason: "인바디 부위별 근육·지방 (사진은 경로만)",
  },
  {
    table: "food_logs",
    label: "식단 기록",
    included: true,
    reason: "끼니별 음식·칼로리·탄단지",
  },
  {
    table: "custom_foods",
    label: "내가 추가한 음식",
    included: true,
    reason: "카탈로그에 없어 직접 넣은 음식",
  },
  {
    table: "run_sessions",
    label: "러닝 세션",
    included: true,
    reason: "거리·페이스·경로 좌표",
  },
  {
    table: "daily_run_distance",
    label: "일별 러닝 거리",
    included: true,
    reason: "날짜별 합계",
  },
  {
    table: "daily_steps",
    label: "걸음 수",
    included: true,
    reason: "날짜별 걸음과 출처",
  },
  {
    table: "cycle_logs",
    label: "생리 주기 기록",
    included: true,
    reason: "본인만 볼 수 있는 민감 기록 — 내보내기에도 본인 것만",
  },
  {
    table: "commitments",
    label: "다짐",
    included: true,
    reason: "내가 건 약속과 달성 여부",
  },
  {
    table: "gyms",
    label: "내 헬스장",
    included: true,
    reason: "이름·주소·보유 기구",
  },
  {
    table: "push_subscriptions",
    label: "웹푸시 구독",
    included: false,
    reason: "기기 열쇠 — 파일이 새면 남이 내 폰으로 알림을 보낼 수 있다",
  },
  {
    table: "fcm_tokens",
    label: "앱 푸시 토큰",
    included: false,
    reason: "같은 이유로 뺀다",
  },
  {
    table: "password_otps",
    label: "비밀번호 인증번호",
    included: false,
    reason: "계정을 여는 값이라 어떤 경우에도 파일로 내보내지 않는다",
  },
  {
    table: "app_events",
    label: "오류 관측 기록",
    included: false,
    reason: "우리가 앱을 고치려고 남기는 진단값 — 사용자 데이터가 아니다",
  },
  {
    table: "community_comments",
    label: "남이 쓴 댓글·응원",
    included: false,
    reason: "내 글에 달렸어도 그 사람의 글이다",
  },
];

/** 백업 JSON 에 들어갈 테이블들 — 위 정책에서 직접 뽑는다. */
export const BACKUP_TABLES: string[] = EXPORT_SCOPE.filter(
  (s) => s.included,
).map((s) => s.table);

// ─────────────────────────────────────────────────────────────
// CSV 행 만들기
// ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  done: "완료",
  skipped: "건너뜀",
};

/**
 * 세트별 기록을 한 칸으로 — `60×10 / 50×10 / 40×12`.
 * 무게가 없으면(맨몸) 횟수만.
 */
export function formatSetDetails(details: SetDetail[] | null): string {
  if (!details || details.length === 0) return "";
  return details
    .map((s) =>
      s.weightKg === null || s.weightKg === undefined
        ? `${s.reps}회`
        : `${s.weightKg}×${s.reps}`,
    )
    .join(" / ");
}

export type WorkoutExportRecord = ProgressRecord & {
  /** 운동 이름(카탈로그에서 찾은 한글). 못 찾으면 id 를 그대로 쓴다. */
  exerciseName: string | null;
  focusLabel: string | null;
  equipmentLabel: string | null;
};

export const WORKOUT_HEADERS = [
  "날짜",
  "운동",
  "부위",
  "기구",
  "상태",
  "세트",
  "횟수",
  "무게(kg)",
  "세트별 기록",
  "볼륨(kg)",
];

export function workoutRow(r: WorkoutExportRecord): Cell[] {
  // 볼륨은 성장 그래프·주간 리포트와 **같은 함수**로 센다. 여기서 따로 곱하면
  // 화면과 내보낸 파일이 다른 숫자를 말하게 된다.
  const volume = r.status === "done" ? Math.round(recordVolume(r)) : 0;
  return [
    r.forDate,
    r.exerciseName ?? r.exerciseId,
    r.focusLabel,
    r.equipmentLabel,
    STATUS_LABEL[r.status] ?? r.status,
    r.sets,
    r.reps,
    r.weightKg,
    formatSetDetails(r.setDetails ?? null),
    volume,
  ];
}

export type BodyExportRecord = {
  /** 측정 날짜(YYYY-MM-DD). */
  date: string;
  source: "체성분 측정" | "체중 기록";
  weightKg: number | null;
  skeletalMuscleKg?: number | null;
  bodyFatKg?: number | null;
  bodyFatPct: number | null;
  muscleMassKg?: number | null;
  muscleRightArm?: number | null;
  muscleLeftArm?: number | null;
  muscleTrunk?: number | null;
  muscleRightLeg?: number | null;
  muscleLeftLeg?: number | null;
  fatRightArm?: number | null;
  fatLeftArm?: number | null;
  fatTrunk?: number | null;
  fatRightLeg?: number | null;
  fatLeftLeg?: number | null;
};

export const BODY_HEADERS = [
  "날짜",
  "출처",
  "체중(kg)",
  "골격근량(kg)",
  "체지방량(kg)",
  "체지방률(%)",
  "근육량(kg)",
  "오른팔 근육",
  "왼팔 근육",
  "몸통 근육",
  "오른다리 근육",
  "왼다리 근육",
  "오른팔 지방",
  "왼팔 지방",
  "몸통 지방",
  "오른다리 지방",
  "왼다리 지방",
];

export function bodyRow(r: BodyExportRecord): Cell[] {
  return [
    r.date,
    r.source,
    r.weightKg,
    r.skeletalMuscleKg ?? null,
    r.bodyFatKg ?? null,
    r.bodyFatPct,
    r.muscleMassKg ?? null,
    r.muscleRightArm ?? null,
    r.muscleLeftArm ?? null,
    r.muscleTrunk ?? null,
    r.muscleRightLeg ?? null,
    r.muscleLeftLeg ?? null,
    r.fatRightArm ?? null,
    r.fatLeftArm ?? null,
    r.fatTrunk ?? null,
    r.fatRightLeg ?? null,
    r.fatLeftLeg ?? null,
  ];
}

export const MEAL_LABEL: Record<string, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

export type DietExportRecord = {
  forDate: string;
  meal: string;
  eatenAt: string | null;
  name: string;
  amount: string | null;
  kcal: number | null;
  carbsG: number | null;
  proteinG: number | null;
  fatG: number | null;
  category: string | null;
};

export const DIET_HEADERS = [
  "날짜",
  "끼니",
  "시간",
  "음식",
  "분량",
  "칼로리(kcal)",
  "탄수화물(g)",
  "단백질(g)",
  "지방(g)",
  "분류",
];

export function dietRow(r: DietExportRecord): Cell[] {
  return [
    r.forDate,
    MEAL_LABEL[r.meal] ?? r.meal,
    // `08:30:00` 처럼 초까지 오는 값은 분까지만 — 사용자가 초를 적은 적이 없다.
    r.eatenAt ? r.eatenAt.slice(0, 5) : null,
    r.name,
    r.amount,
    r.kcal,
    r.carbsG,
    r.proteinG,
    r.fatG,
    r.category,
  ];
}

// ─────────────────────────────────────────────────────────────
// 전체 백업(JSON)
// ─────────────────────────────────────────────────────────────

/** 백업 형식이 바뀌면 올린다 — 되돌려 읽는 쪽이 판단할 근거가 있어야 한다. */
export const BACKUP_FORMAT = "helssu-backup";
export const BACKUP_VERSION = 1;

export type BackupMeta = {
  format: string;
  version: number;
  exportedAt: string;
  /** 이 파일이 누구 것인지. 내 계정으로 받은 파일이므로 본인 정보만 담긴다. */
  account: { email: string | null };
  /** 어떤 테이블이 왜 빠졌는지 파일 안에도 남긴다. */
  excluded: { table: string; reason: string }[];
};

export function backupMeta(
  email: string | null,
  exportedAt: string,
): BackupMeta {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    account: { email },
    excluded: EXPORT_SCOPE.filter((s) => !s.included).map((s) => ({
      table: s.table,
      reason: s.reason,
    })),
  };
}
