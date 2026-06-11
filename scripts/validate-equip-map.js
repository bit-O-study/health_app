/* 수동 가드: EXERCISE_PHOTO_DB_BY_EQUIP 의 모든 슬러그가 free-exercise-db 에 2프레임으로
 * 존재하는지 검증한다. 데이터셋은 jsdelivr 에서 직접 받는다(오프라인이면 실패).
 *   node scripts/validate-equip-map.js
 * 매핑을 바꾸면 이걸 돌려서 깨진 슬러그가 없는지 확인할 것. */
const fs = require("node:fs");

const SRC = "src/features/workout-timer/exercise-photo-map.ts";
const DATASET =
  "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json";

// TS 소스의 세 매핑(EXERCISE_PHOTO_DB / _BY_EQUIP / CONDITIONING_PHOTO_DB)에서
// free-exercise-db 슬러그를 추출. 슬러그는 대문자로 시작(우리 운동 id 는 소문자 kebab).
function slugsFromSource() {
  const txt = fs.readFileSync(SRC, "utf8");
  const start = txt.indexOf("export const EXERCISE_PHOTO_DB");
  const body = txt.slice(start, txt.indexOf("const CDN", start));
  const slugs = new Set();
  for (const m of body.matchAll(/"([A-Z][^"]*)"/g)) {
    slugs.add(m[1]);
  }
  return [...slugs];
}

(async () => {
  const res = await fetch(DATASET);
  const fed = await res.json();
  const frames = new Map(fed.map((e) => [e.id, (e.images || []).length]));
  let bad = 0;
  for (const slug of slugsFromSource()) {
    const n = frames.get(slug);
    if (!n || n < 2) {
      bad++;
      console.log(`MISSING ${slug} (frames=${n ?? "NONE"})`);
    }
  }
  console.log(bad === 0 ? "ALL OK" : `${bad} bad slugs`);
  process.exitCode = bad === 0 ? 0 : 1;
})().catch((e) => {
  console.error("ERR", e.message);
  process.exitCode = 1;
});
