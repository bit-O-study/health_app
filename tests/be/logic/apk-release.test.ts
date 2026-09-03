import { describe, expect, it } from "vitest";

// 릴리스 이름·중복판정·이력은 순수 로직 — fs/git 없이 그대로 검증한다.
import {
  addBuild,
  apkFileName,
  commitFromLegacyName,
  findDuplicate,
  humanSize,
  makeEntry,
  parseArgs,
  parseGradleVersion,
  pickCommand,
  releaseDateDir,
  renderHistory,
  rollbackCandidates,
  seoulParts,
  shortSha,
  sortNewestFirst,
} from "../../../tools/release/apk-release.mjs";

/** 2026-08-31 16:12 KST (= 07:12Z). */
const AT = new Date("2026-08-31T07:12:00Z");

describe("seoulParts — 빌드 머신 TZ 와 무관하게 한국 시각", () => {
  it("UTC 07:12 는 KST 16:12", () => {
    expect(seoulParts(AT)).toEqual({
      year: "2026",
      month: "08",
      day: "31",
      hour: "16",
      minute: "12",
    });
  });

  it("KST 자정은 00 시로 나온다(24 시 표기 아님)", () => {
    // 2026-08-30T15:00Z = 2026-08-31 00:00 KST
    expect(seoulParts(new Date("2026-08-30T15:00:00Z"))).toMatchObject({
      day: "31",
      hour: "00",
    });
  });

  it("UTC 로는 전날이어도 한국 날짜 폴더로 들어간다", () => {
    // 2026-08-30T16:30Z = 2026-08-31 01:30 KST
    expect(releaseDateDir(new Date("2026-08-30T16:30:00Z"))).toBe("2026-08-31");
  });
});

describe("shortSha", () => {
  it("40자 해시를 7자로 줄인다", () => {
    expect(shortSha("d4717dfabcdef0123456789012345678901234ab")).toBe("d4717df");
  });

  it("git 정보가 없으면 nogit", () => {
    expect(shortSha("")).toBe("nogit");
    expect(shortSha(undefined)).toBe("nogit");
    expect(shortSha("not-a-hash")).toBe("nogit");
  });
});

describe("apkFileName — 버전·커밋·빌드시각을 항상 포함", () => {
  it("기본 형식", () => {
    expect(
      apkFileName({
        versionName: "1.0.3",
        versionCode: 4,
        commit: "d4717dfabc",
        builtAt: AT,
      }),
    ).toBe("helssu-v1.0.3-4-d4717df-20260831-1612.apk");
  });

  it("커밋되지 않은 변경이 있으면 dirty 표시", () => {
    const name = apkFileName({
      versionName: "1.0.3",
      versionCode: 4,
      commit: "d4717dfabc",
      builtAt: AT,
      dirty: true,
    });
    expect(name).toBe("helssu-v1.0.3-4-d4717df-20260831-1612-dirty.apk");
  });

  it("release 빌드는 타입이 이름에 들어간다(debug 는 생략)", () => {
    expect(
      apkFileName({
        versionName: "1.0.3",
        versionCode: 4,
        commit: "d4717dfabc",
        builtAt: AT,
        buildType: "release",
      }),
    ).toBe("helssu-release-v1.0.3-4-d4717df-20260831-1612.apk");
  });

  it("메모를 붙여도 형식이 깨지지 않는다(공백·슬래시 제거)", () => {
    const name = apkFileName({
      versionName: "1.0.3",
      versionCode: 4,
      commit: "d4717dfabc",
      builtAt: AT,
      note: "tab crash/fix",
    });
    expect(name).toBe("helssu-v1.0.3-4-d4717df-20260831-1612-tabcrashfix.apk");
    expect(name).not.toMatch(/[\s/]/);
  });

  it("버전을 못 읽어도 파일명은 만들어진다", () => {
    expect(
      apkFileName({ versionName: "", versionCode: "", commit: "", builtAt: AT }),
    ).toBe("helssu-v0.0.0-0-nogit-20260831-1612.apk");
  });
});

