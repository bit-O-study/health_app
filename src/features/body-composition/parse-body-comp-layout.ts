/**
 * 폰 안 글자 인식(ML Kit) 결과 → 체성분 14개 수치. AI 없이 읽는 경로(2026-10-07).
 *
 * 예전 Tesseract 파서(parseBodyCompText)는 글자만 줄줄이 받아 "체중 다음 숫자"를 찾다가
 * 실제 용지에서 거의 0개를 뽑았다. ML Kit 는 **글자 위치**를 같이 주므로, 항목명과
 * **같은 줄 오른쪽**(기본 4개) · **같은 구역 안 가장 가까운 곳**(부위별 10개)의 숫자만 짝짓는다.
 *
 * 추측 금지 원칙은 AI 경로와 같다 — 애매하면 비우고 사용자가 채운다:
 * - 측정값은 인바디가 늘 소수로 찍는다 → **소수점 없는 숫자는 버린다**(그래프 눈금 55·70·85, 키·나이).
 * - 괄호·물결이 붙은 숫자는 표준범위라 버린다.
 * - 체중조절·적정체중·목표체중 행은 체중이 아니다.
 * - 같은 줄에 소수가 3개 이상이면 과거 기록(체성분변화) 줄로 보고 건너뛴다.
 */

import type { OcrField } from "@/features/body-composition/parse-body-comp";

/** ML Kit 글자 조각 하나(단어 단위). 좌표는 사진 픽셀, angle 은 그 줄의 기울기(도). */
export type OcrWord = {
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  angle?: number;
};

type Tok = { raw: string; norm: string; x: number; y: number; left: number; right: number; h: number };

const norm = (s: string) => s.toLowerCase().replace(/[\s()（）[\]·・:_\-.,/]/g, "");

/** 단어들이 알려 준 줄 기울기의 중앙값(도). */
function medianAngle(words: OcrWord[]): number {
  const angles = words.map((w) => w.angle ?? 0).filter((a) => Number.isFinite(a) && Math.abs(a) < 30).sort((a, b) => a - b);
  return angles.length ? angles[Math.floor(angles.length / 2)] : 0;
}

