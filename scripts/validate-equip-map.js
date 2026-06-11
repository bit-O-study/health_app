/* 수동 가드: EXERCISE_PHOTO_DB_BY_EQUIP 의 모든 슬러그가 free-exercise-db 에 2프레임으로
 * 존재하는지 검증한다. 데이터셋은 jsdelivr 에서 직접 받는다(오프라인이면 실패).
 *   node scripts/validate-equip-map.js
 * 매핑을 바꾸면 이걸 돌려서 깨진 슬러그가 없는지 확인할 것. */
const fs = require("node:fs");

const SRC = "src/features/workout-timer/exercise-photo-map.ts";
const DATASET =
  "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json";

// TS 소스에서 BY_EQUIP 블록의 슬러그(따옴표 안 PascalCase_With_Underscores)를 추출.
function slugsFromSource() {
  const txt = fs.readFileSync(SRC, "utf8");
  const start = txt.indexOf("EXERCISE_PHOTO_DB_BY_EQUIP");
  const body = txt.slice(start, txt.indexOf("const CDN", start));
  const slugs = new Set();
  for (const m of body.matchAll(/(barbell|dumbbell|machine|cable|bodyweight):\s*"([^"]+)"/g)) {
    slugs.add(m[2]);
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
