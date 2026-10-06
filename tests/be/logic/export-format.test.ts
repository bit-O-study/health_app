import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  BACKUP_TABLES,
  BACKUP_VERSION,
  BODY_HEADERS,
  CSV_BOM,
  DIET_HEADERS,
  EXPORT_KINDS,
  EXPORT_SCOPE,
  WORKOUT_HEADERS,
  backupMeta,
  bodyRow,
  contentDisposition,
  csvCell,
  csvLine,
  dietRow,
  exportFilename,
  formatSetDetails,
  isExportKind,
  toCsv,
  workoutRow,
  type WorkoutExportRecord,
} from "@/features/export/export-format";

/**
 * 로드맵 5.1 — 내보내기 포맷.
 *
 * 여기서 지키는 건 결국 하나다: **받아 본 파일이 사용자가 기록한 그대로여야 한다.**
 * 한글이 깨지거나, 쉼표 때문에 열이 밀리거나, 화면과 볼륨이 다르면 내보내기는 실패다.
 */

describe("csvCell — RFC4180", () => {
  it("평범한 값은 그대로", () => {
    expect(csvCell("벤치프레스")).toBe("벤치프레스");
    expect(csvCell(60)).toBe("60");
  });

  it("빈 값은 빈 칸 — 0 이 아니다", () => {
    // 기록을 안 남긴 것과 0kg 은 다른 사실이다. 0 으로 채우면 없는 기록이 생긴다.
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(Number.NaN)).toBe("");
  });

  it("쉼표가 들어간 값은 감싼다 — 안 감싸면 열이 밀린다", () => {
    expect(csvCell("닭가슴살, 현미밥")).toBe('"닭가슴살, 현미밥"');
  });

  it("따옴표는 두 번 써서 이스케이프", () => {
    expect(csvCell('그는 "가볍다" 고 했다')).toBe(
      '"그는 ""가볍다"" 고 했다"',
    );
  });

  it("줄바꿈이 든 메모도 한 칸 안에 유지", () => {
    expect(csvCell("첫 줄\n둘째 줄")).toBe('"첫 줄\n둘째 줄"');
  });

  it("앞뒤 공백은 감싸서 보존", () => {
    expect(csvCell("  여백")).toBe('"  여백"');
  });
});

describe("csvCell — 엑셀 수식 인젝션 방지", () => {
  it("=·+·@ 로 시작하면 글자로 못박는다", () => {
    // 내보낸 파일을 엑셀에서 열면 =HYPERLINK(...) 가 실행된다. 사용자가 음식 이름에
    // 무엇을 적었든 그건 글자여야 한다.
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("+82-10-0000")).toBe("'+82-10-0000");
  });

  it("숫자로 읽히는 값은 건드리지 않는다", () => {
    // -3 을 '-3 으로 바꾸면 표에서 계산이 안 된다. 수식이 아니라 값이다.
    expect(csvCell("-3")).toBe("-3");
    expect(csvCell("-2.5")).toBe("-2.5");
    expect(csvCell(-3)).toBe("-3");
  });

  it("- 로 시작하는 글자는 막는다", () => {
    expect(csvCell("-감량 목표")).toBe("'-감량 목표");
  });
});

describe("CSV 본문", () => {
  it("줄바꿈은 CRLF", () => {
    expect(csvLine(["a", "b"])).toBe("a,b\r\n");
  });

  it("BOM 으로 시작한다 — 없으면 엑셀에서 한글이 깨진다", () => {
    const csv = toCsv(["날짜", "운동"], [["2026-09-01", "스쿼트"]]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv.codePointAt(0)).toBe(0xfeff);
    expect(csv).toContain("2026-09-01,스쿼트");
  });

  it("BOM 은 딱 한 번만", () => {
    const csv = toCsv(["날짜"], [["2026-09-01"], ["2026-09-02"]]);
    expect(csv.split(CSV_BOM).length - 1).toBe(1);
  });

  it("UTF-8 로 인코딩해도 한글이 왕복한다", () => {
    const csv = toCsv(["음식"], [["닭가슴살"]]);
    const bytes = new TextEncoder().encode(csv);
    // BOM 세 바이트(EF BB BF)로 시작해야 엑셀이 UTF-8 로 읽는다.
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
    // 기본 디코더는 BOM 을 표식으로 보고 **먹어 버린다**(ignoreBOM=false).
    // 그래서 왕복 비교는 BOM 을 남기는 디코더로 해야 한다.
    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes)).toBe(
      csv,
    );
    expect(new TextDecoder("utf-8").decode(bytes)).toBe(csv.slice(1));
  });
});

