import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 운동 가이드 MP4 모바일 압축 — 로드맵 1.2.
 *
 * 🔴 왜 — 원본이 **4K 20Mbps** 짜리다(스캐풀라 46MB, 스쿼트 35MB). 이걸 폰 WebView 의
 * 손바닥만 한 플레이어로 튼다. 4K 를 받아 720p 칸에 그리느라 데이터·디코딩·메모리를
 * 전부 낭비하고 있었고, 저사양 기기에서 렌더러가 죽는 경로이기도 하다.
 *
 * 원본 자리에 **그대로 덮어쓴다**(파일명 유지). 코드가 안 바뀌고, 파일은 git 이
 * 추적하므로 원본은 이력에 남는다 — 마음에 안 들면 되돌리면 된다.
 * `-mobile` 변형을 따로 두는 방법도 있지만, 그러면 코드에 폴백 분기가 생기고
 * "어느 걸 트는지" 를 화면마다 신경 써야 한다.
 *
 * 인코딩 값과 이유:
 *  - **긴 변 1280 로 축소**(세로 영상이면 세로가 1280). 폰 화면에서 이보다 크게
 *    보일 일이 없다. 짧은 변은 `-2` 로 짝수 맞춤(H.264 요구)
 *  - **CRF 26 / preset slow** — 4K → 720p 축소 자체가 화질 여유를 크게 만든다.
 *    아래에서 SSIM 으로 실제 손실을 재서 확인한다
 *  - **`-profile:v main` · `-pix_fmt yuv420p`** — 안드로이드 WebView 호환.
 *    (랫풀다운이 WebView 에서 재생 안 되던 일이 있었다 — 호환은 보수적으로)
 *  - **`-movflags +faststart`** — moov 를 앞으로. 없으면 **전부 받은 뒤에야** 재생이
 *    시작된다. 46MB 짜리에서 이건 "안 나오는 영상" 과 같다
 *  - **`-an`** — 이 영상들의 오디오는 완전한 무음(-91 dB)이라 빼도 잃는 게 없다
 *
 * 사용: node tools/media/compress-exercise-guides.mjs [--dry] [--crf 26]
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = resolve(ROOT, "public/exercise-guides");
const MAX_LONG_SIDE = 1280;

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const CRF = Number(args[args.indexOf("--crf") + 1]) || 26;

/** winget 으로 깔면 PATH 반영이 셸 재시작 뒤라, 설치 경로도 같이 찾는다. */
function findBin(name) {
  const candidates = [
    name,
    join(
      process.env.LOCALAPPDATA ?? "",
      "Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin",
      `${name}.exe`,
    ),
  ];
  for (const c of candidates) {
    try {
      execFileSync(c, ["-version"], { stdio: "ignore" });
      return c;
    } catch {
      /* 다음 후보 */
    }
  }
  return null;
}

const FFMPEG = findBin("ffmpeg");
const FFPROBE = findBin("ffprobe");
if (!FFMPEG || !FFPROBE) {
  console.error("ffmpeg/ffprobe 를 찾지 못했습니다. `winget install Gyan.FFmpeg`");
  process.exit(1);
}

const probe = (file, entries, stream = "v:0") =>
  execFileSync(FFPROBE, [
    "-v", "error",
    "-select_streams", stream,
    "-show_entries", entries,
    "-of", "csv=p=0",
    file,
  ])
    .toString()
    .trim();

const mib = (n) => (n / 1024 / 1024).toFixed(1);

function encode(src, out) {
  // 긴 변만 줄인다 — 가로/세로 어느 쪽이 긴지 모르므로 조건식으로 고른다.
  const scale =
    `scale='if(gte(iw,ih),min(${MAX_LONG_SIDE},iw),-2)':` +
    `'if(gte(iw,ih),-2,min(${MAX_LONG_SIDE},ih))'`;
  execFileSync(
    FFMPEG,
    [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", src,
      "-vf", scale,
      "-c:v", "libx264",
      "-crf", String(CRF),
      "-preset", "slow",
      "-profile:v", "main",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-an",
      out,
    ],
    { stdio: "inherit" },
  );
}

/**
 * 인코딩 손실만 따로 잰다 — 원본을 **결과와 같은 크기로 줄인 것**과 비교한다.
 * 원본(4K) 과 그대로 비교하면 '축소로 인한 차이' 까지 섞여서 인코딩이 나쁜 건지
 * 화면이 작아진 건지 구분이 안 된다.
 */
function ssim(src, out) {
  const w = probe(out, "stream=width");
  const h = probe(out, "stream=height");
  // ssim 필터의 요약은 **stderr** 로 나온다 — execFileSync 의 반환값(stdout)엔 없다.
  const res = spawnSync(
    FFMPEG,
    [
      "-hide_banner", "-loglevel", "info",
      "-i", out,
      "-i", src,
      "-lavfi", `[1:v]scale=${w}:${h}[ref];[0:v][ref]ssim`,
      "-f", "null", "-",
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return (res.stderr ?? "").match(/All:([0-9.]+)/)?.[1] ?? "?";
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".mp4"));
if (files.length === 0) {
  console.error("대상 mp4 가 없습니다.");
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), "guides-"));
let before = 0;
let after = 0;
const rows = [];

for (const name of files) {
  const src = join(DIR, name);
  const out = join(tmp, name);
  const srcSize = statSync(src).size;
  const dims = probe(src, "stream=width,height").replace(",", "×");
  const dur = Number(probe(src, "format=duration", "v:0") || 0);

  process.stderr.write(`▸ ${name} (${dims}, ${mib(srcSize)} MiB) 인코딩 중…\n`);
  encode(src, out);

  const outSize = statSync(out).size;
  const outDims = probe(out, "stream=width,height").replace(",", "×");
  const outDur = Number(probe(out, "format=duration", "v:0") || 0);

  // 길이가 달라졌으면 뭔가 잘못된 것이다 — 덮어쓰기 전에 멈춘다.
  if (Math.abs(outDur - dur) > 0.3) {
    console.error(`✗ ${name}: 길이가 달라졌다 (${dur}s → ${outDur}s). 중단합니다.`);
    process.exit(1);
  }

  const q = ssim(src, out);
  before += srcSize;
  after += outSize;
  rows.push({ name, dims, outDims, srcSize, outSize, ssim: q });

  if (!DRY) renameSync(out, src);
}

if (DRY) rmSync(tmp, { recursive: true, force: true });

console.log("\n| 파일 | 해상도 | 크기 | SSIM |");
console.log("|---|---|---:|---:|");
for (const r of rows) {
  console.log(
    `| \`${r.name}\` | ${r.dims} → ${r.outDims} | ${mib(r.srcSize)} → **${mib(r.outSize)}** MiB ` +
      `(−${(100 - (r.outSize / r.srcSize) * 100).toFixed(0)}%) | ${r.ssim} |`,
  );
}
console.log(
  `| **합계** | | **${mib(before)} → ${mib(after)} MiB ` +
    `(−${(100 - (after / before) * 100).toFixed(0)}%)** | |`,
);
if (DRY) console.log("\n(--dry: 원본은 그대로 두었습니다)");