/** 사진이 조금 기울어도 같은 줄이 같은 높이에 오도록 deg 만큼 되돌린다. */
function deskew(words: OcrWord[], deg: number): Tok[] {
  const rad = (-deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return words
    .filter((w) => w.text.trim() !== "")
    .map((w) => {
      const cx = (w.left + w.right) / 2;
      const cy = (w.top + w.bottom) / 2;
      const x = cx * cos - cy * sin;
      const y = cx * sin + cy * cos;
      const width = Math.max(1, w.right - w.left);
      return { raw: w.text.trim(), norm: norm(w.text), x, y, left: x - width / 2, right: x + width / 2, h: Math.max(1, w.bottom - w.top) };
    });
}

/** 측정값 모양의 숫자인가 — 소수 한두 자리, 괄호·물결 없음. kg/% 가 붙어 있으면 그 단위도. */
function measured(t: Tok): { value: number; unit: "kg" | "%" | null } | null {
  const s = t.raw.replace(/\s/g, "");
  if (/[()（）~∼〜]/.test(s)) return null;
  const m = /^(\d{1,3})[.,](\d{1,2})(kg|%)?$/i.exec(s);
  if (!m) return null;
  const value = Number(`${m[1]}.${m[2]}`);
  return Number.isFinite(value) ? { value, unit: (m[3]?.toLowerCase() as "kg" | "%" | undefined) ?? null } : null;
}

/** 단어 i 부터 최대 4개를 이어 붙여 항목명과 맞는지 — 'Body Fat Mass' 처럼 쪼개진 이름도 잡는다. */
function labelAt(toks: Tok[], i: number, row: Tok[], labels: RegExp, reject?: RegExp): boolean {
  const start = row.indexOf(toks[i]);
  const words = row.slice(start, start + 4).map((t) => t.norm);
  // 'Weight' 뒤에 'Control' 이 오는지 먼저 본다 — 앞 단어만 보고 체중으로 잡으면 안 된다.
  if (reject?.test(words.join(""))) return false;
  let s = "";
  for (const w of words) {
    s += w;
    if (labels.test(s)) return true;
  }
  return false;
}

/** 같은 줄(세로 중심이 글자 높이 절반 안) 단어들, 왼→오. */
function rowOf(toks: Tok[], t: Tok): Tok[] {
  return toks.filter((o) => Math.abs(o.y - t.y) <= Math.max(t.h, o.h) * 0.55).sort((a, b) => a.x - b.x);
}

const BASIC: { field: OcrField; label: RegExp; reject?: RegExp; range: [number, number] }[] = [
  { field: "weightKg", label: /^(체중|weight|bodyweight)/, reject: /^(체중(조절|변화)|weightcontrol|적정|목표|표준)/, range: [20, 300] },
  { field: "skeletalMuscleKg", label: /^(골격근량|skeletalmusclemass|smm)/, range: [5, 80] },
  { field: "bodyFatKg", label: /^(체지방량|bodyfatmass)/, range: [0.5, 150] },
  { field: "bodyFatPct", label: /^(체지방[률율]|percentbodyfat|bodyfatpercent|pbf)/, range: [1, 75] },
];

function readBasic(toks: Tok[], spec: (typeof BASIC)[number]): number | undefined {
  const found: { value: number; y: number }[] = [];
  for (let i = 0; i < toks.length; i++) {
    const row = rowOf(toks, toks[i]);
    if (!labelAt(toks, i, row, spec.label, spec.reject)) continue;
    const label = toks[i];
    const right = row.filter((o) => o.x > label.x);
    const nums = right.map(measured).filter((n): n is NonNullable<typeof n> => n !== null);
    if (nums.length >= 3) continue; // 과거 기록 줄
    const unitOk = (u: "kg" | "%" | null) => u === null || u === (spec.field === "bodyFatPct" ? "%" : "kg");
    const hit = nums.find((n) => unitOk(n.unit) && n.value >= spec.range[0] && n.value <= spec.range[1]);
    if (hit) found.push({ value: hit.value, y: label.y });
  }
  if (found.length === 0) return undefined;
  // 같은 값이 여러 곳(체성분분석 표·골격근지방 막대)에 찍힌다 — 가장 많이 나온 값, 동률이면 위쪽.
  const counts = new Map<number, { n: number; y: number }>();
  for (const f of found) {
    const c = counts.get(f.value);
    counts.set(f.value, c ? { n: c.n + 1, y: Math.min(c.y, f.y) } : { n: 1, y: f.y });
  }
  return [...counts.entries()].sort((a, b) => b[1].n - a[1].n || a[1].y - b[1].y)[0][0];
}

const SECTIONS = {
  muscle: /^(부위별근육|segmentallean|segmentalmuscle)/,
  fat: /^(부위별체지방|segmentalfat)/,
} as const;
/** 구역 경계로만 쓰는 다른 제목들 — 이 아래 숫자는 부위별 값이 아니다. */
const OTHER_HEADERS = /^(체성분분석|bodycompositionanalysis|골격근지방분석|musclefatanalysis|비만분석|obesityanalysis|체성분변화|bodycompositionhistory|체중조절|weightcontrol|연구항목|researchparameters)/;

const SIDES: { suffix: "RightArm" | "LeftArm" | "Trunk" | "RightLeg" | "LeftLeg"; label: RegExp; muscle: [number, number]; fat: [number, number] }[] = [
  { suffix: "RightArm", label: /^(오른팔|오른쪽팔|우상지|우측상지|rightarm)/, muscle: [0.5, 12], fat: [0.1, 15] },
  { suffix: "LeftArm", label: /^(왼팔|왼쪽팔|좌상지|좌측상지|leftarm)/, muscle: [0.5, 12], fat: [0.1, 15] },
  { suffix: "Trunk", label: /^(몸통|체간|trunk)/, muscle: [8, 50], fat: [0.5, 50] },
  { suffix: "RightLeg", label: /^(오른다리|오른쪽다리|우하지|우측하지|rightleg)/, muscle: [3, 25], fat: [0.3, 25] },
  { suffix: "LeftLeg", label: /^(왼다리|왼쪽다리|좌하지|좌측하지|leftleg)/, muscle: [3, 25], fat: [0.3, 25] },
];

type Header = { kind: "muscle" | "fat" | "other"; t: Tok };

/** 이 단어가 어느 구역에 속하나 — 위쪽에 있으면서 가로로 같은 칸(쪽 폭의 35% 안)인 가장 가까운 제목. */
function sectionOf(t: Tok, headers: Header[], pageW: number): Header | undefined {
  let best: Header | undefined;
  for (const h of headers) {
    if (h.t.y >= t.y || Math.abs(h.t.x - t.x) > pageW * 0.35) continue;
    if (!best || h.t.y > best.t.y) best = h;
  }
  return best;
}

function readSegments(toks: Tok[], out: Partial<Record<OcrField, number>>) {
  const headers: Header[] = [];
  for (let i = 0; i < toks.length; i++) {
    const row = rowOf(toks, toks[i]);
    if (labelAt(toks, i, row, SECTIONS.muscle)) headers.push({ kind: "muscle", t: toks[i] });
    else if (labelAt(toks, i, row, SECTIONS.fat)) headers.push({ kind: "fat", t: toks[i] });
    else if (labelAt(toks, i, row, OTHER_HEADERS)) headers.push({ kind: "other", t: toks[i] });
  }
  if (!headers.some((h) => h.kind !== "other")) return;
  const pageW = Math.max(...toks.map((t) => t.right)) - Math.min(...toks.map((t) => t.left));

  for (const kind of ["muscle", "fat"] as const) {
    const inSection = (t: Tok) => sectionOf(t, headers, pageW)?.kind === kind;
    const values = toks
      .map((t, i) => ({ t, m: measured(t), unitAfter: toks[i + 1]?.norm === "kg" }))
      .filter((v) => v.m && v.m.unit !== "%" && inSection(v.t));
    const labels: { side: (typeof SIDES)[number]; t: Tok }[] = [];
    for (let i = 0; i < toks.length; i++) {
      if (!inSection(toks[i])) continue;
      const row = rowOf(toks, toks[i]);
      const side = SIDES.find((s) => labelAt(toks, i, row, s.label));
      if (side) labels.push({ side, t: toks[i] });
    }
    // 가까운 짝부터 하나씩 확정 — 한 숫자가 두 부위에 쓰이지 않게.
    const pairs: { li: number; vi: number; d: number }[] = [];
    labels.forEach((l, li) =>
      values.forEach((v, vi) => {
        const range = kind === "muscle" ? l.side.muscle : l.side.fat;
        if (v.m!.value < range[0] || v.m!.value > range[1]) return;
        const dx = v.t.x - l.t.x;
        const dy = v.t.y - l.t.y;
        if (dy < -l.t.h * 0.6) return; // 이름보다 위에 있는 숫자는 다른 부위 것
        const d = Math.hypot(dx, dy) / l.t.h;
        if (d > 8) return;
        // kg 가 붙은 숫자를 우선(옆 % 값과 헷갈리지 않게).
        pairs.push({ li, vi, d: d - (v.m!.unit === "kg" || v.unitAfter ? 0.5 : 0) });
      }),
    );
    pairs.sort((a, b) => a.d - b.d);
    const usedL = new Set<number>();
    const usedV = new Set<number>();
    for (const p of pairs) {
      if (usedL.has(p.li) || usedV.has(p.vi)) continue;
      const field = `${kind}${labels[p.li].side.suffix}` as OcrField;
      if (out[field] !== undefined) { usedL.add(p.li); continue; }
      usedL.add(p.li);
      usedV.add(p.vi);
      out[field] = values[p.vi].m!.value;
    }
  }
}

export function parseBodyCompLayout(words: OcrWord[]): Partial<Record<OcrField, number>> {
  // 기울기 부호 규칙(시계방향 +)을 기기에서 확인하지 못했다 — 양쪽과 0 을 다 해 보고 가장 많이 읽힌 쪽.
  const deg = medianAngle(words);
  const tries = [...new Set([deg, -deg, 0])].map((d) => parseAt(deskew(words, d)));
  return tries.reduce((best, r) => (Object.keys(r).length > Object.keys(best).length ? r : best), tries[0]);
}

function parseAt(toks: Tok[]): Partial<Record<OcrField, number>> {
  if (toks.length === 0) return {};
  const out: Partial<Record<OcrField, number>> = {};
  for (const spec of BASIC) {
    const v = readBasic(toks, spec);
    if (v !== undefined) out[spec.field] = v;
  }
  // 체지방량·골격근량이 체중보다 크면 셋 중 무엇이 틀렸는지 모른다 — 둘 다 비운다.
  if (out.weightKg !== undefined) {
    if (out.bodyFatKg !== undefined && out.bodyFatKg >= out.weightKg) delete out.bodyFatKg;
    if (out.skeletalMuscleKg !== undefined && out.skeletalMuscleKg >= out.weightKg) delete out.skeletalMuscleKg;
  }
  readSegments(toks, out);
  return out;
}