describe("파일 이름", () => {
  it("한글 이름과 ASCII 이름을 함께 준다", () => {
    const { ascii, display } = exportFilename("workouts", "2026-09-01");
    expect(ascii).toBe("helssu-workouts-2026-09-01.csv");
    expect(display).toBe("헬쑤-운동기록-2026-09-01.csv");
  });

  it("Content-Disposition 은 filename* 로 한글을 싣는다", () => {
    const value = contentDisposition("diet", "2026-09-01");
    expect(value.startsWith("attachment; ")).toBe(true);
    // ASCII 이름은 헤더에 그대로 — 한글을 filename= 에 넣으면 브라우저마다 깨진다.
    expect(value).toContain('filename="helssu-diet-2026-09-01.csv"');
    const encoded = value.split("filename*=UTF-8''")[1];
    expect(decodeURIComponent(encoded)).toBe("헬쑤-식단기록-2026-09-01.csv");
    // 헤더 값에 raw 한글이 새어 나가면 안 된다(퍼센트 인코딩만).
    expect(/[^\x20-\x7e]/.test(value)).toBe(false);
  });

  it("백업은 json 확장자", () => {
    expect(exportFilename("backup", "2026-09-01").ascii).toBe(
      "helssu-backup-2026-09-01.json",
    );
  });

  it("모르는 종류는 거절한다", () => {
    expect(isExportKind("workouts")).toBe(true);
    expect(isExportKind("../../etc/passwd")).toBe(false);
    expect(isExportKind("")).toBe(false);
    expect(isExportKind(null)).toBe(false);
  });
});

describe("운동 기록 행", () => {
  const base: WorkoutExportRecord = {
    forDate: "2026-09-01",
    exerciseId: "squat",
    exerciseName: "스쿼트",
    focusLabel: "하체",
    equipmentLabel: "바벨",
    status: "done",
    sets: 3,
    reps: 10,
    weightKg: 60,
    setDetails: null,
  };

  it("머리글과 칸 수가 맞는다", () => {
    expect(workoutRow(base)).toHaveLength(WORKOUT_HEADERS.length);
  });

  it("균일 세트 볼륨 = 세트 × 횟수 × 무게", () => {
    expect(workoutRow(base).at(-1)).toBe(1800);
  });

  it("드롭세트는 세트별로 센다 — 균일 세트로 세면 과다 집계", () => {
    // 60×10 + 50×10 + 40×12 = 1,580. 균일 세트로 세면 1,800(14% 과다).
    const row = workoutRow({
      ...base,
      setDetails: [
        { weightKg: 60, reps: 10 },
        { weightKg: 50, reps: 10 },
        { weightKg: 40, reps: 12 },
      ],
    });
    expect(row.at(-1)).toBe(1580);
    expect(row[8]).toBe("60×10 / 50×10 / 40×12");
  });

  it("건너뛴 운동은 볼륨 0 — 안 한 운동이 기록에 쌓이면 안 된다", () => {
    expect(workoutRow({ ...base, status: "skipped" }).at(-1)).toBe(0);
    expect(workoutRow({ ...base, status: "skipped" })[4]).toBe("건너뜀");
  });

  it("이름을 못 찾으면 id 라도 남긴다", () => {
    expect(workoutRow({ ...base, exerciseName: null })[1]).toBe("squat");
  });

  it("맨몸 운동은 무게 없이 횟수만 적는다", () => {
    expect(
      formatSetDetails([
        { weightKg: null, reps: 12 },
        { weightKg: null, reps: 10 },
      ]),
    ).toBe("12회 / 10회");
  });

  it("세트별 기록이 없으면 빈 칸", () => {
    expect(formatSetDetails(null)).toBe("");
    expect(formatSetDetails([])).toBe("");
  });
});