describe("parseGradleVersion", () => {
  it("build.gradle 에서 versionName/versionCode 를 읽는다", () => {
    const gradle = [
      "android {",
      "    defaultConfig {",
      '        applicationId "app.helssu.twa"',
      "        versionCode 4",
      '        versionName "1.0.3"',
      "    }",
      "}",
    ].join("\n");
    expect(parseGradleVersion(gradle)).toEqual({
      versionName: "1.0.3",
      versionCode: 4,
    });
  });

  it("주석 처리된 옛 버전은 무시한다", () => {
    const gradle = [
      "        // versionCode 99",
      '        // versionName "9.9.9"',
      "        versionCode 4",
      '        versionName "1.0.3"',
    ].join("\n");
    expect(parseGradleVersion(gradle)).toEqual({
      versionName: "1.0.3",
      versionCode: 4,
    });
  });

  it("못 찾으면 null", () => {
    expect(parseGradleVersion("android { }")).toBeNull();
  });
});

describe("findDuplicate / addBuild — 같은 내용 APK 를 또 만들지 않는다", () => {
  const base = makeEntry({
    file: "helssu-v1.0.3-4-aaaaaaa-20260830-1000.apk",
    dir: "releases/apk/2026-08-30",
    sha256: "ABC123",
    versionName: "1.0.3",
    versionCode: 4,
    commit: "aaaaaaaffff",
    builtAt: new Date("2026-08-30T01:00:00Z"),
    sizeBytes: 14 * 1024 * 1024,
  });

  it("sha256 은 대소문자 무관하게 같은 것으로 본다", () => {
    expect(findDuplicate("abc123", [base])?.file).toBe(base.file);
  });

  it("내용이 같으면 새 항목이 아니라 재현 기록만 붙는다", () => {
    const again = makeEntry({
      file: "helssu-v1.0.3-4-bbbbbbb-20260831-1612.apk",
      dir: "releases/apk/2026-08-31",
      sha256: "abc123",
      versionName: "1.0.3",
      versionCode: 4,
      commit: "bbbbbbbffff",
      builtAt: AT,
    });
    const { entries, duplicateOf } = addBuild([base], again);
    expect(entries).toHaveLength(1);
    expect(duplicateOf?.file).toBe(base.file);
    expect(entries[0].rebuiltAs).toEqual([`bbbbbbb@${AT.toISOString()}`]);
  });

  it("같은 재현을 두 번 넣어도 기록은 하나", () => {
    const again = makeEntry({
      file: "x.apk",
      dir: "d",
      sha256: "abc123",
      versionName: "1.0.3",
      versionCode: 4,
      commit: "bbbbbbb",
      builtAt: AT,
    });
    const once = addBuild([base], again).entries;
    const twice = addBuild(once, again).entries;
    expect(twice[0].rebuiltAs).toHaveLength(1);
  });

  it("내용이 다르면 새 항목으로 쌓인다", () => {
    const other = makeEntry({
      file: "helssu-v1.0.3-4-ccccccc-20260831-1612.apk",
      dir: "releases/apk/2026-08-31",
      sha256: "def456",
      versionName: "1.0.3",
      versionCode: 4,
      commit: "ccccccc",
      builtAt: AT,
    });
    const { entries, duplicateOf } = addBuild([base], other);
    expect(duplicateOf).toBeNull();
    expect(entries).toHaveLength(2);
  });

  it("입력 배열을 변형하지 않는다", () => {
    const list = [base];
    addBuild(list, { ...base, sha256: "abc123", file: "y.apk" });
    expect(list[0].rebuiltAs).toEqual([]);
  });
});

describe("rollbackCandidates — 검증된 빌드만, 최신순", () => {
  const mk = (file: string, iso: string, verified: boolean) => ({
    ...makeEntry({
      file,
      dir: "releases/apk/x",
      sha256: file,
      versionName: "1.0.3",
      versionCode: 4,
      commit: "aaaaaaa",
      builtAt: new Date(iso),
    }),
    verified,
  });

  const entries = [
    mk("old-verified.apk", "2026-08-01T00:00:00Z", true),
    mk("new-unverified.apk", "2026-08-31T00:00:00Z", false),
    mk("mid-verified.apk", "2026-08-20T00:00:00Z", true),
  ];

  it("검증 안 된 최신 빌드는 롤백 후보가 아니다", () => {
    expect(rollbackCandidates(entries).map((e) => e.file)).toEqual([
      "mid-verified.apk",
      "old-verified.apk",
    ]);
  });

  it("검증된 게 하나도 없으면 빈 목록", () => {
    expect(
      rollbackCandidates([mk("a.apk", "2026-08-31T00:00:00Z", false)]),
    ).toEqual([]);
  });

  it("sortNewestFirst 는 빌드 시각 내림차순", () => {
    expect(sortNewestFirst(entries).map((e) => e.file)[0]).toBe(
      "new-unverified.apk",
    );
  });
});