describe("체중·체성분 행", () => {
  it("머리글과 칸 수가 맞는다 (체성분)", () => {
    const row = bodyRow({
      date: "2026-09-01",
      source: "체성분 측정",
      weightKg: 72.4,
      skeletalMuscleKg: 33.1,
      bodyFatKg: 14.2,
      bodyFatPct: 19.6,
      muscleRightArm: 3.4,
    });
    expect(row).toHaveLength(BODY_HEADERS.length);
    expect(row[1]).toBe("체성분 측정");
    expect(row[2]).toBe(72.4);
  });

  it("체중 기록은 없는 칸을 비워 둔다 — 0 으로 채우지 않는다", () => {
    const row = bodyRow({
      date: "2026-09-01",
      source: "체중 기록",
      weightKg: 72.4,
      bodyFatPct: null,
    });
    expect(row).toHaveLength(BODY_HEADERS.length);
    expect(row.slice(3)).toEqual(new Array(BODY_HEADERS.length - 3).fill(null));
  });
});

describe("식단 행", () => {
  it("끼니를 한국어로, 시간은 분까지", () => {
    const row = dietRow({
      forDate: "2026-09-01",
      meal: "breakfast",
      eatenAt: "08:30:00",
      name: "닭가슴살, 현미밥",
      amount: "1인분",
      kcal: 420,
      carbsG: 50,
      proteinG: 35,
      fatG: 8,
      category: "한식",
    });
    expect(row).toHaveLength(DIET_HEADERS.length);
    expect(row[1]).toBe("아침");
    expect(row[2]).toBe("08:30");
    // 이름에 쉼표가 있어도 한 칸으로 유지되는지는 직렬화까지 봐야 한다.
    expect(csvLine(row)).toContain('"닭가슴살, 현미밥"');
  });

  it("모르는 끼니 코드는 그대로 남긴다", () => {
    const row = dietRow({
      forDate: "2026-09-01",
      meal: "brunch",
      eatenAt: null,
      name: "샐러드",
      amount: null,
      kcal: null,
      carbsG: null,
      proteinG: null,
      fatG: null,
      category: null,
    });
    expect(row[1]).toBe("brunch");
    expect(row[2]).toBe(null);
  });
});

describe("내보내기 범위 — 개인정보 정책", () => {
  it("열쇠에 해당하는 것은 절대 나가지 않는다", () => {
    const excluded = EXPORT_SCOPE.filter((s) => !s.included).map(
      (s) => s.table,
    );
    for (const table of [
      "push_subscriptions",
      "fcm_tokens",
      "password_otps",
    ]) {
      expect(excluded).toContain(table);
      expect(BACKUP_TABLES).not.toContain(table);
    }
  });

  it("남이 쓴 글은 내 데이터가 아니다", () => {
    expect(BACKUP_TABLES).not.toContain("community_comments");
  });

  it("모든 항목에 이유가 적혀 있다 — 화면에 그대로 보여 준다", () => {
    for (const entry of EXPORT_SCOPE) {
      expect(entry.reason.length).toBeGreaterThan(0);
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it("테이블 이름이 중복되지 않는다", () => {
    const names = EXPORT_SCOPE.map((s) => s.table);
    expect(new Set(names).size).toBe(names.length);
  });

  it("운동·식단·체중 원본이 백업에 들어 있다", () => {
    for (const table of [
      "exercise_completions",
      "food_logs",
      "weight_logs",
      "body_compositions",
    ]) {
      expect(BACKUP_TABLES).toContain(table);
    }
  });
});

describe("백업 메타", () => {
  it("형식·버전·시각과 계정을 남긴다", () => {
    const meta = backupMeta("me@example.com", "2026-09-01T00:00:00.000Z");
    expect(meta.format).toBe("helssu-backup");
    expect(meta.version).toBe(BACKUP_VERSION);
    expect(meta.exportedAt).toBe("2026-09-01T00:00:00.000Z");
    expect(meta.account.email).toBe("me@example.com");
  });

  it("무엇이 빠졌는지 파일 안에도 적는다", () => {
    const meta = backupMeta(null, "2026-09-01T00:00:00.000Z");
    const tables = meta.excluded.map((e) => e.table);
    expect(tables).toContain("fcm_tokens");
    expect(meta.excluded.every((e) => e.reason.length > 0)).toBe(true);
  });

  it("JSON 으로 직렬화된다", () => {
    const json = JSON.stringify(backupMeta(null, "2026-09-01T00:00:00.000Z"));
    expect(JSON.parse(json).format).toBe("helssu-backup");
  });
});

describe("종류 메타", () => {
  it("CSV 셋과 JSON 하나", () => {
    expect(EXPORT_KINDS.workouts.ext).toBe("csv");
    expect(EXPORT_KINDS.body.ext).toBe("csv");
    expect(EXPORT_KINDS.diet.ext).toBe("csv");
    expect(EXPORT_KINDS.backup.ext).toBe("json");
  });

  it("content-type 에 charset=utf-8 이 들어 있다", () => {
    for (const meta of Object.values(EXPORT_KINDS)) {
      expect(meta.contentType).toContain("charset=utf-8");
    }
  });

  it("ASCII 이름에는 한글이 없다", () => {
    for (const meta of Object.values(EXPORT_KINDS)) {
      expect(/^[a-z0-9-]+$/.test(meta.asciiBase)).toBe(true);
    }
  });
});

describe("정책 표와 조회 설정이 어긋나지 않는다", () => {
  /**
   * `export-data.ts` 는 `server-only` 라 단위 테스트에서 import 할 수 없다.
   * 대신 소스에서 조회 설정 키를 뽑아 정책 표와 맞춘다 —
   * **"내보낸다고 화면에 써 놓고 실제로는 안 내보내는"** 상태를 막는 게 목적이다.
   */
  const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../../../src");
  const dataSource = readFileSync(
    resolve(SRC, "features/export/export-data.ts"),
    "utf8",
  );
  const configured = [
    ...dataSource.matchAll(/^ {2}([a-z_]+): \{$/gm),
  ].map((m) => m[1]);

  it("포함하기로 한 테이블은 전부 조회 설정이 있다", () => {
    expect(configured.length).toBeGreaterThan(0);
    for (const table of BACKUP_TABLES) {
      expect(configured).toContain(table);
    }
  });

  it("빼기로 한 테이블은 조회 설정에도 없다", () => {
    const excluded = EXPORT_SCOPE.filter((s) => !s.included).map((s) => s.table);
    for (const table of excluded) {
      expect(configured).not.toContain(table);
    }
  });

  it("조회에 select(*) 를 쓰지 않는다 — 나중에 추가된 컬럼이 말없이 새어 나간다", () => {
    expect(dataSource).not.toContain('.select("*")');
  });

  it("모든 조회에 소유자 조건이 붙는다", () => {
    // `.eq(config.ownerColumn, userId)` 한 곳을 거쳐야만 DB 를 읽는다.
    const selects = (dataSource.match(/\.select\(/g) ?? []).length;
    const owned = (dataSource.match(/\.eq\(config\.ownerColumn, userId\)/g) ?? [])
      .length;
    expect(selects).toBe(owned);
  });
});