describe("renderHistory", () => {
  it("빈 이력도 표를 만든다", () => {
    expect(renderHistory([])).toContain("_(없음)_");
  });

  it("검증 여부와 한국 시각을 표에 적는다", () => {
    const e = {
      ...makeEntry({
        file: "helssu-v1.0.3-4-d4717df-20260831-1612.apk",
        dir: "releases/apk/2026-08-31",
        sha256: "abc",
        versionName: "1.0.3",
        versionCode: 4,
        commit: "d4717df",
        builtAt: AT,
        sizeBytes: 14 * 1024 * 1024,
      }),
      verified: true,
      logcat: "releases/apk/2026-08-31/logcat-d4717df.txt",
    };
    const md = renderHistory([e]);
    expect(md).toContain("2026-08-31 16:12");
    expect(md).toContain("1.0.3 (4)");
    expect(md).toContain("`d4717df`");
    expect(md).toContain("✅");
    expect(md).toContain("logcat-d4717df.txt");
    expect(md).toContain("14.0 MB");
  });
});

describe("humanSize", () => {
  it("단위를 바꿔 읽는다", () => {
    expect(humanSize(512)).toBe("512 B");
    expect(humanSize(2048)).toBe("2 KB");
    expect(humanSize(14 * 1024 * 1024)).toBe("14.0 MB");
    expect(humanSize(undefined)).toBe("0 B");
  });
});

describe("commitFromLegacyName — 옛 파일명에서 커밋 건지기", () => {
  it("app-debug-<날짜>-<해시>.apk 에서 해시를 뽑는다", () => {
    expect(commitFromLegacyName("app-debug-2026-08-11-5ea9aee.apk")).toBe(
      "5ea9aee",
    );
  });

  it("해시가 없는 옛 이름은 빈 문자열", () => {
    expect(commitFromLegacyName("helssu-debug.apk")).toBe("");
    expect(commitFromLegacyName("helssu-debug-v3-tab-crash-fix.apk")).toBe("");
  });

  it("새 규칙 이름에서도 커밋을 못 건진다(뒤가 시각이라) — backfill 대상이 아님", () => {
    expect(commitFromLegacyName("helssu-v1.0.3-4-d4717df-20260831-1612.apk")).toBe(
      "",
    );
  });
});

describe("parseArgs", () => {
  it("--key value 와 위치 인자를 나눈다", () => {
    expect(parseArgs(["verify", "a.apk", "--logcat", "log.txt"])).toEqual({
      opts: { logcat: "log.txt" },
      rest: ["verify", "a.apk"],
    });
  });

  it("값 없는 플래그는 true", () => {
    expect(parseArgs(["--fail"]).opts).toEqual({ fail: true });
  });

  it("플래그 뒤에 또 플래그가 오면 앞은 값 없는 플래그", () => {
    expect(parseArgs(["--fail", "--note", "x"]).opts).toEqual({
      fail: true,
      note: "x",
    });
  });

  it("인자가 없으면 빈 결과", () => {
    expect(parseArgs([])).toEqual({ opts: {}, rest: [] });
    expect(parseArgs(undefined)).toEqual({ opts: {}, rest: [] });
  });
});

describe("pickCommand — 명령 없이 부르면 archive", () => {
  it("명령이 있으면 떼어낸다", () => {
    expect(pickCommand(["verify", "a.apk"])).toEqual({
      cmd: "verify",
      rest: ["a.apk"],
    });
  });

  it("인자가 없으면 archive", () => {
    expect(pickCommand([])).toEqual({ cmd: "archive", rest: [] });
  });

  it("첫 인자가 .apk 면 명령이 아니라 파일 — archive 로 본다", () => {
    expect(pickCommand(["x.apk"])).toEqual({ cmd: "archive", rest: ["x.apk"] });
  });
});
